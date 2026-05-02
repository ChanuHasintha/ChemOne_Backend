import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// Multi-key support: same rotation as chatController
const API_KEYS = process.env.GEMINI_API_KEY.split(",").map(k => k.trim()).filter(Boolean);
const aiClients = API_KEYS.map(key => new GoogleGenAI({ apiKey: key }));
let currentKeyIndex = 0;

const getNextClient = () => {
  const client = aiClients[currentKeyIndex];
  const keyIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % aiClients.length;
  return { client, keyIndex };
};

// Default export: first client (for backward compatibility)
const ai = aiClients[0];

export const createEmbedding = async (text) => {
  try {
    if (!text) throw new Error("No text provided for embedding");

    console.log("Creating embedding for text snippet...");
    
    // Try each API key if one fails
    let lastError = null;
    for (let attempt = 0; attempt < aiClients.length; attempt++) {
      const { client, keyIndex } = getNextClient();
      try {
        const result = await client.models.embedContent({
          model: "gemini-embedding-001",
          contents: text,
          config: { outputDimensionality: 768 },
        });

        if (!result || !result.embeddings || !result.embeddings[0] || !result.embeddings[0].values) {
          throw new Error("Invalid response from Gemini Embedding API");
        }

        return result.embeddings[0].values;
      } catch (err) {
        const status = err.status || err.response?.status || err.statusCode;
        console.warn(`Embedding key[${keyIndex}] failed [${status}]: ${err.message?.slice(0, 80)}`);
        lastError = err;
        
        // If rate limited, wait briefly before trying next key
        if (status === 429 || status === 503) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        // For other errors, try next key immediately
        continue;
      }
    }
    throw lastError;
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
        const { client } = getNextClient();
        const result = await client.models.embedContent({
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