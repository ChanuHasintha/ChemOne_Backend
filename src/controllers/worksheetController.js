import Worksheet from '../models/Worksheet.js';
import WorksheetSubmission from '../models/WorksheetSubmission.js';
import bucket from '../config/gcs.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import User from '../models/User.js';

// CREATE worksheet upload
export const uploadWorksheet = async (req, res) => {
    try {
        const { date, notes, batch } = req.body;

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
            batch,
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
        let query = {};
        if (req.user && req.user.role === 'student' && req.user.batch) {
            query.$or = [
                { batch: req.user.batch },
                { batch: 'All' },
                { batch: { $exists: false } },
                { batch: null }
            ];
        }
        
        const data = await Worksheet.find(query).sort({ createdAt: -1 });

        // If the user is a student, fetch their submissions
        let studentSubmissions = [];
        if (req.user && req.user.role === 'student') {
            studentSubmissions = await WorksheetSubmission.find({ student: req.user.id });
        }

        // Generate signed URLs so files in private buckets can be opened/downloaded
        const tokenForLinks = req.headers.authorization?.split(' ')[1] || req.query.token || '';

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

            // Map student submission status
            let mySubmission = null;
            if (req.user && req.user.role === 'student') {
                const sub = studentSubmissions.find(s => s.worksheet.toString() === ws._id.toString());
                if (sub) {
                    let signedSubmissionUrl = sub.fileUrl;
                    if (sub.publicId) {
                        try {
                            const [url] = await bucket.file(sub.publicId).getSignedUrl({
                                version: 'v4', action: 'read', expires: Date.now() + 12 * 60 * 60 * 1000
                            });
                            signedSubmissionUrl = url;
                        } catch (err) {
                            console.error('Failed signed URL for submission:', sub.publicId);
                        }
                    }
                    mySubmission = {
                        ...sub.toObject(),
                        fileUrl: signedSubmissionUrl
                    };
                }
            }

            let signedOfficialAnswerUrl = null;
            // Only provide official answer URL if admin, 
            // OR if student AND they have a confirmed submission
            const isConfirmed = mySubmission && mySubmission.isConfirmed;
            if (req.user.role === 'instructor' || isConfirmed) {
                if (ws.officialAnswerPublicId) {
                    try {
                        const [url] = await bucket.file(ws.officialAnswerPublicId).getSignedUrl({
                            version: 'v4', action: 'read', expires: Date.now() + 12 * 60 * 60 * 1000
                        });
                        signedOfficialAnswerUrl = url;
                    } catch (err) {
                        console.error('Failed signed URL for official answer:', ws.officialAnswerPublicId);
                    }
                } else {
                    signedOfficialAnswerUrl = ws.officialAnswerUrl;
                }
            }

            return {
                ...ws.toObject(),
                fileUrl: (req.user.role === 'student' && ws.publicId) 
                    ? `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/worksheets/${ws._id}/view?token=${tokenForLinks}` 
                    : signedFileUrl,
                officialAnswerUrl: signedOfficialAnswerUrl,
                mySubmission
            };
        }));

        res.json(mappedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET single worksheet with watermark (Student only)
export const viewWorksheetWithWatermark = async (req, res) => {
    try {
        const { id } = req.params;
        const worksheet = await Worksheet.findById(id);
        if (!worksheet) return res.status(404).json({ message: 'Worksheet not found' });

        const student = await User.findById(req.user.id);
        const watermarkText = student.indexNumber || student.name || 'STUDENT';

        // Fetch PDF from GCS
        const [pdfBuffer] = await bucket.file(worksheet.publicId).download();

        // Load PDF
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        pages.forEach((page) => {
            const { width, height } = page.getSize();
            
            // Add diagonal watermark in center
            page.drawText(watermarkText, {
                x: width / 2 - 150,
                y: height / 2,
                size: 50,
                font: font,
                color: rgb(0.8, 0.2, 0.2), // Faint Reddish
                opacity: 0.15,
                rotate: { angle: 45, type: 'degrees' },
            });

            // Add small watermark at top and bottom of each page
            const footerText = `Student ID: ${watermarkText} | This document is for personal use only.`;
            page.drawText(footerText, {
                x: 40,
                y: 20,
                size: 8,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
                opacity: 0.5,
            });
        });

        const modifiedPdf = await pdfDoc.save();
        res.contentType('application/pdf');
        // Set disposition so browser knows it's an inline viewable but downloadable file
        res.setHeader('Content-Disposition', `inline; filename="${worksheet.fileName}"`);
        res.send(Buffer.from(modifiedPdf));

    } catch (error) {
        console.error('Watermark Error:', error);
        res.status(500).json({ message: 'Error processing PDF: ' + error.message });
    }
};

// DELETE worksheet 
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

// POST submit answer
export const submitWorksheetAnswer = async (req, res) => {
    try {
        const { id } = req.params; // Worksheet ID

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const worksheet = await Worksheet.findById(id);
        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }

        const existing = await WorksheetSubmission.findOne({ worksheet: id, student: req.user.id });
        if (existing) {
            return res.status(400).json({ message: 'You have already submitted an answer for this worksheet.' });
        }

        const fileName = `worksheet_answers/${Date.now()}-${req.file.originalname.replace(/\s+/g, '')}`;
        const blob = bucket.file(fileName);

        await blob.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype },
        });

        const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;

        const newSubmission = new WorksheetSubmission({
            student: req.user.id,
            worksheet: id,
            fileName: req.file.originalname,
            fileUrl,
            publicId: fileName,
        });

        await newSubmission.save();

        let signedSubmissionUrl = fileUrl;
        try {
            const [url] = await bucket.file(fileName).getSignedUrl({
                version: 'v4', action: 'read', expires: Date.now() + 12 * 60 * 60 * 1000
            });
            signedSubmissionUrl = url;
        } catch (err) {
            console.error('Failed signed URL for immediate submission:', fileName);
        }

        res.status(201).json({
            message: 'Answer submitted successfully',
            data: {
                ...newSubmission.toObject(),
                fileUrl: signedSubmissionUrl
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET submissions for a worksheet
export const getWorksheetSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        const submissions = await WorksheetSubmission.find({ worksheet: id })
            .populate('student', 'name indexNumber')
            .sort({ createdAt: -1 });

        const mappedData = await Promise.all(submissions.map(async (sub) => {
            let signedFileUrl = sub.fileUrl;
            if (sub.publicId) {
                try {
                    const options = {
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + 12 * 60 * 60 * 1000,
                    };
                    const [url] = await bucket.file(sub.publicId).getSignedUrl(options);
                    signedFileUrl = url;
                } catch (err) {
                    console.error('Failed generating signed URL for submission:', sub.publicId, err);
                }
            }
            return {
                ...sub.toObject(),
                fileUrl: signedFileUrl
            };
        }));

        res.json(mappedData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE student's answer
export const deleteWorksheetAnswer = async (req, res) => {
    try {
        const { id } = req.params; // Worksheet ID

        const submission = await WorksheetSubmission.findOne({ worksheet: id, student: req.user.id });
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        if (submission.isConfirmed) {
            return res.status(400).json({ message: 'Confirmed submissions cannot be deleted.' });
        }

        if (submission.publicId) {
            try {
                await bucket.file(submission.publicId).delete();
            } catch (err) {
                console.warn('GCS delete warning:', err.message);
            }
        }

        await WorksheetSubmission.findByIdAndDelete(submission._id);
        res.json({ message: 'Answer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST confirm student's answer
export const confirmWorksheetSubmission = async (req, res) => {
    try {
        const { id } = req.params; // Worksheet ID

        const submission = await WorksheetSubmission.findOne({ worksheet: id, student: req.user.id });
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        submission.isConfirmed = true;
        await submission.save();

        res.json({ message: 'Answer confirmed successfully', data: submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST upload official answer (admin)
export const uploadOfficialAnswer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const worksheet = await Worksheet.findById(id);
        if (!worksheet) {
            return res.status(404).json({ message: 'Worksheet not found' });
        }

        // Auto delete old official answer if it exists
        if (worksheet.officialAnswerPublicId) {
            try {
                await bucket.file(worksheet.officialAnswerPublicId).delete();
            } catch (err) {
                console.warn('GCS old official answer delete warning:', err.message);
            }
        }

        const fileName = `worksheet_official_answers/${Date.now()}-${req.file.originalname.replace(/\s+/g, '')}`;
        const blob = bucket.file(fileName);

        await blob.save(req.file.buffer, {
            metadata: { contentType: req.file.mimetype },
        });

        const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;

        worksheet.officialAnswerUrl = fileUrl;
        worksheet.officialAnswerPublicId = fileName;
        await worksheet.save();

        res.status(200).json({
            success: true,
            message: 'Official answer uploaded successfully',
            data: worksheet
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};