import { Router } from "express";
import {
  team_create,
  team_update,
  team_delete,
  fetch_teams,
  fetch_team_by_ID,
} from "../controller/team_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();

router.post("/create", requirePermission("create_team"), team_create);
router.put("/update/:id", requirePermission("update_team"), team_update);
router.delete("/delete/:id", requirePermission("delete_team"), team_delete);
router.get("/", requirePermission("view_teams"), fetch_teams);
router.get("/:id", requirePermission("view_teams"), fetch_team_by_ID);

export default router;
