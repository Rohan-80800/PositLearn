import express from 'express';
import {
  getUserDashboardData,
  getTeamProgressData
} from '../controller/user_admin_controller.js';
import { requirePermission } from "../middleware.js";


const router = express.Router();

router.get('/dashboard/:userId',requirePermission("get_user_dashboard"), getUserDashboardData);
router.get('/team-progress/:projectId',requirePermission("team_wise_progress"), getTeamProgressData);

export default router;
