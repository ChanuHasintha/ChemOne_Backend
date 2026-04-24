import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-2",
});

export const createEmbedding = async (text) => {
  try {
    if (!text) throw new Error("No text provided for embedding");
    
    console.log("Creating embedding for text snippet...");
    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: 768,
    });
    
    if (!result || !result.embedding || !result.embedding.values) {
      throw new Error("Invalid response from Gemini Embedding API");
    }
    
    return result.embedding.values;
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
      const requests = batchTexts.map(text => ({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: 768,
      }));
      
      const result = await embeddingModel.batchEmbedContents({ requests });
      
      if (!result || !result.embeddings) {
        throw new Error("Invalid response from Gemini Batch Embedding API");
      }
      
      allEmbeddings = allEmbeddings.concat(result.embeddings.map(e => e.values));
      
      // Delay between batches to avoid hitting the 15 RPM free-tier rate limit
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

export default genAI;