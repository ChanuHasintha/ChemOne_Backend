import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createEmbedding } from "../utils/embedding.js";
import { index } from "../utils/pinecone.js";
import { generateWithGroq } from "../utils/groqService.js";

dotenv.config();

// Initialize Gemini (new SDK)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Gemini models in priority order (use lite/smaller models first to avoid quota issues)
const MODEL_CHAIN = [
  "gemini-2.0-flash-lite",   // Primary - lightest, least quota usage
  "gemini-2.5-flash",        // Fallback 1 - fast & capable
  "gemini-2.0-flash",        // Fallback 2
];

// Helper: try generating content across multiple Gemini models with retry
const generateWithGemini = async (prompt, retryCount = 0) => {
  let lastError = null;
  let allRateLimited = true;

  for (const modelName of MODEL_CHAIN) {
    try {
      console.log(`[Gemini] Trying model: ${modelName}`);
      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
      });
      console.log(`[Gemini] Success with model: ${modelName}`);
      return result;
    } catch (error) {
      const status = error.status || error.response?.status || error.statusCode;
      console.warn(`[Gemini] Model ${modelName} failed [${status}]: ${error.message?.slice(0, 100)}`);
      lastError = error;

      if (status !== 429 && status !== 503) {
        allRateLimited = false;
      }

      // If it's a rate limit error, wait before trying the next model
      if (status === 429 || status === 503) {
        const delay = 3000 * (retryCount + 1); // exponential backoff: 3s, 6s, 9s
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // For other errors, skip immediately to next model
      continue;
    }
  }

  // If all models were rate limited, retry up to 2 more times with increasing wait
  if (allRateLimited && retryCount < 2) {
    const waitTime = 5000 * (retryCount + 1); // 5s, 10s
    console.log(`[Gemini] All models rate limited. Waiting ${waitTime / 1000}s before retry ${retryCount + 1}...`);
    await new Promise((r) => setTimeout(r, waitTime));
    return generateWithGemini(prompt, retryCount + 1);
  }

  // All models failed — throw the last error
  throw lastError;
};

// System prompt used by both AI models
const SYSTEM_PROMPT = `You are an expert A/L Chemistry teacher named "ChemBridge AI". 
Use the following pieces of retrieved context to answer the question. 
If you don't know the answer or the context doesn't help, use your internal knowledge but mention if you are unsure.
Always answer clearly in Sinhala unless the user asks in English.
Give simple, step-by-step explanations.`;

// Chat Controller
export const handleChat = async (req, res) => {
  const { message, model = "gemini" } = req.body;

  console.log("---- Chat Request ----");
  console.log("User message:", message);
  console.log("Selected model:", model);

  try {
    if (!message) {
      return res.status(400).json({ reply: "No message provided" });
    }

    // Validate model selection
    const selectedModel = model === "llama" ? "llama" : "gemini";

    // 1. Try to create embedding for the user message (graceful fallback if it fails)
    console.log("Creating embedding for user query...");
    let context = "";
    try {
      const queryEmbedding = await createEmbedding(message);

      // 2. Query Pinecone for relevant context
      console.log("Querying Pinecone for context...");
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
        console.error("Pinecone query failed (continuing without context):", pineError.message);
      }
    } catch (embError) {
      console.warn("Embedding creation failed (continuing without context):", embError.message);
      // Don't return error — continue without context so the AI can still answer
    }

    // 3. Build the context-augmented prompt
    const contextBlock = `Context:\n${context || "No specific context found."}\n\nQuestion:\n${message}\n\nAnswer:`;

    let reply;

    if (selectedModel === "llama") {
      // ── Groq Llama Path ──
      console.log("Routing to Groq Llama 3.1...");
      const systemWithContext = `${SYSTEM_PROMPT}\n\n${contextBlock}`;
      reply = await generateWithGroq(SYSTEM_PROMPT, `${contextBlock}`);
    } else {
      // ── Gemini Path ──
      console.log("Routing to Gemini...");
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${contextBlock}`;
      const result = await generateWithGemini(fullPrompt);
      reply = result.text;
    }

    console.log(`[${selectedModel.toUpperCase()}] Response sent successfully`);
    res.json({ reply, model: selectedModel });

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