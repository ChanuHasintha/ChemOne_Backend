import express from "express";
import { submitScore, getLeaderboard, getUserScore } from "../controllers/gameController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/score", protect, submitScore);
router.get("/leaderboard/:game", protect, getLeaderboard);
router.get("/my-score/:game", protect, getUserScore);

export default router;
