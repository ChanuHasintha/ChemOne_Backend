const fs = require("fs");
const path = require("path");
const Worksheet = require("../models/Worksheet.model");
const transporter = require("../config/mailer");
const { UPLOADS_DIR } = require("../config/multer");

// ─── Email Helper ─────────────────────────────────────────────────────────────
const sendUploadNotification = async ({ to, worksheetName, date, notes }) => {
    await transporter.sendMail({
        from: `"ChemOne System" <${process.env.SMTP_USER}>`,
        to,
        subject: `Daily Worksheet Uploaded — ${date}`,
        html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;
                  border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e293b;margin-bottom:4px;">Worksheet Uploaded ✅</h2>
        <p style="color:#64748b;font-size:14px;margin-top:0;">${date}</p>
        <hr style="border:none;border-top:1px solid #f1f5f9;margin:20px 0;">
        <p style="color:#334155;"><strong>File:</strong> ${worksheetName}</p>
        ${notes ? `<p style="color:#334155;"><strong>Notes:</strong> ${notes}</p>` : ""}
        <p style="color:#94a3b8;font-size:12px;margin-top:32px;">
          ChemOne — Daily Worksheet System
        </p>
      </div>
    `,
    });
};

// ─── Upload Worksheet ─────────────────────────────────────────────────────────
// POST /api/worksheets/upload
const uploadWorksheet = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ success: false, error: "No file uploaded." });

        const { date, notes } = req.body;

        if (!date) {
            fs.unlinkSync(req.file.path); // clean up orphan file
            return res.status(400).json({ success: false, error: "Date is required." });
        }

        const worksheet = await Worksheet.create({
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            date,
            notes: notes || "",
            filePath: `/uploads/${req.file.filename}`,
            uploadedBy: req.user.id,
        });

        // Fire-and-forget email notification
        sendUploadNotification({
            to: req.user.email,
            worksheetName: req.file.originalname,
            date,
            notes,
        }).catch((err) => console.error("Email notification error:", err));

        return res.status(201).json({ success: true, worksheet });
    } catch (err) {
        console.error("Upload error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

// ─── List Worksheets ──────────────────────────────────────────────────────────
// GET /api/worksheets?date=YYYY-MM-DD&page=1&limit=20
const getWorksheets = async (req, res) => {
    try {
        const filter = {};
        if (req.query.date) filter.date = req.query.date;

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

        const [worksheets, total] = await Promise.all([
            Worksheet.find(filter)
                .populate("uploadedBy", "name email")
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Worksheet.countDocuments(filter),
        ]);

        return res.json({ success: true, total, page, limit, worksheets });
    } catch (err) {
        console.error("List error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

// ─── Get Single Worksheet ─────────────────────────────────────────────────────
// GET /api/worksheets/:id
const getWorksheet = async (req, res) => {
    try {
        const worksheet = await Worksheet.findById(req.params.id)
            .populate("uploadedBy", "name email")
            .lean();

        if (!worksheet)
            return res.status(404).json({ success: false, error: "Worksheet not found." });

        return res.json({ success: true, worksheet });
    } catch (err) {
        console.error("Get error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

// ─── Download PDF ─────────────────────────────────────────────────────────────
// GET /api/worksheets/:id/download
const downloadWorksheet = async (req, res) => {
    try {
        const worksheet = await Worksheet.findById(req.params.id);

        if (!worksheet)
            return res.status(404).json({ success: false, error: "Worksheet not found." });

        const filePath = path.join(UPLOADS_DIR, worksheet.filename);
        if (!fs.existsSync(filePath))
            return res.status(404).json({ success: false, error: "File not found on disk." });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${encodeURIComponent(worksheet.originalName)}"`
        );
        fs.createReadStream(filePath).pipe(res);
    } catch (err) {
        console.error("Download error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

// ─── Update Worksheet ─────────────────────────────────────────────────────────
// PATCH /api/worksheets/:id
// Body: { notes?, date? }
const updateWorksheet = async (req, res) => {
    try {
        const { notes, date } = req.body;
        const update = {};
        if (notes !== undefined) update.notes = notes;
        if (date !== undefined) update.date = date;

        const worksheet = await Worksheet.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true, runValidators: true }
        );

        if (!worksheet)
            return res.status(404).json({ success: false, error: "Worksheet not found." });

        return res.json({ success: true, worksheet });
    } catch (err) {
        console.error("Update error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

// ─── Delete Worksheet ─────────────────────────────────────────────────────────
// DELETE /api/worksheets/:id
const deleteWorksheet = async (req, res) => {
    try {
        const worksheet = await Worksheet.findByIdAndDelete(req.params.id);

        if (!worksheet)
            return res.status(404).json({ success: false, error: "Worksheet not found." });

        // Remove file from disk
        const filePath = path.join(UPLOADS_DIR, worksheet.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        return res.json({ success: true, message: "Worksheet deleted successfully." });
    } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

module.exports = {
    uploadWorksheet,
    getWorksheets,
    getWorksheet,
    downloadWorksheet,
    updateWorksheet,
    deleteWorksheet,
};