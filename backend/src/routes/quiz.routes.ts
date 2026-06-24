import { Router } from 'express';
import { generateQuiz, evaluateQuiz, getStudentQuizzes, getQuizById } from '../controllers/quiz.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/generate', protect, generateQuiz);
router.post('/evaluate', protect, evaluateQuiz);
router.get('/my', protect, getStudentQuizzes);
router.get('/:id', protect, getQuizById);

export default router;
