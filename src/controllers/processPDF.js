import { extractPDF } from "../utils/pdf.js";
import { chunkText } from "../utils/chunkText.js";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";
import fs from "fs";

export const handleProcessPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const filePath = req.file.path;
    console.log(`Processing PDF: ${filePath}`);

    // 1. Extract text
    const text = await extractPDF(filePath);
    if (!text) {
      throw new Error("Failed to extract text from PDF");
    }
    console.log("Text extracted successfully.");

    // 2. Chunk text
    const chunks = chunkText(text, 500);
    console.log(`Created ${chunks.length} chunks.`);

    // 3. Embed and Upsert
    const upserts = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await createEmbedding(chunk);
      
      upserts.push({
        id: `${req.file.filename}-chunk-${i}`,
        values: embedding,
        metadata: {
          text: chunk,
          source: req.file.originalname,
          chunkIndex: i,
        },
      });
    }

    // Pinecone upsert limit is usually 100 per request for safety
    const batchSize = 50;
    for (let i = 0; i < upserts.length; i += batchSize) {
      const batch = upserts.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    console.log("Pinecone upsert completed.");

    // Cleanup local file
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Could not delete temporary file:", err.message);
    }

    res.json({
      success: true,
      message: `Processed ${chunks.length} chunks from ${req.file.originalname}`,
    });

  } catch (error) {
    console.error("PDF Processing Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process PDF",
      error: error.message,
    });
  }
};