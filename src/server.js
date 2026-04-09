import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import spotRoutes from "./routes/spotRoutes.js";
import worksheetRoutes from "./routes/worksheetRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files (Uploaded Images)
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tests", spotRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/worksheets", worksheetRoutes);

app.get("/", (req, res) => {
  res.send("LMS API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});