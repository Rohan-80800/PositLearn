import prisma from "../DB/db.config.js";
import axios from "axios";
import { sendNotificationToTeamUsers } from "../utils/notification.js";

const SERVER_URL = process.env.PYTHON_SERVER_URL;
const FLASK_API_URL = `${SERVER_URL}generate-quiz`;

export const fetchUserByClerkId = async (req, res) => {
  try {
    const { clerk_id } = req.body;
    if (!clerk_id) {
      return res.status(400).json({ message: "Clerk ID is required" });
    }

    const user = await prisma.users.findUnique({
      where: { clerk_id },
      select: { clerk_id: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ data: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const generateQuiz = async (req, res) => {
  try {
    const { videoData, difficulty } = req.body;
    if (!videoData || !Array.isArray(videoData) || videoData.length === 0) {
      return res.status(400).json({
        message: "Video data is required and must be a non-empty array",
      });
    }
    if (
      !difficulty ||
      !["easy", "medium", "hard"].includes(difficulty.toLowerCase())
    ) {
      return res.status(400).json({
        message:
          "Invalid or missing difficulty. Must be one of: easy, medium, hard",
      });
    }

    let allQuizzes = [];
    const transcripts = {};
    let questionIdCounter = 1;

    for (const { videoId, numQuestions, order_id } of videoData) {
      if (!videoId || !numQuestions || numQuestions <= 0 || !order_id) {
        return res.status(400).json({
          message: `Invalid data for video: ${
            videoId || "unknown"
          }. Ensure videoId, numQuestions (> 0), and order_id are provided.`,
        });
      }

      if (typeof videoId !== "string" || videoId.length !== 11) {
        return res.status(400).json({
          message: `Invalid video ID: ${videoId}. Must be an 11-character string.`,
          error: "Invalid video ID format",
          transcript: null,
        });
      }

      try {
        const response = await axios.post(FLASK_API_URL, {
          videoId,
          numQuestions,
          difficulty: difficulty.toLowerCase(),
        });
        const { quizzes, error, transcripts: flaskTranscripts } = response.data;

        if (error) {
          return res.status(400).json({
            message: `Failed to generate quiz for video ${videoId}`,
            error,
            transcript: flaskTranscripts[videoId] || null,
          });
        }

        if (!quizzes || !Array.isArray(quizzes)) {
          return res.status(400).json({
            message: `No valid quizzes returned for video ${videoId}`,
            error: "Invalid quiz data from Flask API",
            transcript: flaskTranscripts[videoId] || null,
          });
        }
        let videoQuestionIdCounter = 1;

        const enrichedQuizzes = quizzes.map((quiz) => ({
          text: quiz.text,
          correct: quiz.correct,
          options: quiz.options,
          order_id: order_id,
          question_id: questionIdCounter++,
          video_question_id: videoQuestionIdCounter++,
        }));

        allQuizzes = [...allQuizzes, ...enrichedQuizzes];
        transcripts[videoId] = flaskTranscripts[videoId];
      } catch (axiosError) {
        console.error(
          `Error calling Flask API for video ${videoId}:`,
          axiosError
        );
        const errorMessage =
          axiosError.response?.data?.error || axiosError.message;
        const transcript =
          axiosError.response?.data?.transcripts?.[videoId] || null;
        return res.status(axiosError.response?.status || 500).json({
          message: `Failed to generate quiz for video ${videoId}`,
          error: errorMessage,
          transcript,
        });
      }
    }

    return res.status(200).json({ quizzes: allQuizzes, transcripts });
  } catch (error) {
    console.error("Error generating quiz:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      transcript: null,
    });
  }
};

export const createQuiz = async (req, res) => {
  try {
    const {
      project_id,
      module_id,
      video_ids,
      title,
      quiz_content,
      total_points,
      level,
    } = req.body;

    if (!project_id || !title || !quiz_content || !total_points || !level) {
      return res.status(400).json({
        message:
          "Missing required fields: project_id, title, quiz_content, total_points, and level are required",
      });
    }
    const validLevels = ["EASY", "MEDIUM", "HARD"];
    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid level. Must be one of: ${validLevels.join(", ")}`,
      });
    }

    const project = await prisma.projects.findUnique({
      where: { id: project_id },
    });

    if (!project) {
      return res.status(400).json({ message: "Project not found" });
    }

    if (module_id) {
      const module = await prisma.modules.findUnique({
        where: { id: module_id },
      });
      if (!module) {
        return res.status(400).json({ message: "Module not found" });
      }
    }

    const quiz = await prisma.quizzes.create({
      data: {
        project: { connect: { id: project_id } },
        module: module_id ? { connect: { id: module_id } } : undefined,
        video_ids,
        title,
        quiz_content,
        total_points,
        level: level.toUpperCase(),
      },
    });

    const projectTeams = await prisma.projects.findUnique({
      where: { id: project_id },
      select: { teams: { select: { id: true } } },
    });
    const teamIds = projectTeams?.teams.map((team) => team.id) || [];

    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "New Quiz Created",
        `A new quiz "${title}" has been created for the project "${project.project_name}".`,
        { type: "assign", quizId: quiz.id, projectId: project_id }
      );
    }

    return res
      .status(200)
      .json({ data: quiz, message: "Quiz created successfully" });
  } catch (error) {
    console.error("Error creating quiz:", error, error.stack);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
      stack: error.stack,
    });
  }
};

export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project_id,
      module_id,
      video_ids,
      title,
      quiz_content,
      total_points,
      level,
    } = req.body;

    if (!project_id || !title || !quiz_content || !total_points || !level) {
      return res.status(400).json({
        message:
          "Missing required fields: project_id, title, quiz_content, total_points, and level are required",
      });
    }
    const validLevels = ["EASY", "MEDIUM", "HARD"];
    if (!validLevels.includes(level.toUpperCase())) {
      return res.status(400).json({
        message: `Invalid level. Must be one of: ${validLevels.join(", ")}`,
      });
    }

    const quiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(id) },
      include: {
        project: true,
        module: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const updatedQuiz = await prisma.quizzes.update({
      where: { id: parseInt(id) },
      data: {
        project_id,
        module_id,
        video_ids,
        title,
        quiz_content,
        total_points,
        level: level.toUpperCase(),
        updated_at: new Date(),
      },
      include: {
        project: { select: { id: true, project_name: true } },
        module: { select: { id: true, title: true } },
      },
    });
    const projectTeams = await prisma.projects.findUnique({
      where: { id: project_id },
      select: { teams: { select: { id: true } } },
    });
    const teamIds = projectTeams?.teams.map((team) => team.id) || [];

    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Quiz Updated",
        `The quiz "${title}" for the project "${updatedQuiz.project.project_name}" has been updated.`,
        { type: "update", quizId: updatedQuiz.id, projectId: project_id }
      );
    }

    return res.status(200).json({
      data: {
        id: updatedQuiz.id,
        project_id: updatedQuiz.project_id,
        module_id: updatedQuiz.module_id,
        video_ids: updatedQuiz.video_ids,
        title: updatedQuiz.title,
        quiz_content: updatedQuiz.quiz_content,
        total_points: updatedQuiz.total_points,
        level: updatedQuiz.level,
        project: updatedQuiz.project,
        module: updatedQuiz.module,
      },
      message: "Quiz updated successfully",
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

export const fetchQuizzes = async (req, res) => {
  try {
    const quizzes = await prisma.quizzes.findMany({
      include: {
        project: { select: { id: true, project_name: true } },
        module: { select: { id: true, title: true } },
      },
    });
    return res.status(200).json({
      data: quizzes.map((quiz) => ({
        id: quiz.id,
        project_id: quiz.project_id,
        module_id: quiz.module_id,
        video_ids: quiz.video_ids,
        title: quiz.title,
        quiz_content: quiz.quiz_content,
        total_points: quiz.total_points,
        level: quiz.level,
        project: quiz.project,
        module: quiz.module,
      })),
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(id) },
      include: { project: { select: { id: true, project_name: true } } },
    });
    await prisma.quizzes.delete({
      where: { id: parseInt(id) },
    });
    const projectTeams = await prisma.projects.findUnique({
      where: { id: quiz.project_id },
      select: { teams: { select: { id: true } } },
    });
    const teamIds = projectTeams?.teams.map((team) => team.id) || [];

    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Quiz Deleted",
        `The quiz "${quiz.title}" for the project "${quiz.project.project_name}" has been deleted.`,
        { type: "delete", quizId: quiz.id, projectId: quiz.project_id }
      );
    }
    return res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const fetchModules = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!projectId || isNaN(parseInt(projectId))) {
      return res.status(400).json({ message: "Invalid project ID" });
    }
    const modules = await prisma.modules.findMany({
      where: { project_id: parseInt(projectId) },
      select: {
        id: true,
        title: true,
        video: true,
        description: true,
        project_id: true,
      },
    });
    return res.status(200).json({ modules });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const fetchVideos = async (req, res) => {
  try {
    const { moduleId } = req.params;
    if (!moduleId || isNaN(parseInt(moduleId))) {
      return res.status(400).json({ message: "Invalid module ID" });
    }
    const module = await prisma.modules.findUnique({
      where: { id: parseInt(moduleId) },
      select: { id: true, video: true },
    });
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }
    const videos =
      module.video && Array.isArray(module.video)
        ? module.video
            .map((video, index) => ({
              id: `${module.id}-${index}`,
              title: video.title?.trim() || `Video ${index + 1}`,
              url: video.url?.trim() || "",
              module_id: module.id,
            }))
            .filter((video) => video.url)
        : [];
    return res.status(200).json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

export const fetchdynamicQuizzes = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { moduleId } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: "projectId is required" });
    }

    const quizzes = await prisma.quizzes.findMany({
      where: {
        project_id: parseInt(projectId, 10),
        module_id: moduleId ? parseInt(moduleId, 10) : undefined,
      },
      select: {
        id: true,
        title: true,
        quiz_content: true,
        total_points: true,
        level: true,
        project_id: true,
        module_id: true,
        video_ids: true,
      },
    });

    return res.status(200).json({ data: quizzes });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return res
      .status(500)
      .json({ message: "Error fetching quizzes", error: error.message });
  }
};

export const fetchQuizById = async (req, res) => {
  try {
    const quizId = parseInt(req.params.id, 10);

    const quiz = await prisma.quizzes.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        quiz_content: true,
        total_points: true,
        level: true,
        project_id: true,
        module_id: true,
        video_ids: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    return res.status(200).json({ data: quiz });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return res
      .status(500)
      .json({ message: "Error fetching quiz", error: error.message });
  }
};

export const fetchQuizProgress = async (req, res) => {
  try {
    const { clerkId, quizId } = req.params;

    if (!clerkId || !quizId) {
      return res
        .status(400)
        .json({ message: "clerkId and quizId are required" });
    }

    const user = await prisma.users.findUnique({
      where: { clerk_id: clerkId },
      select: { quiz_results: true, quiz_history: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const quizProgress = user.quiz_results?.[quizId.toString()] || null;

    return res.status(200).json({
      data: quizProgress
        ? {
            quizId: parseInt(quizId, 10),
            maxScore: quizProgress.maxScore,
            score: quizProgress.score,
            status: quizProgress.status,
            attempts: quizProgress.attempts,
            answers: user.quiz_history?.[quizId]?.answers || [],
            completedAt: quizProgress.completedAt,
            totalPoints: 100,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching quiz progress:", error);
    return res
      .status(500)
      .json({ message: "Error fetching quiz progress", error: error.message });
  }
};

export const checkQuizEligibility = async (req, res) => {
  try {
    const { clerkId, quizId } = req.params;

    if (!clerkId || !quizId) {
      return res
        .status(400)
        .json({ message: "clerkId and quizId are required" });
    }

    const quiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(quizId, 10) },
      select: { video_ids: true, project_id: true, module_id: true },
    });

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const user = await prisma.users.findUnique({
      where: { clerk_id: clerkId },
      select: { module_completed: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const videoIds = quiz.video_ids || [];

    if (videoIds.length === 0) {
      return res.status(200).json({ eligible: true });
    }

    const moduleProgress =
      user.module_completed?.[quiz.project_id]?.[quiz.module_id] || [];
    const allVideosCompleted = videoIds.every((videoId) => {
      const isCompleted = moduleProgress.includes(String(videoId));
      return isCompleted;
    });

    return res.status(200).json({ eligible: allVideosCompleted });
  } catch (error) {
    console.error("Error checking quiz eligibility:", error);
    return res.status(500).json({
      message: "Error checking quiz eligibility",
      error: error.message,
    });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { quizId, projectId, moduleId, attemptNo, quizResult, answers } =
      req.body;

    if (
      !clerkId ||
      !quizId ||
      !projectId ||
      !moduleId ||
      !quizResult ||
      !answers
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const parsedModuleId = parseInt(moduleId, 10);
    if (isNaN(parsedModuleId)) {
      return res.status(400).json({ message: "Invalid moduleId" });
    }

    const existingQuiz = await prisma.quizzes.findUnique({
      where: { id: parseInt(quizId, 10) },
      select: { title: true, quiz_content: true, total_points: true },
    });

    if (!existingQuiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const score = parseInt(quizResult.score, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({ message: "Invalid score" });
    }
    const status = score >= 70 ? "PASSED" : "FAILED";
    const completedAt = new Date().toISOString();

    const user = await prisma.users.findUnique({
      where: { clerk_id: clerkId },
      select: { quiz_results: true, quiz_history: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentQuizResults = user.quiz_results || {};
    const quizProgress = currentQuizResults[quizId] || {
      maxScore: 0,
      score: 0,
      attempts: 0,
    };
    const maxScore = Math.max(quizProgress.maxScore || 0, score);

    const updatedQuizResults = {
      ...currentQuizResults,
      [quizId]: {
        maxScore,
        score,
        status,
        attempts: attemptNo,
        completedAt,
      },
    };

    const currentQuizHistory = user.quiz_history || {};
    const updatedQuizHistory = {
      ...currentQuizHistory,
      [quizId]: { answers },
    };

    await prisma.users.update({
      where: { clerk_id: clerkId },
      data: {
        quiz_results: updatedQuizResults,
        quiz_history: updatedQuizHistory,
      },
    });

    return res.status(200).json({
      data: {
        quizId,
        projectId,
        moduleId: parsedModuleId,
        attemptNo,
        quizResult: { maxScore, score },
        answers,
        status,
        completedAt,
      },
    });
  } catch (error) {
    console.error("Detailed error submitting quiz:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    return res.status(500).json({
      message: "Error submitting quiz",
      error: error.message,
      code: error.code,
    });
  }
};

export const completeQuiz = async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { projectId, progressPercentage } = req.body;

    if (!clerkId || !projectId || progressPercentage == null) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await prisma.users.findUnique({
      where: { clerk_id: clerkId },
      select: { progress_percentage: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const progressData = user.progress_percentage || {};
    if ((progressData[projectId]?.progress || 0) < progressPercentage) {
      progressData[projectId] = {
        progress: progressPercentage,
        emailSent: progressData[projectId]?.emailSent || false,
      };
    }

    const updatedUser = await prisma.users.update({
      where: { clerk_id: clerkId },
      data: {
        progress_percentage: progressData,
      },
    });

    return res.status(200).json({
      learningData: {
        progress_percentage: updatedUser.progress_percentage,
      },
    });
  } catch (error) {
    console.error("Error completing quiz:", error);
    return res
      .status(500)
      .json({ message: "Error completing quiz", error: error.message });
  }
};
