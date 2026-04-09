import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'SpotTest', required: true },
  answers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SpotTest.questions' },
    selectedOption: { type: Number },
    isCorrect: { type: Boolean }
  }],
  score: { type: Number, default: 0 },
  totalMarks: { type: Number },
  timeTaken: { type: Number, required: true }, // duration in seconds
}, { timestamps: true });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
