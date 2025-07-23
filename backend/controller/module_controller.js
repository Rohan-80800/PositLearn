import prisma from "../DB/db.config.js";
import dotenv from "dotenv";
import { uploadToStorage,deleteFromStorage } from "./s3_controller.js";
import { sendNotificationToTeamUsers,entityUpdate } from "../utils/notification.js";

dotenv.config();
const isProd = process.env.ENV === "prod";

export const createmodule = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const { title, description, video, file } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Module title is required",
      });
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: { teams: { select: { id: true } } },
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    let parsedVideo = [];
    if (video && video.trim() !== "") {
      try {
        parsedVideo = JSON.parse(video);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in video field",
          details: parseError.message,
        });
      }
    }

    let parsedFile = [];
    if (file && file.trim() !== "") {
      try {
        parsedFile = JSON.parse(file);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in file field",
          details: parseError.message,
        });
      }
    }

    const moduleData = {
      title: title.trim(),
      description: description || "",
      video: parsedVideo,
      file: parsedFile,
      project: { connect: { id: projectId } },
    };
    const newModule = await prisma.modules.create({
      data: moduleData,
    });

    await entityUpdate("modules");
    return res.status(201).json({
      success: true,
      message: "Module created successfully",
      module: newModule,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error in creating module",
      error: error.message,
    });
  }
};

export const updateModule = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const moduleId = parseInt(req.params.moduleId, 10);
    const { title, description, video, file } = req.body;

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: { teams: { select: { id: true } } },
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const existingModule = await prisma.modules.findFirst({
      where: {
        id: moduleId,
        project_id: projectId
      },
    });
    if (!existingModule) {
      return res.status(404).json({
        success: false,
        message: "Module not found",
      });
    }

    let parsedVideo = existingModule.video;
    if (video && typeof video === "string" && video.trim() !== "") {
      try {
        parsedVideo = JSON.parse(video);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in video field",
          details: parseError.message,
        });
      }
    }

    let parsedFile = existingModule.file;
    let filesToDelete = [];

    if (file && typeof file === "string" && file.trim() !== "") {
      try {
        const newFiles = JSON.parse(file);

        if (existingModule.file && Array.isArray(existingModule.file)) {
          filesToDelete = existingModule.file.filter(existingFile =>
            !newFiles.some(newFile => newFile.url === existingFile.url)
          );
        }

        parsedFile = newFiles;
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          message: "Invalid JSON in file field",
          details: parseError.message,
        });
      }
    }

    if (filesToDelete.length > 0) {
      await Promise.all(
        filesToDelete.map(async (file) => {
          if (file?.url) {
            try {
              await deleteFromStorage(file.url);
            } catch (error) {
              console.warn(`Failed to delete file: ${file.url}`, error);
            }
          }
        })
      );
    }

    const updatedModule = await prisma.modules.update({
      where: { id: moduleId },
      data: {
        title: title ? title.trim() : existingModule.title,
        description: description !== undefined ? description : existingModule.description,
        video: parsedVideo,
        file: parsedFile,
      },
    });

    const teamIds = project.teams.map((team) => team.id);
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Module Updated",
        `The module <b>${updatedModule.title}</b> in the project <b>${project.project_name}</b> has been updated.`,
        { type: "update", project_id: project.id }
      );
    }
    await entityUpdate("modules");

    return res.status(200).json({
      success: true,
      message: "Module updated successfully",
      module: updatedModule,
    });

  } catch (error) {
    console.error("Error updating module:", error);
    return res.status(500).json({
      success: false,
      message: "Error in updating module",
      details: error.message,
    });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);
    const moduleId = parseInt(req.params.moduleId, 10);

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: { teams: { select: { id: true } } },
    });
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    const module = await prisma.modules.findUnique({
      where: { id: moduleId },
      select: { title: true, file: true }
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "Module not found"
      });
    }

    const teamIds = project.teams.map((team) => team.id);
    if (teamIds.length > 0) {
      await sendNotificationToTeamUsers(
        teamIds,
        "Module Deleted",
        `The module ${module.title} has been deleted from the project ${project.project_name}.`,
        { type: "delete", project_id: project.id }
      );
    }

    if (module.file?.length > 0) {
      await Promise.all(
        module.file
          .filter(file => file?.url)
          .map(async file => {
            try {
              await deleteFromStorage(file.url);
            } catch (error) {
              console.warn(`Failed to delete file: ${file.url}`, error);
            }
          })
      );
    }

    await prisma.modules.delete({
      where: { id: moduleId },
    });
    await entityUpdate("modules");

    return res.status(200).json({
      success: true,
      message: "Module and associated files deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting module:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let fileUrl;

    if (isProd) {
      fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname,"module-files");
    } else {
      fileUrl = await uploadToStorage(req.file.buffer, req.file.originalname,"module-files");
    }

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      url: fileUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error in uploading file",
      details: error.message,
    });
  }
};

export const get_project_modules = async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId, 10);

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const modules = await prisma.modules.findMany({
      where: { project_id: projectId },
    });

    if (!isProd) {
      modules.forEach(module => {
        if (module.file && Array.isArray(module.file)) {
          module.file = module.file.map(file => {
            if (file.url) {
              return {
                ...file,
                url: `/uploads/${file.url}`
              };
            }
            return file;
          });
        }
      });
    }

    res.status(200).json({ success: true, modules });
  } catch {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
