const mongoose = require("mongoose");

const worksheetSchema = new mongoose.Schema(
    {
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        size: { type: Number, required: true },
        date: { type: String, required: true }, // "YYYY-MM-DD"
        notes: { type: String, default: "" },
        filePath: { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Worksheet", worksheetSchema);