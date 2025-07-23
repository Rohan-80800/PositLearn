import prisma from "../DB/db.config.js";
import set from "lodash/set.js";
import {
  getFileUrl,
} from "./s3_controller.js";

export const getUserModules = async (req, res) => {
  try {
    const { clerk_id, project_id } = req.params;
    const user = await prisma.users.findUnique({
      where: { clerk_id },
      include: {
        teams: {
          include: {
            projects: {
              where: { id: parseInt(project_id) },
              include: {
                modules: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.teams || user.teams.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found or not assigned to any teams" });
    }

    let project = null;
    for (const team of user.teams) {
      const foundProject = team.projects.find(
        (proj) => proj.id === parseInt(project_id)
      );
      if (foundProject) {
        project = foundProject;
        break;
      }
    }

    if (!project) {
      return res.status(403).json({
        message: "User is not assigned to this project through any team",
      });
    }

    const modulesWithFileUrls = await Promise.all(
      project.modules.map(async (module) => {
        if (!module.file || !Array.isArray(module.file)) {
          return module;
        }

        const filesWithUrls = await Promise.all(
          module.file.map(async (fileObj) => {
            if (!fileObj.url) return fileObj;

            const accessUrl = await getFileUrl(fileObj.url);

            return {
              ...fileObj,
              accessUrl: accessUrl || fileObj.url,
            };
          })
        );

        return {
          ...module,
          file: filesWithUrls,
        };
      })
    );

    return res.status(200).json({
      data: modulesWithFileUrls,
      project_name: project.project_name,
      validator: project.validator_id,
      current_learning: user.current_learning || {},
      module_completed: user.module_completed || {},
      quiz_result: user.quiz_results || {},
      learning_time: user.learning_time || 0,
      notebook_data: user.notebook_data,
      progress_percentage: user.progress_percentage || {},
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const completeVideo = async (req, res) => {
  try {
    const { clerk_id } = req.params;
    const { projectId, moduleId, videoId, videoDuration, progressPercentage } = req.body;

    const user = await prisma.users.findUnique({ where: { clerk_id } });

    const alreadyCompleted =
      user.module_completed?.[projectId]?.[moduleId]?.includes(videoId) ||
      false;

    const learningData = user.module_completed || {};
    if (!learningData[projectId]) {
      learningData[projectId] = {};
    }
    if (!learningData[projectId][moduleId]) {
      learningData[projectId][moduleId] = [];
    }

    if (
      !alreadyCompleted &&
      !learningData[projectId][moduleId].includes(videoId)
    ) {
      learningData[projectId][moduleId].push(videoId);
    }

    const updatedLearningTime = (user.learning_time || 0) + videoDuration;

    const progressData = user.progress_percentage || {};
    if ((progressData[projectId]?.progress || 0) < progressPercentage) {
      progressData[projectId] = {
        progress: progressPercentage,
        emailSent: progressData[projectId]?.emailSent || false,
      };
    }

    const endDateData = user.end_date || {};
    if (progressPercentage === 100 && !endDateData?.[projectId]) {
      endDateData[projectId] = new Date().toISOString();
    }

    const eligibleBadges = await prisma.badges.findMany({
      where: {
        project_id: projectId,
        progress_percentage: {
          lte: progressPercentage,
        },
      },
    });

    const currentBadges = user.badges || [];
    const currentBadgeIds = currentBadges.map((b) => b.id);

    const newBadges = eligibleBadges
      .filter((badge) => !currentBadgeIds.includes(badge.id))
      .map((badge) => ({
        id: badge.id,
        achieved_date: new Date().toISOString(),
        notified: false,
      }));

    const allBadges = [...currentBadges, ...newBadges];

    await prisma.users.update({
      where: { clerk_id },
      data: {
        module_completed: learningData,
        learning_time: updatedLearningTime,
        progress_percentage: progressData,
        end_date: endDateData,
        badges: allBadges,
      },
    });

    return res.status(200).json({
      newBadges: newBadges.length > 0 ? newBadges : null,
    });
  } catch (error) {
    console.error("Error updating completed video:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateVideoProgress = async (req, res) => {
  try {
    const { clerk_id } = req.params;
    const {
      projectId,
      moduleId,
      videoId,
      savedTime,
      lastBreakpoint,
      selectedKey,
    } = req.body;

    const user = await prisma.users.findUnique({ where: { clerk_id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const updatedProgress = {
      projectId,
      moduleId,
      videoId,
      savedTime,
      lastBreakpoint,
      selectedKey,
    };

    const startDateData = user.start_date || {};
    if (!startDateData[projectId]) {
      startDateData[projectId] = new Date().toISOString();
    }

    await prisma.users.update({
      where: { clerk_id },
      data: {
        current_learning: updatedProgress,
        start_date: startDateData,
      },
    });

    return res.status(200).json();
  } catch (error) {
    console.error("Error updating video progress:", error);
    return res.status(500).json();
  }
};

export const notebookData = async (req, res) => {
  try {
    const { clerk_id } = req.params;
    const { projectId, moduleId, videoId, value } = req.body;
    const user = await prisma.users.findUnique({ where: { clerk_id } });
    const notebookData = user.notebook_data || {};
    if (!notebookData[projectId]) notebookData[projectId] = {};
    set(notebookData, [projectId, moduleId, videoId], value);

    await prisma.users.update({
      where: { clerk_id },
      data: { notebook_data: notebookData },
    });

    return res.status(200).json();
  } catch (error) {
    console.error("Error updating notebook data:", error);
    return res.status(500).json();
  }
};

export const markBadgeAsNotified = async (req, res) => {
  try {
    const { clerk_id } = req.params;
    const { badge_id } = req.body;

    const user = await prisma.users.findUnique({
      where: { clerk_id },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const badges = user.badges || [];
    const updatedBadges = badges.map((badge) => {
      if (badge.id === badge_id) {
        return { ...badge, notified: true };
      }
      return badge;
    });

    await prisma.users.update({
      where: { clerk_id },
      data: { badges: updatedBadges },
    });

    return res.status(200).json({ message: "Badge marked as notified" });
  } catch (error) {
    console.error("Error marking badge as notified:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

