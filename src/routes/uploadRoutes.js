import express from 'express';
import multer from 'multer';
import bucket from '../config/gcs.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png, and webp files are allowed'), false);
    }
  },
});

// Upload single image to Google Cloud Storage (Protected)
router.post('/', protect, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const fileName = `spot_tests/${Date.now()}-${req.file.originalname.replace(/\s+/g, '')}`;
    const blob = bucket.file(fileName);

    await blob.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    try {
      await blob.makePublic();
    } catch (err) {
      // Uniform Bucket-Level Access is likely enabled. 
      // Skipping makePublic without polluting the terminal.
    }

    const fileUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${fileName}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to Google Cloud Storage!',
      fileUrl,
      fileName,
    });
  } catch (error) {
    console.error('GCS Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error.message });
  }
});

export default router;
