import express from "express";
import {
    uploadWorksheet,
    getWorksheets,
    deleteWorksheet,
} from "../controllers/worksheetController.js";

import { upload } from "../middleware/upload.js";

const router = express.Router();

// Upload PDF
router.post("/", upload.single("file"), uploadWorksheet);

// Get all
router.get("/", getWorksheets);

// Delete
router.delete("/:id", deleteWorksheet);

export default router;