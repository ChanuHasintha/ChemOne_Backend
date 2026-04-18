import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { 
  createPhysicalExam, 
  getPhysicalExams, 
  uploadPhysicalResults, 
  getPhysicalExamResults,
  getBatchResultsForStudent
} from '../controllers/physicalExamController.js';

const router = express.Router();

router.get('/', protect, getPhysicalExams);
router.get('/student-results/:id', protect, getBatchResultsForStudent);
router.post('/create', protect, adminOnly, createPhysicalExam);
router.post('/upload-results', protect, adminOnly, uploadPhysicalResults);
router.get('/:id/results', protect, adminOnly, getPhysicalExamResults);

export default router;
