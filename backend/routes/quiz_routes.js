import { Router } from "express";
import {
  generateQuiz,
  createQuiz,
  updateQuiz,
  fetchQuizzes,
  deleteQuiz,
  fetchModules,
  fetchVideos,
  fetchdynamicQuizzes,
  fetchQuizById,
  submitQuiz,
  fetchQuizProgress,
  checkQuizEligibility,
  completeQuiz
} from "../controller/quiz_controller.js";
import { requirePermission } from "../middleware.js";

const router = Router();

router.post("/generate",requirePermission("generate_quiz"), generateQuiz);
router.post("/create",requirePermission("create_quiz"), createQuiz);
router.put("/update/:id",requirePermission("update_quiz"), updateQuiz);
router.get("/",requirePermission("fetch_quiz"), fetchQuizzes);
router.delete("/delete/:id",requirePermission("delete_quiz"), deleteQuiz);
router.get("/modules/:projectId",requirePermission("fetch_project"), fetchModules);
router.get("/videos/:moduleId",requirePermission("fetch_module"), fetchVideos);

router.get(
  "/:projectId",
  requirePermission("fetchdynamic_quiz"),
  fetchdynamicQuizzes
);
router.get("/single/:id", requirePermission("fetch_quiz_id"), fetchQuizById);
router.post("/submit/:clerkId",requirePermission("submit_quiz"), submitQuiz);
router.get(
  "/progress/:clerkId/:quizId",
  requirePermission("fetch_quiz_progress"),
  fetchQuizProgress
);
router.get(
  "/eligibility/:clerkId/:quizId",
  requirePermission("check_eligibility"),
  checkQuizEligibility
);
router.post(
  "/quizzes/complete/:clerkId",
  requirePermission("complete_quiz"),
  completeQuiz
);

export default router;
