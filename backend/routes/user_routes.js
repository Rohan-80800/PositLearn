import express from "express";
import {
  createUser,
  fetchUsers,
  deleteUser,
  updateUserRole,
  getUserPerformanceByProject,
  fetchTaskPerformance
} from "../controller/user_controller.js";
import { requirePermission } from "../middleware.js";

const router = express.Router();
router.put("/create",  requirePermission("create_user"), createUser);
router.get("/get/:id?",  requirePermission("view_users"), fetchUsers);
router.post("/delete", requirePermission("delete_user"), deleteUser);
router.post("/update-role",requirePermission("role_user"), updateUserRole);
router.get("/project/:projectId",requirePermission("view_user_performance"), getUserPerformanceByProject);
router.get("/dashboard", requirePermission("view_users"), fetchTaskPerformance);

export default router;
