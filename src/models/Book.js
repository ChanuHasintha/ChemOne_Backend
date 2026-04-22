import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  topic: String,
  content: String,
  image: String,
  keywords: [String],
});

export default mongoose.model("Book", bookSchema);
