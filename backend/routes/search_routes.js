import { Router } from "express";
import { globalSearch, searchProjects, searchDiscussions, searchLearningContent } from "../controller/search_controller.js";

const router = Router();

router.get("/api/search", globalSearch);
router.get("/api/search/projects", searchProjects);
router.get("/api/search/discussions", searchDiscussions);
router.get("/api/search/learning", searchLearningContent);

export default router;
