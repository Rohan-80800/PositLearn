import prisma from "../DB/db.config.js";
import { clerkClient } from "@clerk/express";
import { sendNotificationToUsers, entityUpdate } from "../utils/notification.js";

export const fetchUsers = async (req, res) => {
  try {
    const id = req.params.id;

    if (id) {
      try {
        const user = await prisma.users.findFirstOrThrow({
          where: { clerk_id: id, is_active: true },
          select: {
            first_name: true,
            last_name: true,
            email: true,
            teams: true,
            role: true,
            user_image: true,
            current_learning: true,
            progress_percentage: true,
            start_date: true,
            end_date: true,
          },
        });

        if (user.user_image) {
          user.user_image = `data:image/png;base64,${user.user_image.toString(
            "base64"
          )}`;
        }
        return res.json({
          status: 200,
          data: {
            ...user,
            current_project_id: user.current_learning?.projectId || null,
          },
        });
      } catch {
        return res.status(404).json({ status: 404, message: "User not found" });
      }
    }

    const users = await prisma.users.findMany({
      where: { is_active: true },
      select: {
        clerk_id: true,
        first_name: true,
        last_name: true,
        email: true,
        teams: true,
        role: true,
        user_image: true,
        current_learning: true,
        progress_percentage: true,
        start_date: true,
        end_date: true,
      },
    });

    const formattedUsers = users.map((user) => ({
      ...user,
      user_image: user.user_image
        ? `data:image/png;base64,${user.user_image.toString("base64")}`
        : null,
      current_project_id: user.current_learning?.projectId || null,
    }));

    return res.json({ status: 200, data: formattedUsers });
  } catch {
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};

export const createUser = async (req, res) => {
  try {
    const { first_name, email, last_name, clerk_id, user_image, role } =
      req.body;

    const upsertedUser = await prisma.users.upsert({
      where: { clerk_id },
      update: {
        first_name,
        last_name,
        email,
        user_image,
        role,
        is_active: true,
      },
      create: {
        first_name,
        email,
        last_name,
        clerk_id,
        user_image,
        role,
        is_active: true,
      },
    });
    await entityUpdate("users");
    return res.status(200).json({
      data: upsertedUser,
      message: "User created or updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const user = await prisma.users.findUnique({
    where: { clerk_id: userId },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found in the database." });
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { clerk_id: userId },
        data: { is_active: false },
      });
      await clerkClient.users.deleteUser(userId);
    });

    await sendNotificationToUsers(
      [userId],
      "Account Deactivated",
      "Your account has been deactivated.",
      { type: "delete", userId }
    );
    await entityUpdate("users");

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Deletion failed:", error);
    return res.status(500).json({
      error: "Something went wrong while deleting user.",
    });
  }
};

export const updateUserRole = async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: "User ID and role are required" });
  }

  const validRoles = ["ADMIN", "INTERN", "EMPLOYEE"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role provided" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId, is_active: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found in the database" });
    }

    const updatedUser = await prisma.users.update({
      where: { clerk_id: userId },
      data: { role },
      select: {
        clerk_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
    });

    await sendNotificationToUsers(
      [userId],
      "Role Updated",
      `Your role has been updated to <b>${role} </b>.`,
      { type: "update", userId, newRole: role }
    );
    await entityUpdate("users");
    return res.status(200).json({
      data: updatedUser,
      message: "User role updated successfully in the database",
    });
  } catch (error) {
    console.error("Role update failed:", error);
    return res.status(500).json({
      error: "Something went wrong while updating user role",
    });
  }
};

export const getUserPerformanceByProject = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);

    const teams = await prisma.teams.findMany({
      where: {
        projects: { some: { id: projectId } },
      },
      include: {
        users: {
          select: {
            clerk_id: true,
            first_name: true,
            last_name: true,
            role: true,
            progress_percentage: true,
            start_date: true,
            end_date: true,
            current_learning: true,
          },
        },
      },
    });

    const users = teams.flatMap((team) =>
      team.users.map((user) => {
        const progressObj = user.progress_percentage?.[projectId];
        const rawStartDate = user.start_date?.[projectId];
        const rawEndDate = user.end_date?.[projectId];

        const progress = progressObj?.progress ?? 0;
        const startDate = rawStartDate ? new Date(rawStartDate) : null;
        const endDate = rawEndDate ? new Date(rawEndDate) : null;

        const hasNotStarted = !progressObj || rawStartDate === undefined;

        let timeTaken = null;
        if (!hasNotStarted && progress === 100 && startDate && endDate) {
          timeTaken = endDate - startDate;
        }

        return {
          id: user.clerk_id,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          progress,
          startDate,
          endDate,
          timeTaken,
          hasNotStarted,
          currentProject:
            user.current_learning?.projectId === projectId ? "Active" : "Inactive",
        };
      })
    );

    const sortedUsers = users
    .sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      if (a.progress < 100) {
        if (a.progress === 0) {
          const aStarted = !!a.startDate;
          const bStarted = !!b.startDate;
          if (aStarted && !bStarted) return -1;
          if (!aStarted && bStarted) return 1;
          if (aStarted && bStarted) return b.startDate - a.startDate;
          return 0;
        }
        if (a.startDate && b.startDate) return b.startDate - a.startDate;
        if (a.startDate) return -1;
        if (b.startDate) return 1;

        return 0;
      }
      if (a.progress === 100) {
        if (a.timeTaken != null && b.timeTaken != null) return a.timeTaken - b.timeTaken;
        if (a.timeTaken != null) return -1;
        if (b.timeTaken != null) return 1;
        return 0;
      }

      return 0;
    })
    .map((user, index) => ({
      ...user,
      rank: index + 1,
    }));



    res.status(200).json(sortedUsers);
  } catch (error) {
    console.error("Error fetching user performance:", error);
    res.status(500).json({
      message: "Error fetching user performance data",
      error: error.message,
    });
  }
};

export const fetchTaskPerformance = async (req, res) => {
  try {
    const { clerkId } = req.query;
    
    if (!clerkId) {
      return res
        .status(400)
        .json({ status: 400, message: "Clerk ID is required" });
    }

    const user = await prisma.users.findFirst({
      where: { clerk_id: clerkId, is_active: true },
      select: { progress_percentage: true }
    });

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found" });
    }

    const progressData = user.progress_percentage || {};
    const projectIds = Object.keys(progressData);
    const totalProjects = projectIds.length;

    if (totalProjects === 0) {
      return res.status(200).json({
        status: 200,
        data: {
          completed: { percent: 0 },
          inProgress: { percent: 0 },
          behind: { percent: 0 }
        }
      });
    }

    let completedCount = 0;
    let inProgressCount = 0;
    let behindCount = 0;
    projectIds.forEach((projectId) => {
      const progress = progressData[projectId]?.progress || 0;
      if (progress === 100) {
        completedCount++;
      } else if (progress > 0 && progress < 100) {
        inProgressCount++;
      } else {
        behindCount++;
      }
    });

    const completedPercent = ((completedCount / totalProjects) * 100).toFixed(
      2
    );
    const inProgressPercent = ((inProgressCount / totalProjects) * 100).toFixed(
      2
    );
    const behindPercent = ((behindCount / totalProjects) * 100).toFixed(2);

    return res.status(200).json({
      status: 200,
      data: {
        completed: { percent: completedPercent },
        inProgress: { percent: inProgressPercent },
        behind: { percent: behindPercent }
      }
    });
  } catch (error) {
    console.error("Error fetching task performance:", error);
    return res
      .status(500)
      .json({ status: 500, message: "Internal Server Error" });
  }
};
