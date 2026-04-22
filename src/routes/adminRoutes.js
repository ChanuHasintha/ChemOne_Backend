import express from "express";
import multer from "multer";
import { handleProcessPDF } from "../controllers/processPDF.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Configure multer for temporary storage
const upload = multer({ dest: "uploads/" });

// Knowledge ingestion route
router.post("/ingest-pdf", protect, upload.single("pdf"), handleProcessPDF);

export default router;
