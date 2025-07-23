import express from "express";
import {
  getAllValidators,
  createValidator,
  updateValidator,
  deleteValidator
} from "../controller/validators_controller.js";
import { requirePermission } from "../middleware.js";

const router = express.Router();

router.get("/get/:id?", requirePermission("view_validators"), getAllValidators);
router.post("/create", requirePermission("create_validator"), createValidator);
router.put("/update/:id", requirePermission("update_validator"), updateValidator);
router.delete("/delete/:id", requirePermission("delete_validator"), deleteValidator);

export default router;
