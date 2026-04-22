import mongoose from "mongoose";

const worksheetSchema = new mongoose.Schema(
    {
        fileName: String,
        fileUrl: String,
        publicId: String,
        date: String,
        notes: String,
        officialAnswerUrl: String,
        officialAnswerPublicId: String,
    },
    { timestamps: true }
);

export default mongoose.model("Worksheet", worksheetSchema);