import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ROUTES
import chatRoutes from "./routes/chatRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import worksheetRoutes from "./routes/worksheetRoutes.js";
import spotRoutes from "./routes/spotRoutes.js";
import physicalExamRoutes from "./routes/physicalExamRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

const app = express();
app.set('trust proxy', true);

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
  express.static(path.join(__dirname, "../uploads"))
);

// ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/worksheets", worksheetRoutes);
app.use("/api/spots", spotRoutes);
app.use("/api/physical-exams", physicalExamRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/uploads", uploadRoutes);

// CHATBOT ROUTE
app.use("/api/chat", chatRoutes);

// Home route
app.get("/", (req, res) => {
  res.send("LMS API Running...");
});

export default app;                                        