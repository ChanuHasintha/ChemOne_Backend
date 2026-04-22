import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ROUTES
import chatRoutes from "./routes/chatRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import spotRoutes from "./routes/spotRoutes.js";
import worksheetRoutes from "./routes/worksheetRoutes.js";
import physicalExamRoutes from "./routes/physicalExamRoutes.js";

const app = express();

// Fix __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/tests", spotRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/worksheets", worksheetRoutes);
app.use("/api/physical-exams", physicalExamRoutes);

// CHATBOT ROUTE
app.use("/api/chat", chatRoutes);

// Home route
app.get("/", (req, res) => {
  res.send("LMS API Running...");
});

export default app;                                        