import Worksheet from '../models/Worksheet.js';
import bucket from '../config/gcs.js';
import dotenv from 'dotenv';

dotenv.config();

// CREATE worksheet upload
export const uploadWorksheet = async (req, res) => {
    try {
        const { date, notes } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Build a unique GCS object path
        const fileName = `worksheets/${Date.now()}-${req.file.originalname.replace(/\s+/g, '')}`;
        const blob = bucket.file(fileName);

        await blob.save(req.file.buffer, {
            metadata: { contentType: 'application/pdf' },
        });

        try {
            await blob.makePublic();
        } catch (err) {
            // Uniform Bucket-Level Access is likely enabled.
            // Skipping makePublic without polluting the terminal.
        }

        const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;

        const newWorksheet = new Worksheet({
            fileName: req.file.originalname,
            fileUrl,
            publicId: fileName, // GCS path — used for deletion
            date,
            notes,
        });

        await newWorksheet.save();

        res.status(201).json({
            message: 'Worksheet uploaded successfully',
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
        
        // Generate signed URLs so files in private buckets can be opened/downloaded
        const mappedData = await Promise.all(data.map(async (ws) => {
            let signedFileUrl = ws.fileUrl; // Fallback to original URL
            if (ws.publicId) {
                try {
                    const options = {
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
                    };
                    const [url] = await bucket.file(ws.publicId).getSignedUrl(options);
                    signedFileUrl = url;
                } catch (err) {
                    console.error('Failed generating signed URL for:', ws.publicId, err);
                }
            }
            return {
                ...ws.toObject(),
                fileUrl: signedFileUrl
            };
        }));

        res.json(mappedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE worksheet (removes from both MongoDB and GCS)
export const deleteWorksheet = async (req, res) => {
    try {
        const worksheet = await Worksheet.findById(req.params.id);

        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }

        // Also delete the file from GCS if a path is stored
        if (worksheet.publicId) {
            try {
                await bucket.file(worksheet.publicId).delete();
            } catch (gcsError) {
                // Log but don't block the delete if GCS file is already gone
                console.warn('GCS delete warning:', gcsError.message);
            }
        }

        await Worksheet.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};