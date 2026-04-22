import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Select model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash", // Reverted to 2.0-flash as it's generally preferred for RAG
});

// Fallback model
const fallbackModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
});

// Chat Controller
export const handleChat = async (req, res) => {
  const { message } = req.body;

  console.log("---- Chat Request ----");
  console.log("User message:", message);

  try {
    if (!message) {
      return res.status(400).json({ reply: "No message provided" });
    }

    // 1. Create embedding for the user message
    console.log("Creating embedding for user query...");
    let queryEmbedding;
    try {
      queryEmbedding = await createEmbedding(message);
    } catch (embError) {
      console.error("Embedding creation failed:", embError);
      return res.status(500).json({ 
        reply: "Failed to process message embedding. Please check API configuration. 🧪" 
      });
    }

    // 2. Query Pinecone for relevant context
    console.log("Querying Pinecone for context...");
    let context = "";
    try {
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        context = queryResponse.matches
          .map((match) => match.metadata.text)
          .join("\n\n");
        console.log(`Found ${queryResponse.matches.length} relevant context matches.`);
      } else {
        console.log("No relevant context found in Pinecone.");
      }
    } catch (pineError) {
      console.error("Pinecone query failed:", pineError);
      // We continue without context if Pinecone fails, rather than crashing
    }

    // 3. Construct the augmented prompt
    const prompt = `You are an expert A/L Chemistry teacher named "ChemOne AI". 
Use the following pieces of retrieved context to answer the question. 
If you don't know the answer or the context doesn't help, use your internal knowledge but mention if you are unsure.
Always answer clearly in Sinhala unless the user asks in English.
Give simple, step-by-step explanations.

Context:
${context || "No specific context found."}

Question:
${message}

Answer:`;

    console.log("Calling Gemini API with augmented prompt...");

    // 4. Call Gemini
    let result;
    try {
      result = await chatModel.generateContent(prompt);
    } catch (firstError) {
      const status = firstError.status || firstError.response?.status || firstError.statusCode;
      if (status === 429) {
        console.log("Primary model hit quota. Trying fallback model...");
        result = await fallbackModel.generateContent(prompt);
      } else {
        throw firstError;
      }
    }

    const reply = result.response.text();
    console.log("Gemini response sent successfully");

    res.json({ reply });

  } catch (error) {
    console.error("=== CHAT ERROR ===");
    console.error(error);
    
    res.status(500).json({
      reply: `Error: ${error.message || "Unable to get response 😢"}`,
    });
  }
};