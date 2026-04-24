import { extractPDF } from "../utils/pdf.js";
import { chunkText } from "../utils/chunkText.js";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";
import bucket from "../config/gcs.js";
import KnowledgeBase from "../models/KnowledgeBase.js";
import fs from "fs";
import path from "path";

export const handleProcessPDF = async (req, res) => {
  let knowledgeRecord;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    const gcsFileName = `knowledge-base/${Date.now()}-${fileName}`;

    console.log(`Step 1: Uploading to GCS: ${gcsFileName}`);
    
    // Create initial record
    knowledgeRecord = await KnowledgeBase.create({
      fileName: fileName,
      gcsUrl: "pending",
      gcsPath: gcsFileName,
      size: req.file.size,
      status: "uploading",
    });

    // Upload to GCS
    const gcsFile = bucket.file(gcsFileName);
    await bucket.upload(filePath, {
      destination: gcsFileName,
      metadata: {
        contentType: "application/pdf",
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
    
    // Update record
    knowledgeRecord.gcsUrl = publicUrl;
    knowledgeRecord.status = "indexing";
    await knowledgeRecord.save();

    console.log(`Step 2: Processing PDF content: ${filePath}`);

    // 1. Extract text
    const text = await extractPDF(filePath);
    if (!text) {
      throw new Error("Failed to extract text from PDF");
    }

    // 2. Chunk text
    const chunks = chunkText(text, 500);
    console.log(`Created ${chunks.length} chunks.`);

    // 3. Embed and Upsert
    const upserts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk);
      
      upserts.push({
        id: `${knowledgeRecord._id}-chunk-${i}`,
        values: embedding,
        metadata: {
          text: chunk,
          source: fileName,
          knowledgeId: knowledgeRecord._id.toString(),
          chunkIndex: i,
        },
      });
    }

    // Pinecone upsert
    const batchSize = 50;
    for (let i = 0; i < upserts.length; i += batchSize) {
      const batch = upserts.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    // Update record to ready
    knowledgeRecord.status = "ready";
    knowledgeRecord.chunkCount = chunks.length;
    await knowledgeRecord.save();

    console.log("Pinecone upsert completed.");

    // Cleanup local file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Could not delete temporary file:", err.message);
    }

    res.json({
      success: true,
      message: `Successfully indexed ${chunks.length} chunks from ${fileName}`,
      data: knowledgeRecord,
    });

  } catch (error) {
    console.error("PDF Processing Error:", error);
    
    if (knowledgeRecord) {
      knowledgeRecord.status = "error";
      knowledgeRecord.error = error.message;
      await knowledgeRecord.save();
    }

    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
      error: error.message,
    });
  }
};

export const getKnowledgeBase = async (req, res) => {
  try {
    const knowledge = await KnowledgeBase.find().sort({ createdAt: -1 });
    res.json({ success: true, data: knowledge });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteKnowledgeBase = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await KnowledgeBase.findById(id);

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    console.log(`Deleting knowledge source: ${record.fileName}`);

    // 1. Delete from Pinecone
    try {
      // Use delete with metadata filter (if supported by your Pinecone version/plan)
      // If filter delete is not supported, you'd need to fetch IDs first or use namespaces
      // For simplicity here, we use the knowledgeId filter
      await index.deleteMany({
        filter: {
          knowledgeId: { $eq: id },
        },
      });
      console.log("Deleted vectors from Pinecone");
    } catch (err) {
      console.warn("Pinecone deletion error:", err.message);
    }

    // 2. Delete from GCS
    try {
      await bucket.file(record.gcsPath).delete();
      console.log("Deleted file from GCS");
    } catch (err) {
      console.warn("GCS deletion error:", err.message);
    }

    // 3. Delete from MongoDB
    await KnowledgeBase.findByIdAndDelete(id);

    res.json({ success: true, message: "Knowledge source deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};