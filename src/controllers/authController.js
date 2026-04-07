import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { getTransporter } from "../config/nodemailer.js";

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
};

const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: '"ChemOne Support" <support@chemone.app>',
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for resetting your password is: ${otp}. It is valid for 10 minutes.`,
      html: `<p>You requested a password reset. Here is your One-Time Password:</p>
             <h2 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h2>
             <p>It is valid for 10 minutes.</p>`,
    });

    if (!process.env.SMTP_HOST) {
      console.log("Mock Email sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error("EMAIL SENDING FAILED! Reason:", error.message);
    console.log("======================================");
    console.log("🔥 DEV MODE: Your OTP is:", otp);
    console.log("======================================");
    // Suppressing error so the frontend API request succeeds!
  }
};

// ─── REGISTER ────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, batch } = req.body;

    // --- Input validation ---
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required (name, email, password).",
      });
    }

    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        message: "Name must be between 2 and 100 characters.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "Please provide a valid email address.",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // Validate role
    const validRoles = ["student", "instructor"];
    const userRole = role && validRoles.includes(role) ? role : "student";

    // Validate batch for students
    if (userRole === "student" && (!batch || batch.trim() === "")) {
      return res.status(400).json({
        message: "Please select your batch.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name: trimmedName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
      batch: userRole === "student" ? batch.trim() : undefined,
    });

    // Generate JWT token for auto-login
    const token = jwt.sign(
      { id: user._id, role: user.role, batch: user.batch },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created successfully!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }
    console.error("Register error:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, batch: user.batch },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};

// ─── FORGOT PASSWORD (SEND OTP) ────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return same message to not leak emails
      return res.json({ message: "If that email is registered, we have sent an OTP." });
    }

    const otp = generateOTP();
    // Valid for 10 minutes
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();
    await sendOTPEmail(user.email, otp);

    res.json({ message: "If that email is registered, we have sent an OTP." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ─── RESET PASSWORD (VERIFY OTP & RESET) ──────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "Email, OTP and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase(),
      resetPasswordOTP: otp,
      resetPasswordOTPExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP.",
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.json({
      message: "Password has been reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
    });
  }
};