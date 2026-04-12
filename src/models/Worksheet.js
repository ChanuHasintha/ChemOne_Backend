import mongoose from "mongoose";

const worksheetSchema = new mongoose.Schema(
    {
        fileName: String,
        fileUrl: String,
        publicId: String,
        date: String,
        notes: String,
    },
    { timestamps: true }
);

export default mongoose.model("Worksheet", worksheetSchema);