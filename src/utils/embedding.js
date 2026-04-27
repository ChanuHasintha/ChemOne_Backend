import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const createEmbedding = async (text) => {
  try {
    if (!text) throw new Error("No text provided for embedding");

    console.log("Creating embedding for text snippet...");
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      config: { outputDimensionality: 768 },
    });

    if (!result || !result.embeddings || !result.embeddings[0] || !result.embeddings[0].values) {
      throw new Error("Invalid response from Gemini Embedding API");
    }

    return result.embeddings[0].values;
  } catch (error) {
    console.error("Embedding Error:", error.message);
    throw new Error(`Failed to process message embedding: ${error.message}`);
  }
};

export const createBatchEmbeddings = async (texts) => {
  try {
    if (!texts || !texts.length) return [];

    console.log(`Creating batch embeddings for ${texts.length} snippets...`);

    const maxBatchSize = 100;
    let allEmbeddings = [];

    for (let i = 0; i < texts.length; i += maxBatchSize) {
      const batchTexts = texts.slice(i, i + maxBatchSize);

      const results = [];
      for (const text of batchTexts) {
        const result = await ai.models.embedContent({
          model: "gemini-embedding-001",
          contents: text,
          config: { outputDimensionality: 768 },
        });
        results.push(result.embeddings[0].values);
      }

      allEmbeddings = allEmbeddings.concat(results);

      // Delay between batches to avoid hitting rate limits
      if (i + maxBatchSize < texts.length) {
        console.log("Waiting 4 seconds before next batch to respect rate limits...");
        await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }

    return allEmbeddings;
  } catch (error) {
    console.error("Batch Embedding Error:", error.message);
    throw new Error(`Failed to process batch embeddings: ${error.message}`);
  }
};

export default ai;