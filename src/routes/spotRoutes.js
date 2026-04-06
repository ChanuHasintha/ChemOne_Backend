import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createTest, getTests, getTestById, submitTest } from '../controllers/spotTestController.js';

const router = express.Router();

// Get all tests
router.get('/', protect, getTests);

// Get single test
router.get('/:id', protect, getTestById);

// Create test (Admin only)
router.post('/create', protect, createTest);

// Submit test (Student only)
router.post('/submit', protect, submitTest);

export default router;
