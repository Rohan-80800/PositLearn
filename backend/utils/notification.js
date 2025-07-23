import prisma from "../DB/db.config.js";
import { io } from "../server.js";

const EXPIRATION_DAYS = 7;

export const entityUpdate = async (entityType, clerk_id = null) => {
  try {
    io.emit("dataUpdated", { entityType });

    if (entityType === "dashboardStats" && clerk_id) {
      const stats = await getDashboardStatsData(clerk_id);
      io.to(clerk_id).emit("dashboardStatsUpdated", stats);
    }
  } catch (error) {
    console.error(`Error emitting update for ${entityType}:`, error.message);
  }
};
export const sendNotificationToTeamUsers = async (teamIds, title, message, metadata = {},excludeUserId = null ) => {
  try {
    if (!teamIds || teamIds.length === 0) {
      return;
    }

    const users = await prisma.users.findMany({
      where: {
        teams: {
          some: {
            id: { in: teamIds.map((id) => parseInt(id, 10)) },
          },
        },
        ...(excludeUserId && { clerk_id: { not: excludeUserId } }),
      },
      select: { clerk_id: true },
    });
    const clerkIds = users.map((user) => user.clerk_id);
    if (clerkIds.length === 0) {
      console.log("No users found in specified teams");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

    await prisma.notifications.createMany({
      data: clerkIds.map((clerk_id) => ({
        user_id: clerk_id,
        title,
        message,
        metadata,
        expires_at: expiresAt,
        read: false,
      })),
      skipDuplicates: true,
    });

    const notificationData = { title, message, metadata };
    clerkIds.forEach((clerk_id) => {
      io.to(clerk_id).emit("newNotification", notificationData);
    });
  } catch (error) {
    console.error("Error sending notifications to team users:", error.message);
  }
};

export const sendNotificationToUsers = async (clerkIds, title, message, metadata = {}) => {
  try {
    if (!clerkIds || clerkIds.length === 0) {
      console.log("No Clerk IDs provided for notification");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRATION_DAYS);

    await prisma.notifications.createMany({
      data: clerkIds.map((clerk_id) => ({
        user_id: clerk_id,
        title,
        message,
        metadata,
        expires_at: expiresAt,
        read: false,
      })),
      skipDuplicates: true,
    });

    const notificationData = { title, message, metadata };
    clerkIds.forEach((clerk_id) => {
      io.to(clerk_id).emit("newNotification", notificationData);
    });
  } catch (error) {
    console.error("Error sending notifications to users:", error.message);
  }
};
export const getAdminsAndEmployees = async (excludeClerkId = null) => {
  const users = await prisma.users.findMany({
    where: {
      role: { in: ['ADMIN', 'EMPLOYEE'] },
      ...(excludeClerkId && { clerk_id: { not: excludeClerkId } }),
    },
    select: { clerk_id: true },
  });

  return users.map((u) => u.clerk_id);
};
