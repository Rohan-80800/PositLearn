import { Router } from "express";
import multer from "multer";

import {
  create_badge,
  delete_badge,
  get_all_badges,
  get_badges,
  update_badge,
  get_project_badge_status,
  generate_badges
} from "../controller/badges_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/create_badges", upload.single("image"),  requirePermission("create_badge"), create_badge);
router.get("/get_badges/:clerk_id", requirePermission("view_badges"), get_badges);
router.get("/",requirePermission("view_all_badges"), get_all_badges);
router.delete("/delete/:id",requirePermission("delete_badges"), delete_badge);
router.put("/update/:id", upload.single("image"),requirePermission("update_badges"),update_badge);
router.post("/generate-badge",requirePermission("create_badge"),generate_badges)
router.get("/get_latest/:clerk_id/:project_id", get_project_badge_status);
export default router;
