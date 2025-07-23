import prisma from "../DB/db.config.js";
import { sendNotificationToUsers, sendNotificationToTeamUsers, entityUpdate   } from "../utils/notification.js";

export const team_create = async (req, res) => {
  try {
    const {
      team_name,
      description,
      is_active,
      icon,
      users,
      projects,
      team_category,
    } = req.body;
    const findTeam = await prisma.teams.findFirst({
      where: {
        team_name: {
          equals: team_name,
          mode: "insensitive",
        },
      },
    });

    if (findTeam) {
      return res.status(400).json({ message: "Team Name Already exists" });
    }
    const newTeam = await prisma.teams.create({
      data: {
        team_name,
        description,
        is_active,
        ...(icon && { team_icon: icon }),
        team_category: team_category || "",
        users: { connect: users.map((clerk_id) => ({ clerk_id })) },
        projects: { connect: projects.map((projectId) => ({ id: projectId })) },
      },
      include: { users: true, projects: true },
    });
    if (users && users.length > 0) {
      await sendNotificationToUsers(
        users,
        "New Team Assignment",
        `You have been assigned to the team: <strong>${team_name}</strong>`,
        {
          type: "assign",
        }
      );
    }
    if (projects && projects.length > 0) {
      await sendNotificationToTeamUsers(
        [newTeam.id],
        "New Projects Assigned",
        `New projects have been assigned to your team: <strong>${team_name}</strong>`,
        {
          type: "project_assign",
          projectIds: projects,
        }
      );
    }
    await entityUpdate("teams");
    return res.status(201).json({ message: "Team is created", data: newTeam });
  } catch (error) {
    return res
      .status(400)
      .json({ message: "Error in adding team", error: error.message });
  }
};

export const team_update = async (req, res) => {
  try {
    const {
      team_name,
      description,
      is_active,
      icon,
      users,
      projects,
      team_category,
    } = req.body;
    const teamId = parseInt(req.params.id, 10);
    const existingTeam = await prisma.teams.findUnique({
      where: { id: teamId },
      include: { users: true, projects: true },
    });
    if (!existingTeam) {
      return res.status(404).json({ message: "Team Not Found" });
    }
    if (team_name && team_name.trim() && team_name.trim().toLowerCase() !== existingTeam.team_name.toLowerCase()) {
      const nameExists = await prisma.teams.findFirst({
        where: {
          team_name: {
            equals: team_name.trim(),
            mode: "insensitive",
          },
          id: { not: teamId },
        },
      });

      if (nameExists) {
        return res.status(400).json({ message: "Team Name Already exists" });
      }
    }

    const newUserIds = Array.isArray(users) ? users.filter((id) => typeof id === "string" && id.trim()) : [];
    const existingUserIds = existingTeam.users.map((user) => user.clerk_id);
    const usersToAdd = newUserIds.filter((clerk_id) => !existingUserIds.includes(clerk_id));
    const usersToRemove = [...existingUserIds].filter(clerk_id => !newUserIds.includes(clerk_id));
    const newProjectIds = Array.isArray(projects)
      ? projects.reduce((acc, id) => {
          const parsed = parseInt(id, 10);
          if (!isNaN(parsed)) acc.push(parsed);
          return acc;
        }, [])
      : [];
    
    const existingProjectIds = existingTeam.projects.map(project => project.id);
    const projectsToAdd = newProjectIds.filter(id => !existingProjectIds.includes(id));
    const projectsToRemove = existingProjectIds.filter(id => !newProjectIds.includes(id));

    const updatedTeam = await prisma.teams.update({
      where: { id: teamId },
      data: {
        team_name: team_name && team_name.trim() ? team_name.trim() : existingTeam.team_name,
        description,
        is_active,
        team_icon: icon,
        team_category: team_category || existingTeam.team_category || "",
        users: { set: newUserIds.map((clerk_id) => ({ clerk_id })) },
        projects: { set: newProjectIds.map((projectId) => ({ id: projectId })) },
      },
      include: { users: true, projects: true },
    });
    if (usersToAdd.length > 0) {
      await sendNotificationToUsers(
        usersToAdd,
        "Team Assignment Update",
        `You have been added to the team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "update",
        }
      );
    }
    if (usersToRemove.length > 0) {
      await sendNotificationToUsers(
        usersToRemove,
        "Removed from Team",
        `You have been removed from the team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "update",
        }
      );
    }
    if (projectsToAdd.length > 0) {
      await sendNotificationToTeamUsers(
        [teamId],
        "New Projects Assigned",
        `New projects have been assigned to your team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "project_assign",
          projectIds: projectsToAdd,
        }
      );
    }
    if (projectsToRemove.length > 0) {
      await sendNotificationToTeamUsers(
        [teamId],
        "Projects Removed",
        `Projects have been removed from your team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "project_remove",
          projectIds: projectsToRemove,
        }
      );
    }

    await entityUpdate("teams");
    return res
      .status(200)
      .json({ message: "Team updated successfully", data: updatedTeam });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error in updating the team", error: error.message });
  }
};

export const team_delete = async (req, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const DeleteTeam = await prisma.teams.findUnique({
      where: { id: teamId },
      include: { users: true, projects: true },
    });
    if (!DeleteTeam) {
      return res.status(404).json({ message: "Team Not Found" });
    }
    const userIds = DeleteTeam.users.map((user) => user.clerk_id);
    if (userIds.length > 0) {
      await sendNotificationToUsers(
        userIds,
        "Team Deletion",
        `The team <strong> ${DeleteTeam.team_name} </strong> has been deleted, You are no longer a member.`,
        {
          type: "delete",
        }
      );
    }
        if (projectsToAdd.length > 0) {
      await sendNotificationToTeamUsers(
        [teamId],
        "New Projects Assigned",
        `New projects have been assigned to your team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "project_assign",
          projectIds: projectsToAdd,
        }
      );
    }
    if (projectsToRemove.length > 0) {
      await sendNotificationToTeamUsers(
        [teamId],
        "Projects Removed",
        `Projects have been removed from your team: <strong>${team_name || existingTeam.team_name}</strong>`,
        {
          type: "project_remove",
          projectIds: projectsToRemove,
        }
      );
    }
    await prisma.teams.update({
      where: { id: teamId },
      data: {
        projects: { set: [] },

        users: { set: [] },
      },
    });
    await prisma.teams.delete({
      where: { id: teamId },
    });
    await entityUpdate("teams");
    return res.status(200).json({ message: "Team is deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error in deleting the team", error: error.message });
  }
};

export const fetch_teams = async (req, res) => {
  try {
    const team_data = await prisma.teams.findMany({
      include: {
        users: {
          select: {
            clerk_id: true,
            first_name: true,
            last_name: true,
            user_image: true,
          },
        },
        projects: true,
        _count: { select: { projects: true } },
      },
    });

    if (team_data.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.status(200).json({ data: team_data });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error in Fetching the team", error: error.message });
  }
};

export const fetch_team_by_ID = async (req, res) => {
  try {
    const team_data = await prisma.teams.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { users: true, projects: true },
    });
    if (!team_data) {
      res.status(404).json({ message: "Team not found" });
    } else {
      res.status(200).json({ data: team_data });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error in Fetching the team", error: error.message });
  }
};
