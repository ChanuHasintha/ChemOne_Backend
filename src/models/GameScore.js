import mongoose from "mongoose";

const gameScoreSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  game: {
    type: String,
    enum: ["chembattle", "labgame"],
    required: true,
  },
  score: {
    type: Number,
    required: true, // Lower is better (moves or seconds)
  }
}, { timestamps: true });

export default mongoose.model("GameScore", gameScoreSchema);
