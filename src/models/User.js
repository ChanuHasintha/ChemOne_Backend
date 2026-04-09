import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must not exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: {
        values: ["student", "instructor"],
        message: "{VALUE} is not a valid role",
      },
      default: "student",
    },
    batch: {
      type: String,
      trim: true,
    },
    indexNumber: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined for instructors
    },
    resetPasswordOTP: String,
    resetPasswordOTPExpires: Date,
  },
  { timestamps: true }
);

// Pre-save hook to generate index number for students
userSchema.pre("save", async function () {
  if (this.isNew && this.role === "student" && !this.indexNumber) {
    try {
      // Use last two digits of the batch (e.g., "2026" -> "26")
      const batchYear = this.batch ? this.batch.toString().slice(-2) : new Date().getFullYear().toString().slice(-2);
      
      // Find the last student of the same batch to get the latest sequence number
      const lastStudent = await this.constructor.findOne(
        { role: "student", indexNumber: { $regex: new RegExp(`^STU-${batchYear}-`) } },
        { indexNumber: 1 },
        { sort: { indexNumber: -1 } }
      ).lean();

      let sequence = 1;
      if (lastStudent && lastStudent.indexNumber) {
        const parts = lastStudent.indexNumber.split("-");
        const lastSeqStr = parts[parts.length - 1];
        const lastSequence = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }

      // Format: STU-YY-XXXX (e.g., STU-26-0001)
      this.indexNumber = `STU-${batchYear}-${sequence.toString().padStart(4, "0")}`;
    } catch (error) {
      console.error("PRE-SAVE HOOK ERROR:", error);
      throw error;
    }
  }
});

export default mongoose.model("User", userSchema);