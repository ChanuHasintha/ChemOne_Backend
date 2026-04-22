import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Select model
const chatModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Updated to 2.5 to avoid quota issues on 2.0
});
console.log("Gemini model initialized: gemini-2.5-flash");

// Fallback model in case of quota issues
const fallbackModel = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
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

    // Extract response
    const reply = result.response.text();

    console.log("Gemini response sent successfully");

    // Send response
    res.json({ reply });

  } catch (error) {
    console.error("=== ERROR OCCURRED ===");
    console.error("Message:", error.message);
    
    // Detailed error logging
    const status = error.status || error.response?.status || error.statusCode;
    console.error("Status Code:", status);

    if (status === 429) {
      return res.status(429).json({ 
        reply: "Gemini API limits are exhausted! Please wait a moment or try again later. 😢" 
      });
    }

    if (status === 404) {
      return res.status(404).json({
        reply: "Model not found. Please check if the model name is correct and enabled in your Google AI Studio. 🔍"
      });
    }

    if (status === 403 || status === 401) {
      return res.status(status).json({
        reply: "API Key issue: Please check your GEMINI_API_KEY configuration. 🔑"
      });
    }

    res.status(500).json({
      reply: `Error: ${error.message || "Unable to get response 😢"}`,
    });
  }
};