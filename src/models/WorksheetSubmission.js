import mongoose from "mongoose";

const worksheetSubmissionSchema = new mongoose.Schema(
    {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        worksheet: { type: mongoose.Schema.Types.ObjectId, ref: 'Worksheet', required: true },
        fileUrl: { type: String, required: true },
        publicId: { type: String, required: true },
        fileName: { type: String, required: true },
        isConfirmed: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model("WorksheetSubmission", worksheetSubmissionSchema);
