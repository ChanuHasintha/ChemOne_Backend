import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const SubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'SpotTest' },
  score: Number,
  timeTaken: Number
});

const Submission = mongoose.model("Submission", SubmissionSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const count = await Submission.countDocuments();
  console.log("Total submissions found:", count);
  const subs = await Submission.find().populate('student').limit(5).lean();
  console.log("Samples:", JSON.stringify(subs, null, 2));
  process.exit();
}

check();
