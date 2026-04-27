import mongoose from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    gcsUrl: {
      type: String,
      required: true,
    },
    gcsPath: {
      type: String,
      required: true,
    },
    pineconeNamespace: {
      type: String,
      default: "default",
    },
    size: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploading", "indexing", "ready", "error"],
      default: "uploading",
    },
    error: {
      type: String,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const KnowledgeBase = mongoose.model("KnowledgeBase", knowledgeBaseSchema);

export default KnowledgeBase;
