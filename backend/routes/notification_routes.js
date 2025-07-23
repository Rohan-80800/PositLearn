import { Router } from "express";
import {
  getUserNotifications,
  markNotificationRead,
} from "../controller/notificationController.js";

const router = Router();

router.get("/notifications",getUserNotifications);
router.post("/notifications/:notificationId/read",markNotificationRead);

export default router;
