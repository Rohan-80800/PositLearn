import prisma from "../DB/db.config.js";

export const getUserDashboardData = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      include: {
        teams: {
          select: {
            team_name: true,
            team_category: true,
            projects: {
              select: {
                id: true,
                project_name: true,
                progress: true,
                logo_url: true,
                modules: {
                  select: {
                    id: true,
                    title: true
                  }
                },
                badges: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        },
        discussions: true,
        comments: true,
        replies: true
      }
    });


    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const projectProgress = Object.entries(user.progress_percentage || {}).map(
      ([projectId, progress]) => ({
        projectId: parseInt(projectId),
        progress: progress.progress || 0
      })
    );

    const projectCompleted = projectProgress.filter(p => p.progress >= 100).length;

    const moduleCompletedJson = user.module_completed || {};
    const completedModulesSet = new Set();
    for (const projectId in moduleCompletedJson) {
      const modules = moduleCompletedJson[projectId];
      for (const moduleId in modules) {
        completedModulesSet.add(`${projectId}-${moduleId}`);
      }
    }

    const badgesEarned = Array.isArray(user.badges) ? user.badges.length : 0;

    const currentLearning = user.current_learning || {};
    const currentProjectId = currentLearning.projectId ? parseInt(currentLearning.projectId) : null;

    const assignedTeams = user.teams.map(team => team.team_name).join(' / ');

    const allProjectsMap = new Map();
    user.teams.forEach(team => {
      team.projects.forEach(project => {
        if (!allProjectsMap.has(project.id)) {
          allProjectsMap.set(project.id, {
            id: project.id,
            project_name: project.project_name,
            progress: project.progress,
            logo_url: project.logo_url,
            teams: [{ team_name: team.team_name, team_category: team.team_category }],
            totalModules: project.modules.length,
            modules: project.modules,
            badges: project.badges || []
          });
        } else {
          const existingProject = allProjectsMap.get(project.id);
          existingProject.teams.push({ team_name: team.team_name, team_category: team.team_category });
        }
      });
    });

    const projects = Array.from(allProjectsMap.values());
    const totalModules = projects.reduce((acc, project) => acc + (project.totalModules || 0), 0);
const totalPossibleBadges = projects.reduce((acc, project) => {
  return acc + (project.badges?.length || 0);
}, 0);

    const response = {
      status: 200,
      data: {
        clerk_id: user.clerk_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        image: user.user_image,
        role: user.role,
        totalTime: user.learning_time || 0,
        discussions: user.discussions.length,
        comments: user.comments.length,
        replies: user.replies.length,
        projectsCompleted: projectCompleted,
        projectProgress,
        badgesEarned,
        totalCompletedModules: completedModulesSet.size,
        current_project_id: currentProjectId,
        assignedTeams,
        totalModules,
        totalPossibleBadges,
        start_date: user.start_date || {},
        end_date: user.end_date || {},
        teams: user.teams,
        projects
      }
    };

    return res.json(response);
  } catch (error) {
    console.error("Error fetching user full dashboard data:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


export const getTeamProgressData = async (req, res) => {
  try {
    const { projectId } = req.params;

    const projectTeams = await prisma.teams.findMany({
      where: {
        projects: {
          some: { id: parseInt(projectId) }
        }
      },
      include: {
        users: {
          select: {
            clerk_id: true,
            first_name: true,
            last_name: true,
            progress_percentage: true
          }
        },
        projects: {
          select: {
            id: true,
            project_name: true
          }
        }
      }
    });

    if (!projectTeams.length) {
      return res.status(404).json({ message: "No teams found for this project" });
    }

    const teamProgress = projectTeams.flatMap(team =>
      team.users.map(user => {
        const projectProgress = user.progress_percentage || {};
        const progress = projectProgress[projectId] || 0;

        return {
          userId: user.clerk_id,
          userName: `${user.first_name} ${user.last_name}`,
          teamName: team.team_name,
          progress: progress,
          projectId: parseInt(projectId),
          projectName: team.projects.find(proj => proj.id === parseInt(projectId))?.project_name
        };
      })
    );

    return res.json({
      status: 200,
      data: teamProgress
    });
  } catch (error) {
    console.error("Error fetching team progress data:", error);
    return res.status(500).json({
      status: 500,
      message: "Internal Server Error",
      error: error.message
    });
  }
};


