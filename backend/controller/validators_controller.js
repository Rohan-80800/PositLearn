import prisma from "../DB/db.config.js";
import { entityUpdate } from "../utils/notification.js";
export const getAllValidators = async (req, res) => {
  try {
    const { id } = req.params;

    if (id) {
      try {
        const validator = await prisma.validators.findFirstOrThrow({
          where: { id: Number(id) },
          include: { projects: true },
        });

        return res.status(200).json({ status: 200, data: validator });
      } catch {
        return res.status(404).json({ status: 404, message: "Validator not found" });
      }
    }

    const validators = await prisma.validators.findMany({
      include: { projects: true },
    });

    return res.status(200).json({ status: 200, data: validators });
  } catch (error) {
    console.error("Error fetching validators:", error);
    return res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};

export const createValidator = async (req, res) => {
  try {
    const { name, designation, signature, projectIds } = req.body;

    const occupiedProjects = await prisma.projects.findMany({
      where: {
        id: { in: projectIds },
        validator_id: { not: null }
      }
    });

    if (occupiedProjects.length > 0) {
      const projectNames = occupiedProjects.map(p => p.project_name).join(', ');
      return res.status(400).json({
        status: 400,
        message: `Projects already have validators: ${projectNames}`
      });
    }

    const validator = await prisma.validators.create({
      data: {
        name,
        designation,
        signature,
        projects: {
          connect: projectIds.map(id => ({ id }))
        }
      },
      include: { projects: true }
    });
    await entityUpdate("validators");

    return res.status(200).json({
      status: 200,
      message: "Validator created successfully",
      data: validator
    });
  } catch (error) {
    console.error("Error creating validator:", error);
    return res.status(400).json({ status: 400, message: error.message });
  }
};

export const updateValidator = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, signature, projectIds = [] } = req.body;
    const projectIdsArray = projectIds.map(project => {
      return typeof project === "object" ? project.value : project;
    });
    const currentValidator = await prisma.validators.findUnique({
      where: { id: Number(id) },
      include: { projects: true },
    });
    if (!currentValidator) {
      return res.status(404).json({
        status: 404,
        message: "Validator not found",
      });
    }
    const currentProjectIds = currentValidator.projects.map((p) => p.id);
    const isProjectChanged =
      projectIdsArray.length !== currentProjectIds.length ||
      !projectIdsArray.every((id) => currentProjectIds.includes(id));

    if (isProjectChanged) {
      const occupiedProjects = await prisma.projects.findMany({
        where: {
          id: { in: projectIdsArray },
          validator_id: { not: Number(id) },
        },
      });

      if (occupiedProjects.length > 0) {
        const projectNames = occupiedProjects
          .map((p) => p.project_name)
          .join(", ");
        return res.status(400).json({
          status: 400,
          message: `Projects already have validators: ${projectNames}`,
        });
      }
    }

    const updateData = {
      name,
      designation,
      signature,
    };

    if (isProjectChanged) {
      updateData.projects = {
        set: projectIdsArray.map((id) => ({ id })),
      };
    }

    const updatedValidator = await prisma.validators.update({
      where: { id: Number(id) },
      data: updateData,
      include: { projects: true },
    });

    await entityUpdate("validators");
    return res.status(200).json({
      status: 200,
      message: "Validator updated successfully",
      data: updatedValidator,
    });
  } catch (error) {
    console.error("Error updating validator:", error);
    return res.status(400).json({ status: 400, message: error.message });
  }
};

export const deleteValidator = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.validators.delete({
      where: { id: Number(id) }
    });
    await entityUpdate("validators");

    return res.status(200).json({
      status: 200,
      message: "Validator deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting validator:", error);
    return res.status(500).json({ status: 500, message: "Internal Server Error" });
  }
};
