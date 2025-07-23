import prisma from "../DB/db.config.js";
// import { updateDiscussionIndex } from "../indexTypesenseData.js";
// import typesenseClient from "../typesenseServer.js";
import sharp from "sharp";
import dotenv from "dotenv";
import { uploadToStorage,getFileUrl,deleteFromStorage } from "./s3_controller.js";
import { sendNotificationToTeamUsers, sendNotificationToUsers, entityUpdate } from "../utils/notification.js";

dotenv.config();
const isProd = process.env.ENV === "prod";

export const create_discussion = async (req, res) => {
  try {
    const { user_id, project_id, title, description } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Title is required"
      });
    }

    if (!user_id || !project_id) {
      return res.status(400).json({
        success: false,
        message: "User ID and Project ID are required"
      });
    }

    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      imageUrls = await Promise.all(
        req.files.map(async (file) => {
          const processedImage = await sharp(file.buffer)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();
          return await uploadToStorage(processedImage, file.originalname, "discussions");
        })
      );
    }

    let parsedDescription = description;
    if (description && typeof description === 'string') {
      try {
        parsedDescription = JSON.parse(description);
      } catch {
        console.warn("Description is not valid JSON, storing as plain text");
      }
    }

    const newDiscussion = await prisma.discussions.create({
      data: {
        user_id,
        project_id: Number(project_id),
        title: title.trim(),
        description: parsedDescription || "",
        image_urls: imageUrls,
      },
      include: {
        project: { select: { project_name: true, teams: { select: { id: true } } } },
      }
    });

    const teamIds = newDiscussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "New Discussion Created",
        `A new discussion has been created: <b>${title.trim()}</b>`,
        { project_id: Number(project_id), type: "assign" },
        req.auth().userId
      );
    }
    const notifyRoles = await prisma.users.findMany({
      where: {
        role: { in: ["ADMIN"] },
        clerk_id: { not: req.auth().userId },
      },
      select: { clerk_id: true },
    });

    const clerkIds = notifyRoles.map((user) => user.clerk_id);

    if (clerkIds.length > 0) {
      await sendNotificationToUsers(
        clerkIds,
        "New Discussion Created",
        `A new discussion has been created: <b>${title.trim()}</b>`,
        { project_id: Number(project_id), type: "assign" }
      );
    }
    // Commented to avoid typense collection in global search
    // await updateDiscussionIndex(newDiscussion.id);
    await entityUpdate("discussions");
    return res.status(201).json({
      success: true,
      message: "Discussion created successfully",
      data: newDiscussion,
    });
  } catch (error) {
    console.error("Error creating discussion:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};

export const fetch_discussion = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const user_id = req.auth().userId;

    if (!user_id) {
      return res
        .status(401)
        .json({ status: 401, message: "User not authenticated." });
    }

    const user = await prisma.users.findUnique({
      where: { clerk_id: user_id },
      select: { role: true },
    });

    if (!user) {
      return res.status(404).json({ status: 404, message: "User not found." });
    }

    const isAdmin = user.role === "ADMIN";

    const include = {
      user: {
        select: {
          first_name: true,
          last_name: true,
          user_image: true,
        },
      },
      comments: {
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              user_image: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  first_name: true,
                  last_name: true,
                  user_image: true,
                },
              },
            },
            orderBy: { created_at: "asc" },
          },
        },
        orderBy: { created_at: "asc" },
      },
    };

    const where = {
      ...(isAdmin
        ? {}
        : {
            project: {
              teams: {
                some: {
                  users: {
                    some: {
                      clerk_id: user_id,
                    },
                  },
                },
              },
            },
          }),
      ...(id ? { id } : {}),
    };

    let discussions = id
      ? await prisma.discussions.findUnique({
          where: { id },
          include,
        })
      : await prisma.discussions.findMany({
          where,
          include,
          orderBy: { created_at: "asc" },
        });

    if (id && !discussions) {
      return res.status(404).json({
        status: 404,
        message: "Discussion not found or you lack access to the project.",
      });
    }

    const processImageUrls = async (imageKeys) => {
      if (!imageKeys || imageKeys.length === 0) return [];
      return Promise.all(imageKeys.map(key => getFileUrl(key)));
    };

    if (Array.isArray(discussions)) {
      discussions = await Promise.all(
        discussions.map(async (discussion) => {
          const imageUrls = await processImageUrls(discussion.image_urls || []);
          return {
            ...discussion,
            image_urls: imageUrls.filter(url => url !== null),
          };
        })
      );
    } else if (discussions) {
      const imageUrls = await processImageUrls(discussions.image_urls || []);
      discussions = {
        ...discussions,
        image_urls: imageUrls.filter(url => url !== null),
      };
    }

    return res.json({ status: 200, data: discussions });
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return res.status(500).json({ status: 500, message: error.message });
  }
};

export const update_discussion = async (req, res) => {
  try {
    const discussionId = Number(req.params.id);
    const { title, description, imagesToRemove = [] } = req.body;

    if (!discussionId) {
      return res.status(400).json({
        status: 400,
        message: "Please provide a valid Discussion ID.",
      });
    }

    const currentDiscussion = await prisma.discussions.findUnique({
      where: { id: discussionId },
      select: { image_urls: true }
    });

    if (!currentDiscussion) {
      return res.status(404).json({
        status: 404,
        message: "Discussion not found."
      });
    }

    let urlsToDelete = [];

    if (Array.isArray(imagesToRemove)) {
      urlsToDelete = imagesToRemove;
    } else if (typeof imagesToRemove === 'string') {
      try {
        urlsToDelete = JSON.parse(imagesToRemove);
      } catch {
        urlsToDelete = imagesToRemove.split(',').map(url => url.trim()).filter(Boolean);
      }
    }

    if (urlsToDelete.length > 0) {
      await Promise.all(
        urlsToDelete.map(async (url) => {
          try {
            const filePath = isProd
              ? new URL(url).pathname.substring(1)
              : url.replace('/uploads/', '');
            await deleteFromStorage(filePath);
          } catch (error) {
            console.error(`Error deleting image ${url}:`, error);
          }
        })
      );
    }


    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      newImageUrls = await Promise.all(
        req.files.map(async (file) => {
          const processedImage = await sharp(file.buffer)
            .resize(800)
            .webp({ quality: 80 })
            .toBuffer();
          return await uploadToStorage(processedImage, file.originalname, "discussions");
        })
      );
    }
    const extractKey = (urlOrPath) => {
      if (!isProd) {
        return urlOrPath;
      }
      try {
        const url = new URL(urlOrPath);
        return url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
      } catch {
        return urlOrPath;
      }
    };

    const updatedImageUrls = [
      ...(currentDiscussion.image_urls || []).filter((url) => {
        const storedKey = url;
        return !urlsToDelete.some(toDelete => {
          const toDeleteKey = extractKey(toDelete);
          return storedKey === toDeleteKey;
        });
      }),
      ...newImageUrls
    ];

    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(req.files || urlsToDelete.length > 0) && {
        image_urls: updatedImageUrls
      },
      updated_at: new Date()
    };

    const updatedDiscussion = await prisma.discussions.update({
      where: { id: discussionId },
      data: updateData,
      include: {
        user: { select: { first_name: true, last_name: true, user_image: true } },
        project: { select: { project_name: true, teams: { select: { id: true } } } },
      },
    });

    const teamIds = updatedDiscussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Discussion Updated",
        `The discussion has been updated: <b>${updatedDiscussion.title}</b>`,
        { project_id: updatedDiscussion.project_id, type: "update" },
        req.auth().userId
      );
    }
        const notifyRoles = await prisma.users.findMany({
      where: {
        role: { in: ["ADMIN"] },
        clerk_id: { not: req.auth().userId },
      },
      select: { clerk_id: true },
    });

    const clerkIds = notifyRoles.map((user) => user.clerk_id);

    if (clerkIds.length > 0) {
      await sendNotificationToUsers(
        clerkIds,
        "Discussion Updated",
        `The discussion has been updated: <b>${updatedDiscussion.title}</b>`,
        { project_id: updatedDiscussion.project_id, type: "update" }
      );
    }
    // Commented to avoid typense collection in global search
    // await updateDiscussionIndex(discussionId);
    await entityUpdate("discussions");
    return res.json({
      status: 200,
      message: "Discussion updated successfully.",
      data: updatedDiscussion,
    });
  } catch (error) {
    console.error("Error updating discussion:", error);
    return res.status(500).json({
      status: 500,
      message: error.message || "Internal Server Error"
    });
  }
};

export const delete_discussion = async (req, res) => {
  try {
    const discussionId = Number(req.params.id);
    const discussion = await prisma.discussions.findUnique({
      where: { id: discussionId },
      select: { image_urls: true, title: true, project: { select: { project_name: true, teams: { select: { id: true } } } } },
    });

    if (!discussion) {
      return res.status(404).json({
        status: 404,
        message: "Discussion not found"
      });
    }

    if (discussion.image_urls?.length > 0) {
      await Promise.all(
        discussion.image_urls.map(async (imagePath) => {
          try {
            const filePath = isProd
              ? imagePath.split('?')[0]
              : imagePath.replace('/uploads/', '');
            await deleteFromStorage(filePath);
          } catch (error) {
            console.error(`Error deleting image ${imagePath}:`, error);
          }
        })
      );
    }

    await prisma.discussions.delete({ where: { id: discussionId } });

    const teamIds = discussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Discussion Deletion",
        `The discussion <b>${discussion.title}</b> has been deleted.`,
        { project_id: discussion.project_id, type: "delete" }
      );
    }

    // await typesenseClient
    //   .collections("discussions")
    //   .documents(discussionId.toString())
    //   .delete();

    await entityUpdate("discussions");
    return res.json({
      status: 200,
      message: "Discussion and all associated images deleted successfully",
    });
  } catch (error) {
    console.error("Delete operation failed:", error);
    return res.status(500).json({
      status: 500,
      message: "Failed to delete discussion"
    });
  }
};

export const create_comment = async (req, res) => {
  try {
    const { discussion_id, user_id, comment_text } = req.body;

    const discussion = await prisma.discussions.findUnique({
      where: { id: discussion_id },
      select: { project: { select: { project_name: true, teams: { select: { id: true } } } } },
    });
    const newComment = await prisma.comments.create({
      data: {
        discussion_id,
        user_id,
        comment_text: comment_text || null,
      },
      include: {
        user: { select: { first_name: true, last_name: true } },
      },
    });

    const teamIds = discussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "New Comment Created",
        `A new comment added : ${comment_text || "No text provided"}`,
        { project_id: discussion.project_id, type: "assign" }
      );
    }
    await entityUpdate("discussions");
    return res.status(201).json({
      id: newComment.id,
      comment_text: newComment.comment_text,
      author: newComment.user ? `${newComment.user.first_name} ${newComment.user.last_name}` : "Unknown User",
      discussionId: newComment.discussion_id,
      created_at: newComment.created_at,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const update_comment = async (req, res) => {
  try {
    const commentId = Number(req.params.id);
    const { comment_text } = req.body;

    if (!commentId || !comment_text) {
      return res.status(400).json({ message: "Invalid comment data." });
    }

    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      select: { discussion: { select: { project: { select: { project_name: true, teams: { select: { id: true } } } } } } },
    });
    const updatedComment = await prisma.comments.update({
      where: { id: commentId },
      data: { comment_text },
    });

    const teamIds = comment.discussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Comment Updated",
        `${comment_text}`,
        { project_id: comment.discussion.project_id, type: "update" }
      );
    }

    await entityUpdate("discussions");
    return res.json({
      status: 200,
      message: "Comment updated successfully.",
      data: updatedComment,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const delete_comment = async (req, res) => {
  try {
    const commentId = Number(req.params.id);

    if (!commentId) {
      return res.status(400).json({ message: "Invalid Comment ID." });
    }

    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      select: { discussion: { select: { project: { select: { project_name: true, teams: { select: { id: true } } } } } } },
    });
    await prisma.comments.delete({ where: { id: commentId } });

    const teamIds = comment.discussion.project?.teams.map((team) => team.id) || [];
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Comment Deletion",
        `The comment has been deleted.`,
        { project_id: comment.discussion.project_id, type: "delete" }
      );
    }
    await entityUpdate("discussions");
    return res.json({ status: 200, message: "Comment deleted successfully!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const create_reply = async (req, res) => {
  try {
    const { comment_id, user_id, reply_text } = req.body;
    const comment = await prisma.comments.findUnique({
      where: { id: comment_id },
      select: { discussion: { select: { project: { select: { teams: { select: { id: true } } } } } } },
    });
    
    const reply = await prisma.replies.create({
      data: { comment_id, user_id, reply_text },
      include: { user: { select: { first_name: true, last_name: true, user_image: true } } },
    });

    const teamIds = comment.discussion.project?.teams.map(team => team.id) || [];
    if (teamIds.length) {
      await sendNotificationToTeamUsers(
        teamIds,
        "New Reply",
        `${reply_text}`,
        { project_id: comment.discussion.project_id, type: "description" }
      );
    }
    await entityUpdate("discussions");

    res.status(201).json({
      id: reply.id,
      reply_text: reply.reply_text,
      author: `${reply.user.first_name} ${reply.user.last_name}`,
      avatar: reply.user.user_image,
      time: reply.created_at,
      comment_id: reply.comment_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update_reply = async (req, res) => {
  try {
    const replyId = Number(req.params.id);
    const { reply_text } = req.body;

    if (!replyId || !reply_text) {
      return res.status(400).json({ message: "Invalid reply data." });
    }

    const updatedReply = await prisma.replies.update({
      where: { id: replyId },
      data: { reply_text },
    });
    await entityUpdate("discussions");

    return res.json({
      status: 200,
      message: "Reply updated successfully.",
      data: updatedReply,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const delete_reply = async (req, res) => {
  try {
    const replyId = Number(req.params.id);

    if (!replyId) {
      return res.status(400).json({ message: "Invalid Reply ID." });
    }

    await prisma.replies.delete({ where: { id: replyId } });
    await entityUpdate("discussions");

    return res.json({ status: 200, message: "Reply deleted successfully!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
