import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  console.log('Testing Gemini directly...');
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: "Say hello!",
    });
    console.log('✅ Gemini Response:', result.text);
  } catch (error) {
    console.error('❌ Gemini Error:', error);
  }
  process.exit();
}

test();
