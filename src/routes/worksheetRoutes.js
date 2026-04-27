import express from "express";
import {
    uploadWorksheet,
    getWorksheets,
    deleteWorksheet,
    submitWorksheetAnswer,
    getWorksheetSubmissions,
    deleteWorksheetAnswer,
    uploadOfficialAnswer,
    confirmWorksheetSubmission,
    viewWorksheetWithWatermark,
} from "../controllers/worksheetController.js";
import { protect } from "../middleware/authMiddleware.js";

import { upload } from "../middleware/upload.js";

const router = express.Router();

// Upload PDF
router.post("/", upload.single("file"), uploadWorksheet);

// Get all
router.get("/", protect, getWorksheets);

// Get single with Watermark (Student)
router.get("/:id/view", protect, viewWorksheetWithWatermark);

// Delete (Admin)
router.delete("/:id", protect, deleteWorksheet);

// Submit Answer (Student)
router.post("/:id/submit", protect, upload.single("file"), submitWorksheetAnswer);

// Delete Answer (Student)
router.delete("/:id/submit", protect, deleteWorksheetAnswer);

// Confirm Answer (Student)
router.post("/:id/confirm", protect, confirmWorksheetSubmission);

// Get Submissions (Admin)
router.get("/:id/submissions", protect, getWorksheetSubmissions);

// Upload Official Answer (Admin)
router.post("/:id/official-answer", protect, upload.single("file"), uploadOfficialAnswer);

export default router;