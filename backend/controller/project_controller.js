import prisma from "../DB/db.config.js";
import sharp from "sharp";
import { uploadToStorage,deleteFromStorage,getFileUrl } from "./s3_controller.js";
// import { updateProjectIndex } from "../indexTypesenseData.js";
// import typesenseClient from "../typesenseServer.js";
import { sendNotificationToTeamUsers, entityUpdate } from "../utils/notification.js";

export const createProject = async (req, res) => {
  try {
    const {
      project_name,
      project_type,
      description,
      github_repository,
      start_date,
      end_date,
      priority,
      team_ids,
      project_for,
    } = req.body;

    if (!project_name || project_name.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Project name is required" });
    }

    const projectchk = await prisma.projects.findFirst({
      where: {
        project_name: {
          equals: project_name.trim(),
          mode: "insensitive",
        },
      },
    });

    if (projectchk) {
      return res.status(400).json({
        success: false,
        message: "A project with the same name already exists.",
      });
    }

    let logoUrl = null;
    if (req.file) {
      const processedImage = await sharp(req.file.buffer)
        .webp({ quality: 50 })
        .toBuffer();
      logoUrl = await uploadToStorage(processedImage, req.file.originalname,"logo");
    }

    let teamIdsArray = [];
    if (team_ids && team_ids.trim() !== "") {
      try {
        teamIdsArray = JSON.parse(team_ids);
        if (!Array.isArray(teamIdsArray)) {
          teamIdsArray = [];
        }
      } catch {
        teamIdsArray = [];
      }
    }

    const parsedStartDate = start_date ? new Date(start_date) : new Date();
    if (isNaN(parsedStartDate.getTime())) {
      parsedStartDate = new Date();
    }

    const parsedEndDate =
      end_date && end_date !== "null" ? new Date(end_date) : null;
    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      parsedEndDate = null;
    }

    let parsedDescription;
    try {
      parsedDescription = description ? JSON.parse(description) : { content: "", techStack: [] };
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid description format. Expected JSON.",
      });
    }

    const project = await prisma.projects.create({
      data: {
        project_name: project_name.trim(),
        project_type: project_type || "WEB",
        description: parsedDescription || "",
        github_repository: github_repository || "",
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        priority: priority || "MEDIUM",
        logo_url: logoUrl,
        project_for: project_for || "",
        teams: {
          connect: teamIdsArray.map((id) => ({ id: parseInt(id, 10) })),
        },
      },
      include: { teams: { include: { users: true } } },
    });

    if (teamIdsArray.length > 0) {
      await sendNotificationToTeamUsers(
        teamIdsArray,
        "New Project Assigned",
        `You have been assigned to the project:<b>${project_name.trim()}</b>`,
        { project_id: project.id,
          type: "assign",
         }
      );
    }
    // Commented to avoid typense collection in global search
    // await updateProjectIndex(project.id);
    await entityUpdate("projects");

    res.status(201).json({ success: true, project });
  } catch (error) {
    console.error("Error creating project:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);
    const {
      project_name,
      description,
      github_repository,
      start_date,
      end_date,
      project_type,
      priority,
      team_ids,
      project_for,
    } = req.body;

    const existingProject = await prisma.projects.findUnique({
      where: { id: projectId },
      include: { teams: true, modules: true },
    });

    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project_name && project_name.trim() !== existingProject.project_name) {
      const duplicateProject = await prisma.projects.findFirst({
        where: {
          project_name: {
            equals: project_name.trim(),
            mode: "insensitive",
          },
          NOT: { id: projectId },
        },
      });

      if (duplicateProject) {
        return res.status(409).json({
          success: false,
          message: "A project with the same name already exists.",
        });
      }
    }

    let updatedDescription = existingProject.description || { content: "", techStack: [] };
    if (description !== undefined) {
      try {
        const newDescription = JSON.parse(description);
        updatedDescription = {
          content: newDescription.content ?? updatedDescription.content ?? "",
          techStack: newDescription.techStack ?? updatedDescription.techStack ?? [],
        };
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid description format. Expected JSON.",
        });
      }
    }

    let logoUrl = existingProject.logo_url;
    if (req.file) {
      if (logoUrl) {
        await deleteFromStorage(logoUrl);
      }

      const processedImage = await sharp(req.file.buffer)
        .webp({ quality: 50 })
        .toBuffer();
      logoUrl = await uploadToStorage(processedImage, req.file.originalname,"logo");
    }

    let newTeamIds = [];
    try {
      newTeamIds = JSON.parse(team_ids || "[]")
        .map((id) => parseInt(id, 10))
        .filter(Boolean);
    } catch {
      console.warn("Invalid team_ids, defaulting to empty array.");
      newTeamIds = [];
    }

    const previousTeamIds = existingProject.teams
      ? existingProject.teams.map((team) => team.id)
      : [];

    const teamsToRemove = previousTeamIds.filter(
      (id) => !newTeamIds.includes(id)
    );
    const teamsToAdd = newTeamIds.filter((id) => !previousTeamIds.includes(id));

    for (const teamId of teamsToRemove) {
      const team = await prisma.teams.findFirst({
        where: { id: teamId },
        select: { project_history: true },
      });
      if (team) {
        const updatedHistory = (team.project_history || []).map((entry) => {
          if (entry.project_id === projectId && !entry.left_at) {
            return { ...entry, left_at: new Date().toISOString() };
          }
          return entry;
        });
        await prisma.teams.update({
          where: { id: teamId },
          data: { project_history: updatedHistory },
        });
      }
    }
    for (const teamId of teamsToAdd) {
      const team = await prisma.teams.findFirst({
        where: { id: teamId },
        select: { project_history: true, is_active: true },
      });
      if (team && team.is_active) {
        const updatedHistory = [
          ...(team.project_history || []),
          { project_id: projectId, assigned_at: new Date().toISOString() },
        ];
        await prisma.teams.update({
          where: { id: teamId },
          data: { project_history: updatedHistory },
        });
      }
    }
    if (teamsToAdd.length > 0) {
      await sendNotificationToTeamUsers(
        teamsToAdd,
        "New Project Assignment",
        `You have been assigned to the project:<b>${project_name?.trim() || existingProject.project_name}</b>`,
        { project_id: projectId,
          type: "update"
         }
      );
    }

    const updateData = {
      project_name: project_name?.trim() || existingProject.project_name,
      description: updatedDescription,
      github_repository: github_repository || existingProject.github_repository,
      start_date: start_date
        ? new Date(start_date)
        : existingProject.start_date,
      end_date:
        end_date === "null" || !end_date
          ? null
          : isNaN(new Date(end_date))
          ? existingProject.end_date
          : new Date(end_date),
      project_type: project_type || existingProject.project_type,
      priority: priority || existingProject.priority,
      logo_url: logoUrl,
      teams: {
        set: newTeamIds.length > 0 ? newTeamIds.map((id) => ({ id })) : [],
      },
      project_for: project_for || "",
    };

    const updatedProject = await prisma.projects.update({
      where: { id: projectId },
      data: updateData,
      include: { teams: true, modules: true },
    });

    // Commented to avoid typense collection in global search
    // await updateProjectIndex(projectId);

    await entityUpdate("projects"); 
    return res.json({
      status: 200,
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in updating the project",
      details: error.message,
    });
  }
};

export const delete_project = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id, 10);

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        teams: { select: { id: true, project_history: true } },
        modules: { select: { id: true, file: true } },
        badges: { select: { id: true, image: true } },
        discussions: { select: { id: true, image_urls: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const teamIds = project.teams.map((team) => team.id);
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Project Deletion",
        `The project <b>${project.project_name}</b> has been deleted, and you are no longer assigned to it.`,
        { project_id: projectId,
          type: "delete"
         }
      );
    }

    if (project.logo_url) {
      await deleteFromStorage(project.logo_url);
    }

    if (Array.isArray(project.modules)) {
      for (const module of project.modules) {
        const fileUrls = module.file || [];
        for (const file of fileUrls) {
          if (file && file.url) {
            try {
              await deleteFromStorage(file.url);
            } catch (error) {
              console.warn(`Failed to delete module file ${file.url}:`, error);
            }
          }
        }
      }
    }

    if (Array.isArray(project.badges)) {
      for (const badge of project.badges) {
        if (badge.image) {
          try {
            await deleteFromStorage(badge.image);
          } catch (error) {
            console.warn(`Failed to delete badge image ${badge.image}:`, error);
          }
        }
      }

      await prisma.badges.deleteMany({
        where: { project_id: projectId }
      });
    }

    if (Array.isArray(project.discussions)) {
      for (const discussion of project.discussions) {
        const imageUrls = discussion.image_urls || [];
        for (const imageUrl of imageUrls) {
          if (imageUrl) {
            try {
              await deleteFromStorage(imageUrl);
            } catch (error) {
              console.warn(`Failed to delete discussion image ${imageUrl}:`, error);
            }
          }
        }
      }

      await prisma.discussions.deleteMany({
        where: { project_id: projectId }
      });
    }

    await Promise.all(
      project.teams.map((team) => {
        const updatedHistory = (team.project_history || []).map((entry) =>
          entry.project_id === projectId && !entry.left_at
            ? { ...entry, left_at: new Date().toISOString() }
            : entry
        );
        return prisma.teams.update({
          where: { id: team.id },
          data: { project_history: updatedHistory }
        });
      })
    );

    await prisma.projects.delete({ where: { id: projectId } });

    // await typesenseClient
    // .collections("projects")
    // .documents(projectId.toString())
    // .delete();

    await entityUpdate("projects");
    return res.status(200).json({ message: "Project and associated files deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({
      message: "Error in deleting project",
      details: error.message,
    });
  }
};

export const get_user_projects = async (req, res) => {
  try {
    const clerk_id = req.auth().userId;
    if (!clerk_id) {
      return res.status(400).json({ message: "User ID is required." });
    }
    const user = await prisma.users.findUnique({
      where: { clerk_id },
      select: { role: true, progress_percentage: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isAdmin = user.role === "ADMIN";
    const projectQuery = {
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        project_name: true,
        description: true,
        project_type: true,
        progress: true,
        logo_url: true,
        start_date: true,
        end_date: true,
        modules: true,
        github_repository: true,
        validator_id: true,
        project_for:true,
        teams: {
          select: {
            team_name: true,
            team_category: true,
            users: {
              select: {
                clerk_id: true,
                first_name: true,
                last_name: true,
                user_image: true,
                role: true,
              },
            },
            _count: {
              select: { users: true },
            },
          },
        },
      },
    };

    if (!isAdmin) {
      projectQuery.where = {
        teams: {
          some: {
            users: {
              some: { clerk_id },
            },
          },
        },
      };
    }
    const project_data = await prisma.projects.findMany(projectQuery);

const formatted_data = await Promise.all(
  project_data.map(async (project) => {
    const progress_percentage = user.progress_percentage?.[project.id] || 0;

    const updatedProject = {
      ...project,
      category: project.teams.length > 0 ? project.teams[0].team_category : null,
      progress_percentage,
    };

    if (updatedProject.logo_url) {
      const logoUrl = await getFileUrl(updatedProject.logo_url);
      updatedProject.logo_url = logoUrl || updatedProject.logo_url;
    }

    return updatedProject;
  })
);

return res.status(200).json({ data: formatted_data });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const userId = req.auth().userId;
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { progress_percentage: true },
    });
    const project = await prisma.projects.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        teams: {
          select: {
            id: true,
            team_name: true,
          },
        },
        modules: {
          select: {
            id: true,
            title: true,
            description: true,
            video: true,
            file: true,
          },
        },
      },
    });

    let projectWithLogo = project;
    const progress_percentage = user?.progress_percentage?.[projectId] || 0;
    if (project.logo_url) {
      const logoUrl = await getFileUrl(project.logo_url);
      projectWithLogo = {
        ...project,
        logo_url: logoUrl || project.logo_url,
        progress_percentage,
      };
    } else {
      projectWithLogo = {
        ...project,
        progress_percentage,
      };
    }

    return res.status(200).json({
      success: true,
      data: projectWithLogo
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return res.status(404).json({
      success: false,
      message: "Project not found"
    });
  }
};

export const get_all_projects = async (req, res) => {
  const project_data = await prisma.projects.findMany();
  if (project_data.length === 0) {
    return res.status(404).json({ message: "Project not found" });
  }
  return res.json({
    status: 200,
    message: "Project details",
    data: project_data,
  });
};

export const get_dashboard_stats = async (req, res) => {
  try {
    const clerk_id = req.auth().userId;
    if (!clerk_id) {
      return res.status(400).json({ message: "User ID is required." });
    }
    const user = await prisma.users.findUnique({
      where: { clerk_id },
      select: { role: true, progress_percentage: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isAdmin = user.role === "ADMIN";
    const counts = isAdmin
      ? await prisma.$transaction([
          prisma.projects.count(),
          prisma.projects.count({
            where: {
              id: {
                in: Object.keys(user.progress_percentage || {})
                  .filter((key) => user.progress_percentage[key].progress >= 100)
                  .map(Number),
              },
            },
          }),
          prisma.teams.count(),
        ])
      : await prisma.$transaction([
          prisma.projects.count({
            where: {
              teams: {
                some: {
                  users: {
                    some: { clerk_id },
                  },
                },
              },
            },
          }),
          prisma.projects.count({
            where: {
              teams: {
                some: {
                  users: {
                    some: { clerk_id },
                  },
                },
              },
              id: {
                in: Object.keys(user.progress_percentage || {})
                  .filter((key) => user.progress_percentage[key].progress >= 100)
                  .map(Number),
              },
            },
          }),
          prisma.teams.count({
            where: {
              users: {
                some: { clerk_id },
              },
            },
          }),
        ]);

    return res.status(200).json({
      total_projects: counts[0],
      completed_projects: counts[1],
      team_count: counts[2],
    });

  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
