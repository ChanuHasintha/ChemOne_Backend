import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq models in priority order
const GROQ_MODEL_CHAIN = [
  "llama-3.1-8b-instant",       // Fast and reliable
  "llama-3.3-70b-versatile",    // More capable fallback
];

/**
 * Generate a chat completion using Groq (Llama models)
 * with automatic model fallback and retry logic.
 *
 * @param {string} systemPrompt - The system instruction
 * @param {string} userMessage - The user's message
 * @param {number} retryCount - Internal retry counter
 * @returns {Promise<string>} The AI response text
 */
export const generateWithGroq = async (systemPrompt, userMessage, retryCount = 0) => {
  let lastError = null;
  let allRateLimited = true;

  for (const modelName of GROQ_MODEL_CHAIN) {
    try {
      console.log(`[Groq] Trying model: ${modelName}`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: modelName,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const reply = chatCompletion.choices[0]?.message?.content;
      if (!reply) {
        throw new Error("Empty response from Groq");
      }

      console.log(`[Groq] Success with model: ${modelName}`);
      return reply;
    } catch (error) {
      const status = error.status || error.response?.status || error.statusCode;
      console.warn(`[Groq] Model ${modelName} failed [${status}]: ${error.message?.slice(0, 100)}`);
      lastError = error;

      if (status !== 429 && status !== 503) {
        allRateLimited = false;
      }

      // If rate limited, wait before trying next model
      if (status === 429 || status === 503) {
        const delay = 3000 * (retryCount + 1);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // For other errors, skip to next model
      continue;
    }
  }

  // If all models were rate limited, retry up to 2 more times
  if (allRateLimited && retryCount < 2) {
    const waitTime = 5000 * (retryCount + 1);
    console.log(`[Groq] All models rate limited. Waiting ${waitTime / 1000}s before retry ${retryCount + 1}...`);
    await new Promise((r) => setTimeout(r, waitTime));
    return generateWithGroq(systemPrompt, userMessage, retryCount + 1);
  }

  // All models failed
  throw lastError;
};

export default groq;
