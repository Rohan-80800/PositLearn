import prisma from "../DB/db.config.js";
import sharp from "sharp";
import {
  uploadToStorage,
  deleteFromStorage,
  getFileUrl,
} from "./s3_controller.js";
import { sendNotificationToUsers, sendNotificationToTeamUsers, entityUpdate } from "../utils/notification.js";
import axios from "axios";
import FormData from "form-data";
const isProd = process.env.ENV === "prod";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const generate_badges = async (req, res) => {
  const { projectName, badgeName, description } = req.body;
  if (!projectName || !badgeName) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const styles = [
    "with a modern minimalist look",
    "in a futuristic digital style",
    "with vintage retro aesthetics",
    "using bold comic-style lettering",
    "with neon gradients and smooth shadows",
    "in a 3D embossed badge format",
  ];
  const randomStyle = styles[Math.floor(Math.random() * styles.length)];

  const fallbackDescription =
    "Make it visually appealing and relevant for general tech or creative projects.";

  const prompt = `
  A professional round badge with a clean 3D embossed style.
  The badge should contain no text.
  The design should visually represent the theme: "${badgeName}".
  Incorporate symbolic or abstract elements that align with the project: "${projectName}".
  Keep the layout circular and polished, suitable for ${randomStyle}.
  Additional design context: ${
    description && description.trim() !== "" ? description : fallbackDescription
  }.
`;

  const form = new FormData();
  form.append("prompt", prompt);

  try {
    const response = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      form,
      {
        headers: {
          ...form.getHeaders(),
          "x-api-key": process.env.CLIPDROP_API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = Buffer.from(response.data, "binary").toString("base64");
    const imageUrl = `data:image/png;base64,${base64Image}`;

    res.json({
      imageUrl,
      creditsRemaining: response.headers["x-remaining-credits"],
      creditsUsed: response.headers["x-credits-consumed"],
    });
  } catch (error) {
    if (error.response?.data) {
      const errorMessage = Buffer.from(error.response.data).toString("utf8");
      console.error("Clipdrop API Error (decoded):", errorMessage);
    } else {
      console.error("Clipdrop API Error:", error.message);
    }
    res.status(500).json({ error: "Failed to generate badge image." });
  }
};

const getLatestBadge = async (achievedBadges, userBadges) => {
  if (achievedBadges.length === 0) return null;

  achievedBadges.sort((a, b) => {
    const dateA = new Date(
      userBadges.find((ub) => ub.id === a.id)?.achieved_date || 0
    );
    const dateB = new Date(
      userBadges.find((ub) => ub.id === b.id)?.achieved_date || 0
    );

    if (dateA.getTime() === dateB.getTime()) {
      if (a.is_special && !b.is_special) return -1;
      if (!a.is_special && b.is_special) return 1;
      return (b.progress_percentage || 0) - (a.progress_percentage || 0);
    }
    return dateB - dateA;
  });

  const badge = achievedBadges[0];
  const userBadge = userBadges.find((b) => b.id === badge.id);

  const imageUrl = await getFileUrl(badge.image);

  return {
    id: badge.id,
    title: badge.name,
    date: formatDate(userBadge?.achieved_date),
    description: badge.description || "Achievement unlocked!",
    image: imageUrl,
    is_special: badge.is_special,
    notified: userBadge?.notified || false,
    project: badge.project?.project_name || "",
    project_id: badge.project?.id || null,
    progress_percentage:badge.progress_percentage,
  };
};

const getNextMilestone = async (upcomingBadges, projectProgress) => {
  const next = upcomingBadges.find((badge) => {
    const required = badge.is_special ? 100 : badge.progress_percentage || 100;
    return projectProgress < required;
  });

  if (!next) return null;

  const requiredProgress = next.is_special
    ? 100
    : next.progress_percentage || 100;
  const badgeSpecificProgress = Number(
    ((projectProgress / requiredProgress) * 100).toFixed(2)
  );

  const imageUrl = await getFileUrl(next.image);

  return {
    id: next.id,
    title: next.name,
    image: imageUrl,
    description: next.description || "Upcoming milestone!",
    badge_specific_progress: badgeSpecificProgress,
    is_special: next.is_special,
    project: next.project?.project_name || "",
    project_id: next.project?.id || null,
  };
};

export const create_badge = async (req, res) => {
  try {
    const { name, project_id, description, is_special, progress_percentage } =
      req.body;
    const parsedProjectId = parseInt(project_id);

    const trimmed_name = name.trim();
    const existingBadgeWithName = await prisma.badges.findFirst({
      where: {
        name: {
          equals: trimmed_name,
          mode: "insensitive",
        },
      },
    });
    if (existingBadgeWithName) {
      return res.status(400).json({
        message: "A badge with this name already exists.",
      });
    }
    const isSpecial = is_special === "true" || is_special === true;
    let finalProgressPercentage = null;

    if (isSpecial) {
      finalProgressPercentage = 100;
      const existingSpecialBadge = await prisma.badges.findFirst({
        where: {
          project_id: parsedProjectId,
          is_special: true,
        },
      });
      if (existingSpecialBadge) {
        return res.status(400).json({
          message: "A special badge already exists for this project.",
        });
      }
    } else if (progress_percentage) {
      const parsedProgressPercentage = parseInt(progress_percentage);

      const existingPercentageBadge = await prisma.badges.findFirst({
        where: {
          project_id: parsedProjectId,
          progress_percentage: parsedProgressPercentage,
          is_special: false,
        },
      });
      if (existingPercentageBadge) {
        return res.status(400).json({
          message: `A badge with ${parsedProgressPercentage}% progress already exists for this project.`,
        });
      }
      finalProgressPercentage = parsedProgressPercentage;
    }

    let imageUrl = null;

    if (req.file) {
      const processedImage = await sharp(req.file.buffer)
        .webp({ quality: 50 })
        .toBuffer();

      imageUrl = await uploadToStorage(
        processedImage,
        req.file.originalname,
        "badges"
      );
    }

    const badgeData = {
      project_id: parsedProjectId,
      name: name.trim(),
      description,
      progress_percentage: finalProgressPercentage,
      image: imageUrl,
      is_special: isSpecial,
    };

    const badge = await prisma.badges.create({
      data: badgeData,
    });

    const project = await prisma.projects.findUnique({
      where: { id: parsedProjectId },
      include: { teams: { include: { users: true } } },
    });

    const teamIds = project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "New Badge Created",
        `A new badge <b>${name}</b> has been created for the project <b>${project.project_name} </b>.`,
        { type: "assign", badgeId: badge.id, projectId: parsedProjectId }
      );
    }
    await entityUpdate("badges");
    return res.status(200).json({
      message: "Badge created successfully",
    });
  } catch (error) {
    console.error("Error creating badge:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const get_badges = async (req, res) => {
  try {
    const { clerk_id } = req.params;

    const user = await prisma.users.findUnique({
      where: { clerk_id },
      select: {
        progress_percentage: true,
        badges: true,
        teams: {
          select: {
            id: true,
            projects: {
              select: {
                id: true,
                project_name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const teamIds = user.teams.map((team) => team.id);
    const projects = Array.from(
      new Map(
        user.teams
          .flatMap((team) =>
            team.projects.map((project) => ({
              project_id: project.id,
              project_name: project.project_name,
            }))
          )
          .map((project) => [project.project_id, project])
      ).values()
    );

    const userProgress = user.progress_percentage || {};
    let userBadges = Array.isArray(user.badges) ? user.badges : [];

    const allBadges = await prisma.badges.findMany({
      where: {
        project: {
          teams: {
            some: {
              id: { in: teamIds },
            },
          },
        },
      },
      include: {
        project: {
          select: { id: true, project_name: true },
        },
      },
    });

    const newBadges = [];
    for (const badge of allBadges) {
      const projectId = badge.project.id.toString();
      const projectProgress = userProgress[projectId] || 0;
      const requiredProgress = badge.is_special
        ? 100
        : badge.progress_percentage || 100;

      if (
        !userBadges.some((b) => b.id === badge.id) &&
        projectProgress >= requiredProgress
      ) {
        newBadges.push({
          id: badge.id,
          notified: false,
          achieved_date: new Date().toISOString(),
        });
      }
    }

    if (newBadges.length > 0) {
      userBadges = [...userBadges, ...newBadges];
      await prisma.users.update({
        where: { clerk_id },
        data: {
          badges: userBadges,
        },
      });
    }
    for (const newBadge of newBadges) {
        const badge = allBadges.find((b) => b.id === newBadge.id);
        if (badge && !newBadge.notified) {
          await sendNotificationToUsers(
            [clerk_id],
            "New Badge Achieved!",
            `Congratulations! You earned the <b>${badge.name}</b> badge for the project <b>${badge.project.project_name}</b>.`,
            { badgeId: badge.id, projectId: badge.project.id }
          );
          userBadges = userBadges.map((b) => (b.id === newBadge.id ? { ...b, notified: true } : b));
          await prisma.users.update({
            where: { clerk_id },
            data: { badges: userBadges },
          });
        }
      }

    const badgeIds = userBadges.map((b) => b.id);
    const achievedBadges = await prisma.badges.findMany({
      where: { id: { in: badgeIds } },
      include: { project: { select: { id: true, project_name: true } } },
    });

    const achievements = await Promise.all(
      achievedBadges.map(async (badge) => {
        const achievedDate = userBadges.find(
          (b) => b.id === badge.id
        )?.achieved_date;
        const imageUrl = await getFileUrl(badge.image);

        return {
          id: badge.id,
          title: badge.name,
          date: achievedDate ? formatDate(achievedDate) : null,
          image: imageUrl,
          description: badge.description || "Achievement unlocked!",
          project: badge.project.project_name,
          is_special: badge.is_special,
          project_id: badge.project.id,
          progress_required: badge.progress_percentage,
        };
      })
    );

    const upcomingBadges = allBadges.filter(
      (badge) => !userBadges.some((b) => b.id === badge.id)
    );

    const upcomingMilestones = await Promise.all(
      upcomingBadges.map(async (badge) => {
        const projectId = badge.project.id.toString();
        const projectProgress = userProgress[projectId] || 0;
        const requiredProgress = badge.is_special
          ? 100
          : badge.progress_percentage || 100;
        const badgeSpecificProgress = Number(
          Math.min((projectProgress / requiredProgress) * 100, 100).toFixed(2)
        );

        const imageUrl = await getFileUrl(badge.image);

        return {
          id: badge.id,
          title: badge.name,
          image: imageUrl,
          description: badge.description || "Milestone yet to be achieved!",
          project: badge.project.project_name,
          badge_specific_progress: badgeSpecificProgress,
          is_special: badge.is_special,
          project_id: badge.project.id,
          progress_required: badge.progress_percentage,
        };
      })
    );

    return res.status(200).json({
      message: "Badges fetched successfully",
      data: {
        achievements,
        upcomingMilestones,
        projects,
      },
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const get_all_badges = async (req, res) => {
  try {
    const badges = await prisma.badges.findMany({
      include: {
        project: {
          select: {
            id: true,
            project_name: true,
          },
        },
      },
      orderBy: [
        { project_id: "asc" },
        { is_special: "desc" },
        { progress_percentage: "asc" },
      ],
    });

    const projects = await prisma.projects.findMany({
      select: {
        id: true,
        project_name: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    const formattedBadges = await Promise.all(
      badges.map(async (badge) => {
        const imageUrl = await getFileUrl(badge.image);
        return {
          id: badge.id,
          project_id: badge.project_id,
          project: badge.project?.project_name || null,
          title: badge.name,
          description: badge.description || null,
          badge_specific_progress: badge.progress_percentage,
          is_special: badge.is_special,
          image: imageUrl,
        };
      })
    );

    const formattedProjects = projects.map((project) => ({
      project_id: project.id,
      project_name: project.project_name,
    }));

    return res.status(200).json({
      message: "Badges and projects retrieved successfully",
      data: formattedBadges,
      projects: formattedProjects,
    });
  } catch (error) {
    console.error("Error fetching badges or projects:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const update_badge = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, project_id, description, is_special, progress_percentage } =
      req.body;

    const parsedBadgeId = parseInt(id);
    const parsedProjectId = project_id ? parseInt(project_id) : undefined;

    const existingBadge = await prisma.badges.findUnique({
      where: { id: parsedBadgeId },
      select: { id: true, image: true },
    });
    if (!existingBadge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    if (name) {
      const trimmed_name = name.trim();
      const existingBadgeWithName = await prisma.badges.findFirst({
        where: {
          name: {
            equals: trimmed_name,
            mode: "insensitive",
          },
          id: { not: parsedBadgeId },
        },
      });
      if (existingBadgeWithName) {
        return res.status(400).json({
          message: "A badge with this name already exists.",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (parsedProjectId) updateData.project_id = parsedProjectId;

    const isSpecial = is_special === "true" || is_special === true;
    let finalProgressPercentage = null;

    if (is_special !== undefined) {
      if (isSpecial) {
        finalProgressPercentage = 100;
        const existingSpecialBadge = await prisma.badges.findFirst({
          where: {
            project_id: parsedProjectId || existingBadge.project_id,
            is_special: true,
            id: { not: parsedBadgeId },
          },
        });
        if (existingSpecialBadge) {
          return res.status(400).json({
            message: "A special badge already exists for this project.",
          });
        }
      } else if (progress_percentage) {
        const parsedProgressPercentage = parseInt(progress_percentage);
        const existingPercentageBadge = await prisma.badges.findFirst({
          where: {
            project_id: parsedProjectId || existingBadge.project_id,
            progress_percentage: parsedProgressPercentage,
            is_special: false,
            id: { not: parsedBadgeId },
          },
        });
        if (existingPercentageBadge) {
          return res.status(400).json({
            message: `A badge with ${parsedProgressPercentage}% progress already exists for this project.`,
          });
        }
        finalProgressPercentage = parsedProgressPercentage;
      }
      updateData.is_special = isSpecial;
      updateData.progress_percentage = finalProgressPercentage;
    }

    let imageUrl = existingBadge.image;
    if (req.file) {
      if (imageUrl) {
        try {
          const filePath = isProd
            ? imageUrl.split("?")[0]
            : imageUrl.replace("/uploads/", "");
          await deleteFromStorage(filePath);
        } catch (error) {
          console.error(
            `Error deleting previous badge image ${imageUrl}:`,
            error
          );
        }
      }

      const processedImage = await sharp(req.file.buffer)
        .webp({ quality: 50 })
        .toBuffer();
      imageUrl = await uploadToStorage(
        processedImage,
        req.file.originalname,
        "badges"
      );
      updateData.image = imageUrl;
    } else if (req.body.image === "") {
      if (imageUrl) {
        try {
          const filePath = isProd
            ? imageUrl.split("?")[0]
            : imageUrl.replace("/uploads/", "");
          await deleteFromStorage(filePath);
        } catch (error) {
          console.error(
            `Error deleting previous badge image ${imageUrl}:`,
            error
          );
        }
      }
      updateData.image = null;
    }

    const updatedBadge = await prisma.badges.update({
      where: { id: parsedBadgeId },
      data: updateData,
    });

    const project = await prisma.projects.findUnique({
      where: { id: parsedProjectId || existingBadge.project_id },
      select: { project_name: true, teams: { select: { id: true } } },
    });
    const teamIds = project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Badge Updated",
        `The badge <b>${updatedBadge.name}</b> for the project <b>${project.project_name}</b> has been updated.`,
        { type: "update", badgeId: updatedBadge.id, projectId: parsedProjectId || existingBadge.project_id }
      );
    }
    await entityUpdate("badges");
    return res.status(200).json({
      message: "Badge updated successfully",
    });
  } catch (error) {
    console.error("Error updating badge:", error);
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${error.message}` });
  }
};

export const delete_badge = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedBadgeId = parseInt(id);

    const existingBadge = await prisma.badges.findUnique({
      where: { id: parsedBadgeId },
      select: { id: true, image: true },
    });
    if (!existingBadge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    if (existingBadge.image) {
      try {
        const filePath = isProd
          ? existingBadge.image.split("?")[0]
          : existingBadge.image.replace("/uploads/", "");
        await deleteFromStorage(filePath);
      } catch (error) {
        console.error(`Error deleting image ${existingBadge.image}:`, error);
      }
    }

    await prisma.badges.delete({
      where: { id: parsedBadgeId },
    });
    await entityUpdate("badges");

    return res.status(200).json({
      message: "Badge deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting badge:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const get_project_badge_status = async (req, res) => {
  try {
    const { clerk_id, project_id } = req.params;

    const user = await prisma.users.findUnique({
      where: { clerk_id },
      select: {
        progress_percentage: true,
        badges: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userProgress = user.progress_percentage || {};
    const projectProgressData = userProgress[project_id] || {};
    const projectProgress = projectProgressData.progress || 0;

    let userBadges = Array.isArray(user.badges) ? user.badges : [];

    const allProjectBadges = await prisma.badges.findMany({
      where: { project_id: Number(project_id) },
      orderBy: { progress_percentage: "asc" },
      include: {
        project: {
          select: { id: true, project_name: true },
        },
      },
    });

    const newBadges = [];
    for (const badge of allProjectBadges) {
      const requiredProgress = badge.is_special
        ? 100
        : badge.progress_percentage || 100;

      if (
        !userBadges.some((b) => b.id === badge.id) &&
        projectProgress >= requiredProgress
      ) {
        newBadges.push({
          id: badge.id,
          notified: false,
          achieved_date: new Date().toISOString(),
        });
      }
    }

    if (newBadges.length > 0) {
      userBadges = [...userBadges, ...newBadges];
      await prisma.users.update({
        where: { clerk_id },
        data: {
          badges: userBadges,
        },
      });
    }

    const badgeIds = userBadges.map((b) => b.id);
    const achievedBadges = allProjectBadges.filter((badge) =>
      badgeIds.includes(badge.id)
    );
    const upcomingBadges = allProjectBadges.filter(
      (badge) => !badgeIds.includes(badge.id)
    );

    const latestBadge = await getLatestBadge(achievedBadges, userBadges);
    const nextMilestone = await getNextMilestone(
      upcomingBadges,
      projectProgress
    );

    return res.status(200).json({
      message: "Project badge status fetched successfully",
      data: {
        latestBadge,
        nextMilestone,
      },
    });
  } catch (error) {
    console.error("Error fetching project badge status:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
