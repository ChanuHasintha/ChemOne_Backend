import mongoose from 'mongoose';

const physicalResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'PhysicalExam', required: true },
  score: { type: Number, required: true },
  remarks: { type: String }
}, { timestamps: true });

// Ensure one student only has one result per exam
physicalResultSchema.index({ student: 1, exam: 1 }, { unique: true });

const PhysicalResult = mongoose.model('PhysicalResult', physicalResultSchema);
export default PhysicalResult;
