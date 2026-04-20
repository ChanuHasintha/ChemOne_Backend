import express from "express";
import { 
  registerUser, 
  sendSignupOTP,
  loginUser, 
  forgotPassword, 
  resetPassword, 
  getUserProfile, 
  updateUserProfile, 
  getAllStudents,
  deleteStudent,
  toggleBlockStudent 
} from "../controllers/authController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Send Signup OTP
router.post("/send-signup-otp", sendSignupOTP);

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

// Delete Student (Admin Only)
router.delete("/students/:id", protect, adminOnly, deleteStudent);

// Toggle Block Student (Admin Only)
router.patch("/students/:id/block", protect, adminOnly, toggleBlockStudent);

export default router;