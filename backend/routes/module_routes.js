import  { Router } from "express";
import multer from "multer";
import {
  createmodule,
  get_project_modules,
  deleteModule,
  uploadFile,
  updateModule,
} from "../controller/module_controller.js";
import { requirePermission } from "../middleware.js";
import dotenv from "dotenv";


dotenv.config();

const router = Router();

let upload;
if (process.env.ENV === "prod") {
  upload = multer({
    storage: multer.memoryStorage(),     fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF and DOC files are allowed"), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
  });
} else {
  upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF and DOC files are allowed"), false);
      }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
  });
}

router.post("/upload", upload.single("file"),requirePermission("upload_file"), uploadFile);
router.post("/:projectId",requirePermission("create_module"), createmodule);
router.get("/getmodules/:projectId",requirePermission("view_modules"), get_project_modules);
router.delete("/delete/:projectId/:moduleId",requirePermission("delete_module"), deleteModule);
router.put("/update/:projectId/:moduleId",requirePermission("update_module"), updateModule);

export default router;
