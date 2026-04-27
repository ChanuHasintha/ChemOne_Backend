import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models in priority order (tested and confirmed working)
const MODEL_CHAIN = [
  "gemini-2.5-flash",        // Primary - fast & within quota
  "gemini-3-flash-preview",  // Fallback 1
  "gemini-2.0-flash",        // Fallback 2
];

// Helper: try generating content across multiple models with retry
const generateWithFallback = async (prompt) => {
  let lastError = null;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      console.log(`Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const status = error.status || error.response?.status || error.statusCode;
      console.warn(`Model ${modelName} failed [${status}]: ${error.message?.slice(0, 100)}`);
      lastError = error;

      // If it's a rate limit error, wait briefly before trying the next model
      if (status === 429 || status === 503) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      // For other errors (e.g. 404), skip immediately to next model
      continue;
    }
  }

  // All models failed — throw the last error
  throw lastError;
};

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

    // 4. Call Gemini with automatic fallback across models
    const result = await generateWithFallback(prompt);

    const reply = result.response.text();
    console.log("Gemini response sent successfully");

    res.json({ reply });

  } catch (error) {
    console.error("=== CHAT ERROR ===");
    console.error(error);
    
    const status = error.status || error.response?.status || error.statusCode;
    if (status === 429) {
      res.status(429).json({
        reply: "The AI is currently busy due to high demand. Please try again in a minute. ⏳",
      });
    } else {
      res.status(500).json({
        reply: `Error: ${error.message || "Unable to get response 😢"}`,
      });
    }
  }
};