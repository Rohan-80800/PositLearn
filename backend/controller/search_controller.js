import { Client } from "typesense";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();

const client = new Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "localhost",
      port: process.env.TYPESENSE_PORT || "8108",
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 5,
});

function validateSearchQuery(query) {
  if (!query || typeof query !== "string") {
    throw new Error("Invalid search query");
  }
  return query.trim();
}

export async function searchProjects(req, res) {
  try {
    const query = validateSearchQuery(req.query.q);
    const userId = req.user?.id?.toString();
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";

    const searchParameters = {
      q: query,
      query_by: "project_name,description",
      fuzzy: "true", 
      prefix: "true",
      per_page: parseInt(req.query.limit) || 10,
      page: parseInt(req.query.page) || 1,
      sort_by: req.query.sort || "_text_match:desc,updated_at:desc",
      filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
    };

    const results = await client
      .collections("projects")
      .documents()
      .search(searchParameters);

    res.json({
      success: true,
      query,
      results: results.hits,
      meta: {
        found: results.found,
        page: results.page,
        total_pages: Math.ceil(results.found / searchParameters.per_page),
      }
    });

  } catch (error) {
    console.error("Typesense search error:", error);
    res.status(400).json({ 
      success: false,
      error: error.message || "Failed to perform search",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}

export async function searchDiscussions(req, res) {
  try {
    const query = validateSearchQuery(req.query.q);
    const userId = req.user?.id?.toString();
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";

    const searchParameters = {
      q: query,
      query_by: "title,description",
      fuzzy: "true",
      prefix: "true", 
      per_page: parseInt(req.query.limit) || 10,
      page: parseInt(req.query.page) || 1,
      sort_by: req.query.sort || "_text_match:desc,created_at:desc",
      filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
    };

    const results = await client
      .collections("discussions")
      .documents()
      .search(searchParameters);

    res.json({
      success: true,
      query,
      results: results.hits,
      meta: {
        found: results.found,
        page: results.page,
        total_pages: Math.ceil(results.found / searchParameters.per_page),
      }
    });

  } catch (error) {
    console.error("Typesense discussions search error:", error);
    res.status(400).json({ 
      success: false,
      error: error.message || "Failed to perform discussions search",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}

export async function searchLearningContent(req, res) {
  try {
    const query = validateSearchQuery(req.query.q);
    const userId = req.user?.id?.toString();
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";

    if (isAdmin) {
      return res.json({
        success: true,
        query,
        results: [],
        meta: {
          found: 0,
          page: 1,
          total_pages: 0,
        }
      });
    }

    const searchParameters = {
      q: query,
      query_by: "title,content",
      fuzzy: "true",
      prefix: "true",
      per_page: parseInt(req.query.limit) || 10,
      page: parseInt(req.query.page) || 1,
      sort_by: req.query.sort || "_text_match:desc",
      filter_by: req.query.category ? `category:${req.query.category}` : "",
    };

    const results = await client
      .collections("learning_content")
      .documents()
      .search(searchParameters);

    res.json({
      success: true,
      query,
      results: results.hits,
      meta: {
        found: results.found,
        page: results.page,
        total_pages: Math.ceil(results.found / searchParameters.per_page),
      }
    });

  } catch (error) {
    console.error("Typesense learning content search error:", error);
    res.status(400).json({ 
      success: false,
      error: error.message || "Failed to perform learning content search",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
}

export async function globalSearch(req, res) {
  try {
    const query = validateSearchQuery(req.query.q);
    const userId = req.user?.id?.toString();
    const user = await prisma.users.findUnique({
      where: { clerk_id: userId },
      select: { role: true },
    });
    const isAdmin = user?.role === "ADMIN";

    const searchRequests = {
      searches: [
        {
          collection: "projects",
          q: query,
          query_by: "project_name,description",
          per_page: 5,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        },
        {
          collection: "discussions",
          q: query,
          query_by: "title,description",
          per_page: 5,
          filter_by: isAdmin ? "" : (userId ? `team_user_ids:${userId}` : ""),
        }
      ]
    };

    if (!isAdmin && userId) {
      searchRequests.searches.push({
        collection: "learning_content",
        q: query,
        query_by: "title,content",
        per_page: 5,
      });
    };

    const results = await client.multiSearch.perform(searchRequests);

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
      }))
    };
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
    console.error("Global search error:", error);
    res.status(400).json({ 
      success: false,
      error: error.message || "Failed to perform global search",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
