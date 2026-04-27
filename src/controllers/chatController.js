import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";

dotenv.config();

// Initialize Gemini (new SDK)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models in priority order (use lite/smaller models first to avoid quota issues)
const MODEL_CHAIN = [
  "gemini-2.0-flash-lite",   // Primary - lightest, least quota usage
  "gemini-2.5-flash",        // Fallback 1 - fast & capable
  "gemini-2.0-flash",        // Fallback 2
];

// Helper: try generating content across multiple models with retry
const generateWithFallback = async (prompt, retryCount = 0) => {
  let lastError = null;
  let allRateLimited = true;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`Trying model: ${modelName}`);
      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      console.log(`Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const status = error.status || error.response?.status || error.statusCode;
      console.warn(`Model ${modelName} failed [${status}]: ${error.message?.slice(0, 100)}`);
      lastError = error;

      if (status !== 429 && status !== 503) {
        allRateLimited = false;
      }

      // If it's a rate limit error, wait briefly before trying the next model
      if (status === 429 || status === 503) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      // For other errors, skip immediately to next model
      continue;
    }
  }

  // If all models were rate limited and we haven't retried yet, wait and retry
  if (allRateLimited && retryCount < 2) {
    const waitTime = (retryCount + 1) * 15000; // 15s, then 30s
    console.log(`All models rate limited. Waiting ${waitTime / 1000}s before retry #${retryCount + 1}...`);
    await new Promise((r) => setTimeout(r, waitTime));
    return generateWithFallback(prompt, retryCount + 1);
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

    }

    // 3. Construct the augmented prompt
    const prompt = `You are an expert A/L Chemistry teacher named "ChemBridge AI". 
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

    const reply = result.text;
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