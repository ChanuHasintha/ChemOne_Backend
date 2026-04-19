import mongoose from 'mongoose';

const physicalExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  batch: [{ type: String, required: true }],
  totalMarks: { type: Number, required: true, default: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const PhysicalExam = mongoose.model('PhysicalExam', physicalExamSchema);
export default PhysicalExam;
