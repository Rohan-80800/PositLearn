import { Router } from "express";
import multer from "multer";
import {
  createProject,
  delete_project,
  get_user_projects,
  updateProject,
  get_all_projects,
  getProjectById,
  get_dashboard_stats,
} from "../controller/project_controller.js";
import { requirePermission } from "../middleware.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

let storage;
if (process.env.ENV === "prod") {
  storage = multer.memoryStorage();
} else {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'projects', 'logo');
  try {
    await fs.promises.mkdir(uploadDir, { recursive: true });
  } catch (err) {
    console.error('Error creating upload directory:', err);
  }
  storage = multer.memoryStorage();
}

const logoUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "logo_url" && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed for logos"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/create", logoUpload.single("logo_url"), requirePermission("create_project"), createProject);
router.put("/update/:id", logoUpload.single("logo_url"), requirePermission("update_project"), updateProject);
router.delete("/delete/:id", requirePermission("delete_project"), delete_project);
router.get("/", requirePermission("view_projects"), get_all_projects);
router.get("/get/:id", requirePermission("view_projects"), getProjectById);
router.get("/user_project", requirePermission("view_projects"), get_user_projects);
router.get("/stats", requirePermission("view_stats"), get_dashboard_stats);

export default router;
