import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import typesenseClient from "./typesenseServer.js";

const prisma = new PrismaClient();

async function createProjectsCollection() {
  try {
    await typesenseClient.collections("projects").delete().catch(() => {});
    const schema = {
      name: "projects",
      fields: [
        { name: "id", type: "string" },
        { name: "project_name", type: "string"},
        { name: "description", type: "string"},
        { name: "team_user_ids", type: "string[]", facet: true },
      ],
    };
   
    await typesenseClient.collections().create(schema);
  } catch (error) {
    console.error("Error creating projects collection:", error.message);
    throw error;
  }
}

async function createDiscussionsCollection() {
  try {
    await typesenseClient.collections("discussions").delete().catch(() => {});
    const schema = {
      name: "discussions",
      fields: [
        { name: "id", type: "string" },
        { name: "title", type: "string", weight: 3, index: true },
        { name: "project_id", type: "string" },
        { name: "description", type: "string", weight: 1, index: true },
        { name: "team_user_ids", type: "string[]", facet: true },
      ],
    };
    
    await typesenseClient.collections().create(schema);
  } catch (error) {
    console.error("Error creating discussions collection:", error.message);
    throw error;
  }
}

async function createLearningContentCollection() {
  try {
    await typesenseClient.collections("learning_content").delete().catch(() => {});
    const schema = {
      name: "learning_content",
      fields: [
        { name: "id", type: "string" },
        { name: "title", type: "string", weight: 3 },
        { name: "content", type: "string" },
        { name: "category", type: "string", facet: true },
        { name: "slug", type: "string" },
      ],
    };

    await typesenseClient.collections().create(schema);
  } catch (error) {
    console.error("Error creating learning content collection:", error.message);
    throw error;
  }
}

async function indexProjects() {
  try {
    const projects = await prisma.projects.findMany({
      select: {
        id: true,
        project_name: true,
        description: true,
        teams: {
          select: {
            users: {
              select: { clerk_id: true },
            },
          }
        }
      }
    });

    if (!projects?.length) {
      console.log("No projects found to index");
      return;
    }

    const documents = projects.map(project => ({
      id: project.id.toString(),
      project_name: project.project_name,
      description: typeof project.description === 'object' 
        ? (project.description?.content || "").replace(/<[^>]*>/g, '')
        : (project.description || "").replace(/<[^>]*>/g, ''),
      team_user_ids: project.teams.flatMap(team => team.users.map(user => user.clerk_id)),
    }));

    await typesenseClient
      .collections("projects")
      .documents()
      .import(documents, { action: "upsert" });

  } catch (error) {
    console.error("Error indexing projects:", error.message);
    if (error.importResults) {
      console.error("Import results:", error.importResults);
    }
    throw error;
  }
}

async function indexDiscussions() {
  try {
    const discussions = await prisma.discussions.findMany({
      select: {
        id: true,
        title: true,
        project_id: true,
        description: true,
        project: {
          select: {
            teams: {
              select: {
                users: {
                  select: { clerk_id: true },
                },
              }
            }
          }
        }
      },
    });

    if (!discussions?.length) {
      console.log("No discussions found to index");
      return;
    }

    const documents = discussions.map(discussion => ({
      id: discussion.id.toString(),
      title: discussion.title,
      project_id: discussion.project_id?.toString() || "",
      description: (discussion.description || "").replace(/<[^>]*>/g, ''),
      team_user_ids: discussion.project?.teams.flatMap(team => team.users.map(user => user.clerk_id)) || [],
    }));

    await typesenseClient
      .collections("discussions")
      .documents()
      .import(documents, { action: "upsert" });
  } catch (error) {
    console.error("Error indexing discussions:", error.message);
    throw error;
  }
}

async function indexLearningContent() {
  try {
    const learningData = JSON.parse(
      await readFile(
        new URL("../front/public/git_github.json", import.meta.url),
        "utf-8"
      )
    );

    if (!learningData?.sections?.length) {
      console.log("No learning content found to index");
      return;
    }

    const documents = learningData.sections.map((section, index) => ({
      id: index.toString(),
      title: section.title,
      content: JSON.stringify(section.content),
      category: "git_github",
      slug: section.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    }));

    await typesenseClient
      .collections("learning_content")
      .documents()
      .import(documents, { action: "upsert" });
  } catch (error) {
    console.error("Error indexing learning content:", error.message);
    if (error.importResults) {
      console.error("Import results:", error.importResults);
    }
    throw error;
  }
}

async function globalSearch(req, res) {
  try {
    const query = validateSearchQuery(req.query.q);
    const userId = req.user?.id?.toString();
    const isAdmin = req.user?.role === "org:admin";

    const searchRequests = {
      searches: [
        {
          collection: "projects",
          q: query,
          query_by: "project_name,description",
          highlight_fields: "project_name,description",
          highlight_full_fields: "project_name,description",
          sort_by: "_text_match:desc",
          per_page: 10,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        },
        {
          collection: "discussions",
          q: query,
          query_by: "title,description",
          highlight_fields: "title,description",
          highlight_full_fields: "title,description",
          sort_by: "_text_match:desc",
          per_page: 10,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        }
      ]
    };

    if (!isAdmin && userId) {
      searchRequests.searches.push({
        collection: "learning_content",
        q: query,
        query_by: "title",
        highlight_fields: "title",
        highlight_full_fields: "title",
        sort_by: "_text_match:desc",
        per_page: 10,
      });
    }

    const results = await typesenseClient.multiSearch.perform(searchRequests);

    const formattedResults = {
      projects: results.results[0].hits.map(hit => ({
        ...hit.document,
        type: "project",
        highlights: hit.highlight
      })),
      discussions: results.results[1].hits.map(hit => ({
        ...hit.document,
        type: "discussion",
        highlights: hit.highlight
      })),
    };

    if (!isAdmin && userId) {
      formattedResults.learning_content = results.results[2].hits.map(hit => ({
        ...hit.document,
        type: "learning_content",
        highlights: hit.highlight
      }));
    }

    res.json({
      success: true,
      query,
      results: formattedResults,
      meta: {
        projects_found: results.results[0].found,
        discussions_found: results.results[1].found,
        learning_content_found: isAdmin ? 0 : (results.results[2]?.found || 0),
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || "Failed to perform global search",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}


async function updateProjectIndex(projectId) {
  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        project_name: true,
        description: true,
        teams: {
          select: {
            users: {
              select: { clerk_id: true },
            },
          }
        }
      },
    });

    if (!project) {
      console.log(`Project with ID ${projectId} not found`);
      return;
    }

    const document = {
      id: project.id.toString(),
      project_name: project.project_name,
      description: typeof project.description === 'object' 
        ? (project.description?.content || "").replace(/<[^>]*>/g, '')
        : (project.description || "").replace(/<[^>]*>/g, ''),
      team_user_ids: project.teams.flatMap(team => team.users.map(user => user.clerk_id)),
    };

    await typesenseClient
      .collections("projects")
      .documents()
      .upsert(document);

  } catch (error) {
    console.error("Error updating project index:", error.message);
    throw error;
  }
}

async function updateDiscussionIndex(discussionId) {
  try {
    const discussion = await prisma.discussions.findUnique({
      where: { id: discussionId },
      select: {
        id: true,
        title: true,
        project_id: true,
        description: true,
        project: {
          select: {
            teams: {
              select: {
                users: {
                  select: { clerk_id: true },
                },
              }
            }
          }
        }
      },
    });

    if (!discussion) {
      console.log(`Discussion with ID ${discussionId} not found`);
      return;
    }

    const document = {
      id: discussion.id.toString(),
      title: discussion.title,
      project_id: discussion.project_id?.toString() || "",
      description: (discussion.description || "").replace(/<[^>]*>/g, ''),
      team_user_ids: discussion.project?.teams.flatMap(team => team.users.map(user => user.clerk_id)) || [],
    };

    await typesenseClient
      .collections("discussions")
      .documents()
      .upsert(document);
  } catch (error) {
    console.error("Error updating discussion index:", error.message);
    throw error;
  }
}

async function main() {
  try {
    await createProjectsCollection();
    await createDiscussionsCollection();
    await createLearningContentCollection();
    await indexProjects();
    await indexDiscussions();
    await indexLearningContent();
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === new URL(import.meta.url).href) {
  main().catch(console.error);
}
export {
  createProjectsCollection,
  createDiscussionsCollection,
  createLearningContentCollection,
  indexLearningContent,
  indexProjects,
  indexDiscussions,
  globalSearch,
  main,
  updateProjectIndex,
  updateDiscussionIndex
};
