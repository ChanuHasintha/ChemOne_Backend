import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testGemini() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using API Key:", key ? key.substring(0, 10) + "..." : "undefined");
    
    try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Sending request...");
        const result = await model.generateContent("Say 'System is ready'");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error("Full Error:", error);
        if (error.status) console.error("Status:", error.status);
    }
}

testGemini();
