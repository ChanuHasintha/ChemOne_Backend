import { createEmbedding } from "../src/utils/embedding.js";
import { index } from "../src/utils/pinecone.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testRAG() {
  const query = "What is the physical state of Group 1 elements?";
  console.log("Query:", query);

  try {
    // 1. Test Embedding
    console.log("\n--- Testing Embedding ---");
    const embedding = await createEmbedding(query);
    console.log("Embedding length:", embedding.length);

    // 2. Test Pinecone Query
    console.log("\n--- Testing Pinecone Query ---");
    const queryResponse = await index.query({
      vector: embedding,
      topK: 3,
      includeMetadata: true,
    });
    console.log("Found matches:", queryResponse.matches.length);
    queryResponse.matches.forEach((m, i) => {
      console.log(`Match ${i + 1} [Score: ${m.score}]:`, m.metadata.text.substring(0, 100) + "...");
    });

    // 3. Test Gemini Response
    console.log("\n--- Testing Gemini Response ---");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const context = queryResponse.matches.map(m => m.metadata.text).join("\n\n");
    const prompt = `Context:\n${context}\n\nQuestion: ${query}`;

    const result = await model.generateContent(prompt);
    console.log("Gemini Response:", result.response.text());

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testRAG();
