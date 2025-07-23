import prisma from "../DB/db.config.js";

export const getUserNotifications = async (req, res) => {
  try {
    const clerk_id = req.auth().userId;
    if (!clerk_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const notifications = await prisma.notifications.findMany({
      where: {
        user_id: clerk_id,
        expires_at: { gte: new Date() },
      },
      orderBy: { created_at: "desc" },
    });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const clerk_id = req.auth().userId;
    const { notificationId } = req.params;

    if (!clerk_id) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        id: parseInt(notificationId),
        user_id: clerk_id,
      },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    await prisma.notifications.update({
      where: { id: parseInt(notificationId) },
      data: { read: true },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking notification as read",
      error: error.message,
    });
  }
};
