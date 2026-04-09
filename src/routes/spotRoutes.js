import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import { createTest, getTests, getTestById, submitTest, updateTest, deleteTest, togglePublishTest, getTestSubmissions } from '../controllers/spotTestController.js';

const router = express.Router();

// Get all tests
router.get('/', protect, getTests);

// Get single test
router.get('/:id', protect, getTestById);

// Get submissions for a test (Admin only)
router.get('/:id/submissions', getTestSubmissions);

// Create test (Admin only)
router.post('/create', protect, adminOnly, createTest);

// Update test (Admin only)
router.put('/:id', protect, adminOnly, updateTest);

// Delete test (Admin only)
router.delete('/:id', protect, adminOnly, deleteTest);

// Toggle Publish test (Admin only)
router.patch('/:id/publish', protect, adminOnly, togglePublishTest);

// Submit test (Student only)
router.post('/submit', protect, submitTest);

export default router;
