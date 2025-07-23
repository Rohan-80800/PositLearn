import { Router } from "express";
import project_routes from "./project_routes.js";
import team_routes from "./team_routes.js";
import module_routes from "./module_routes.js";
import user_routes from "./user_routes.js";
import discussion_routes from "./discussion_routes.js";
import badges_routes from "./badges_routes.js";
import githubAuthRoutes from "./githubAuth.js";
import githubFilesRoutes from "./githubFiles.js";
import video_routes from "./video_routes.js";
import search_routes from "./search_routes.js";
import quiz_routes from "./quiz_routes.js";
import validatorRoutes from './validator_routes.js';
import notificationRoutes from "./notification_routes.js";
import cheatsRoutes from "./cheats_routes.js";
import intentRoutes from "./intent_routes.js";
import certificateRoutes from "./certificate_routes.js";
import user_admin_routes from "./user_admin_routes.js"

const router = Router();

router.use("/api/user", user_routes);
router.use("/api/discussion", discussion_routes);
router.use("/api/projects", project_routes);
router.use("/api/teams", team_routes);
router.use("/api/modules", module_routes);
router.use("/api/badges", badges_routes);
router.use("/auth/github", githubAuthRoutes);
router.use("/api/github", githubFilesRoutes);
router.use("/api/video", video_routes);
router.use("/api/quizzes", quiz_routes);
router.use("/api/validators", validatorRoutes);
router.use("/api/intents", intentRoutes);
router.use("/", search_routes);
router.use("/api", notificationRoutes);
router.use("/api/cheats", cheatsRoutes);
router.use("/api/certificate", certificateRoutes);
router.use("/api/useradmin",user_admin_routes);

export default router;
