import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});

const User = mongoose.model("User", UserSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find().limit(10).lean();
  console.log("Users:", JSON.stringify(users, null, 2));
  process.exit();
}

check();
