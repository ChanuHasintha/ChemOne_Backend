import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, default: 'mcq' },
  options: [{ type: String }],
  correctOption: { type: Number, required: true },
  marks: { type: Number, default: 1 }
});

const spotTestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  duration: { type: Number, required: true }, // in minutes
  batch: { type: String, required: true },
  questions: [questionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const SpotTest = mongoose.model('SpotTest', spotTestSchema);
export default SpotTest;
