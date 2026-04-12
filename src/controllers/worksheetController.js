import Worksheet from "../models/Worksheet.js";

// CREATE worksheet upload
export const uploadWorksheet = async (req, res) => {
    try {
        const { date, notes } = req.body;

        const newWorksheet = new Worksheet({
            fileName: req.file.originalname,
            fileUrl: req.file.path,
            publicId: req.file.filename,
            date,
            notes,
        });

        await newWorksheet.save();

        res.status(201).json({
            message: "Worksheet uploaded successfully",
            data: newWorksheet,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET all worksheets
export const getWorksheets = async (req, res) => {
    try {
        const data = await Worksheet.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE worksheet
export const deleteWorksheet = async (req, res) => {
    try {
        await Worksheet.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};