import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Select model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// Chat Controller
export const handleChat = async (req, res) => {
  const { message } = req.body;

  console.log("---- Chat Request ----");
  console.log("User message:", message);

  try {
    // Validate input
    if (!message) {
      return res.status(400).json({ reply: "No message provided" });
    }

    console.log("Calling Gemini API...");

    // Prompt
    const prompt = `You are an A/L Chemistry teacher.

Rules:
- Answer clearly in Sinhala
- Give simple explanations
- If question is unclear, ask for clarification

Question:
${message}`;

    // Call Gemini
    const result = await chatModel.generateContent(prompt);

    // Extract response
    const reply = result.response.text();

    console.log("Gemini response sent successfully");

    // Send response
    res.json({ reply });

  } catch (error) {
    console.error("=== ERROR OCCURRED ===");
    console.error("Message:", error.message);
    console.error("Full error:", error);

    // Check if the error is due to Gemini API limits/quota
    if (error.status === 429) {
      return res.status(429).json({ 
        reply: "My API limits are exhausted right now! Please wait a moment or try again later. 😢" 
      });
    }

    res.status(500).json({
      reply: "Error: Unable to get response 😢",
    });
  }
};