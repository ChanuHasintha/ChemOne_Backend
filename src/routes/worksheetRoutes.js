const express = require("express");
const router = express.Router();

const {
    uploadWorksheet,
    getWorksheets,
    getWorksheet,
    downloadWorksheet,
    updateWorksheet,
    deleteWorksheet,
} = require("../controllers/worksheet.controller");

const { authenticate, authorize } = require("../middleware/auth.middleware");
const { upload } = require("../config/multer");

// All worksheet routes require a valid JWT
router.use(authenticate);

// POST   /api/worksheets/upload  — any authenticated user
router.post("/upload", upload.single("file"), uploadWorksheet);

// GET    /api/worksheets          — any authenticated user
router.get("/", getWorksheets);

// GET    /api/worksheets/:id      — any authenticated user
router.get("/:id", getWorksheet);

// GET    /api/worksheets/:id/download
router.get("/:id/download", downloadWorksheet);

// PATCH  /api/worksheets/:id      — any authenticated user
router.patch("/:id", updateWorksheet);

// DELETE /api/worksheets/:id      — admin only
router.delete("/:id", authorize("admin"), deleteWorksheet);

module.exports = router;