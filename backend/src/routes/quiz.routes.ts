import { Router } from 'express';
import {
  generateQuiz,
  evaluateQuiz,
  getStudentQuizzes,
  getQuizById,
  assignQuiz,
  getAssignedQuizzesList,
  getAssignmentDetailAnalytics,
  evaluateOralAnswer,
} from '../controllers/quiz.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/generate', protect, generateQuiz);
router.post('/evaluate', protect, evaluateQuiz);
router.post('/evaluate-oral', protect, evaluateOralAnswer);
router.get('/my', protect, getStudentQuizzes);

// Faculty & Admin assigned quizzes routes
router.post('/assign', protect, authorize('faculty', 'admin'), assignQuiz);
router.get('/assignments', protect, authorize('faculty', 'admin'), getAssignedQuizzesList);
router.get('/assignments/:assignmentId', protect, authorize('faculty', 'admin'), getAssignmentDetailAnalytics);

router.get('/:id', protect, getQuizById);

export default router;
