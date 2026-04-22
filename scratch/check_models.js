import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Note: The JS SDK might not have a direct listModels, but we can try to fetch it
    console.log("Checking API key...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("API Key is working. Gemini response:", result.response.text());

    // Standard embedding models names for Google AI Studio
    const models = ["text-embedding-004", "embedding-001"];
    for (const m of models) {
      try {
        console.log(`Testing model: ${m}`);
        const embModel = genAI.getGenerativeModel({ model: m });
        const res = await embModel.embedContent("test");
        console.log(`Model ${m} is working!`);
      } catch (e) {
        console.error(`Model ${m} failed:`, e.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listModels();
