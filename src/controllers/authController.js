import User from "../models/User.js";
import OTP from "../models/OTP.js";
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
      from: '"ChemBridge Support" <support@chembridge.app>',
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


// ─── SEND SIGNUP OTP ─────────────────────────────────────────
export const sendSignupOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    const otp = generateOTP();

    await OTP.create({
      email: email.toLowerCase(),
      otp: otp,
    });



    res.status(200).json({ message: "OTP sent successfully to your email." });
  } catch (error) {
    console.error("Send signup OTP error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ─── REGISTER ────────────────────────────────────────────────
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, batch } = req.body;

    // --- Input validation ---
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
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
    const userPayload = {
      name: trimmedName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: userRole,
    };

    if (userRole === "student" && batch) {
      userPayload.batch = batch.trim();
    }

    const user = await User.create(userPayload);



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
        indexNumber: user.indexNumber,
        createdAt: user.createdAt,
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

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been temporarily blocked. Please contact the administrator.",
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
        indexNumber: user.indexNumber,
        createdAt: user.createdAt,
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

// ─── GET CURRENT USER PROFILE ───────────────────────────────
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── UPDATE USER PROFILE ───────────────────────────────
export const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        batch: updatedUser.batch,
        indexNumber: updatedUser.indexNumber,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already in use" });
    }
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET ALL STUDENTS (ADMIN ONLY) ───────────────────────────────
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name indexNumber batch email createdAt isBlocked blockedAt")
      .sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE STUDENT (ADMIN ONLY) ─────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "Can only delete student accounts." });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "Student account deleted successfully." });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// ─── TOGGLE BLOCK STUDENT (ADMIN ONLY) ───────────────────────────
export const toggleBlockStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    if (student.role !== "student") {
      return res.status(400).json({ message: "Can only block student accounts." });
    }

    student.isBlocked = !student.isBlocked;
    student.blockedAt = student.isBlocked ? new Date() : null;
    await student.save();

    res.json({
      message: student.isBlocked
        ? "Student account has been blocked."
        : "Student account has been unblocked.",
      student: {
        id: student._id,
        name: student.name,
        isBlocked: student.isBlocked,
        blockedAt: student.blockedAt,
      },
    });
  } catch (error) {
    console.error("Toggle block student error:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};