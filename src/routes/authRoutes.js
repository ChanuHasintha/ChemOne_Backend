import express from "express";
import { registerUser, loginUser, forgotPassword, resetPassword, getUserProfile, updateUserProfile, getAllStudents } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Forgot Password (Send OTP)
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

// Get Profile
router.get("/me", protect, getUserProfile);

// Update Profile
router.put("/me", protect, updateUserProfile);

// Get All Students
router.get("/students", protect, getAllStudents);

export default router;