import { Router } from "express";
import {
  getCheats,
  createCheat,
  updateCheat,
  deleteCheat,
} from "../controller/cheat_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();

router.get("/", requirePermission("view_cheet"),getCheats);
router.post("/", requirePermission("create_cheet"),createCheat);
router.put("/:id",requirePermission("update_cheet"), updateCheat);
router.delete("/:id",requirePermission("delete_cheet"),deleteCheat);

export default router;
