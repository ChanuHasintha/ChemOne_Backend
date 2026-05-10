import express from "express";
import { handleChat } from "../controllers/chatController.js";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware.js";

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many messages, please try again later",
});

const router = express.Router();
router.post("/", protect, chatLimiter, handleChat);
export default router;