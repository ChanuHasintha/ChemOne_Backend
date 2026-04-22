import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

export const createEmbedding = async (text) => {
  try {
    if (!text) throw new Error("No text provided for embedding");
    
    console.log("Creating embedding for text snippet...");
    const result = await embeddingModel.embedContent(text);
    
    if (!result || !result.embedding || !result.embedding.values) {
      throw new Error("Invalid response from Gemini Embedding API");
    }
    
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error.message);
    throw new Error(`Failed to process message embedding: ${error.message}`);
  }
};

export default genAI;