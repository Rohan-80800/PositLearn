import express from "express";
import {
  getUserModules,
  completeVideo,
  updateVideoProgress,
  notebookData,
  markBadgeAsNotified,
} from "../controller/video_controller.js";
import { requirePermission } from "../middleware.js";

const router = express.Router();
router.get("/modules/:clerk_id/:project_id", requirePermission("view_modules"), getUserModules);
router.post("/completed/:clerk_id", requirePermission("complete_video"), completeVideo);
router.put("/progress/:clerk_id", requirePermission("update_progress"), updateVideoProgress)
router.post("/notebook/:clerk_id", requirePermission("submit_notebook"), notebookData);
router.post("/mark_notified/:clerk_id",requirePermission("mark_badge_notified"), markBadgeAsNotified);

export default router;
