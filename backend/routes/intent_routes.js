import {Router} from "express";
import { getIntent,createIntent,updateIntent,deleteIntent } from "../controller/intent_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();
router.get("/",requirePermission("view_intent"),getIntent);
router.post("/",requirePermission("create_intent"),createIntent);
router.put("/:intentName", requirePermission("update_intent"),updateIntent);
router.delete("/:intentName",requirePermission("delete_intent"),deleteIntent);

export default router;
