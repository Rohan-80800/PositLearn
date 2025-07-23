  import { Router } from "express";
import multer from "multer";
import {
  create_discussion,
  fetch_discussion,
  update_discussion,
  delete_discussion,
  create_comment,
  update_comment,
  delete_comment,
  create_reply,
  update_reply,
  delete_reply,
} from "../controller/discussion_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();

const discussionImageStorage = multer.memoryStorage();
const uploadDiscussionImages = multer({
  storage: discussionImageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10
  }
}).array("images", 10);

router.post("/create", uploadDiscussionImages,requirePermission("create_discussion"), create_discussion);
router.get("/get/:id?",requirePermission("view_discussions"), fetch_discussion);
router.put("/update/:id?",uploadDiscussionImages,requirePermission("update_discussion"), update_discussion);
router.delete("/delete/:id?", requirePermission("delete_discussion"), delete_discussion);

router.post("/comments/create",  requirePermission("create_comment"), create_comment);
router.put("/comments/update/:id", requirePermission("update_comment"), update_comment);
router.delete("/comments/delete/:id",  requirePermission("delete_comment"), delete_comment);

router.post("/replies/create", requirePermission("create_reply"), create_reply);
router.put("/replies/update/:id", requirePermission("update_reply"), update_reply);
router.delete("/replies/delete/:id", requirePermission("delete_reply"), delete_reply);

export default router;
