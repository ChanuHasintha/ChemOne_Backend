import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { 
  createPhysicalExam, 
  getPhysicalExams, 
  updatePhysicalExam,
  deletePhysicalExam,
  uploadPhysicalResults, 
  getPhysicalExamResults,
  getBatchResultsForStudent,
  getMyPhysicalResults,
  notifyExamResults
} from '../controllers/physicalExamController.js';

const router = express.Router();

router.get('/', protect, getPhysicalExams);
router.get('/my-results', protect, getMyPhysicalResults);
router.get('/student-results/:id', protect, getBatchResultsForStudent);
router.post('/create', protect, adminOnly, createPhysicalExam);
router.put('/:id', protect, adminOnly, updatePhysicalExam);
router.delete('/:id', protect, adminOnly, deletePhysicalExam);
router.post('/upload-results', protect, adminOnly, uploadPhysicalResults);
router.get('/:id/results', protect, adminOnly, getPhysicalExamResults);
router.post('/:id/notify-results', protect, adminOnly, notifyExamResults);

export default router;
