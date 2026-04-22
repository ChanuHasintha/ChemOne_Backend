import mongoose from "mongoose";
import dotenv from "dotenv";
import Book from "../models/Book.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const data = [
  {
    topic: " Unit 1 ",
    content: "Ionic bonding occurs when electrons are transferred...",
    image: "/uploads/bonding.png",
    keywords: ["ionic", "bonding", "electron"],
  },
  {
    topic: "Titration",
    content: "Titration uses burette and pipette...",
    image: "/uploads/titration.png",
    keywords: ["titration", "burette"],
  },
];

await Book.insertMany(data);
console.log("Books inserted ✅");
process.exit();