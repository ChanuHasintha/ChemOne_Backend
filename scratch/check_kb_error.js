import mongoose from "mongoose";
import KnowledgeBase from "../src/models/KnowledgeBase.js";
import dotenv from "dotenv";

dotenv.config();

async function checkErrors() {
  await mongoose.connect(process.env.MONGO_URI);
  const latest = await KnowledgeBase.findOne().sort({ createdAt: -1 });
  if (latest) {
    console.log("File:", latest.fileName);
    console.log("Status:", latest.status);
    console.log("Error:", latest.error);
  } else {
    console.log("No records found.");
  }
  process.exit();
}

checkErrors();
