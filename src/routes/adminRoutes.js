import express from "express";
import multer from "multer";
import { handleProcessPDF, getKnowledgeBase, deleteKnowledgeBase } from "../controllers/processPDF.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for temporary storage
const upload = multer({ dest: "uploads/" });

// Knowledge ingestion route
router.post("/ingest-pdf", protect, upload.single("pdf"), handleProcessPDF);

// Knowledge management routes
router.get("/knowledge", protect, getKnowledgeBase);
router.delete("/knowledge/:id", protect, deleteKnowledgeBase);

export default router;
