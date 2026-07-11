import { Router } from 'express';
import { protect } from '../../../middleware/auth';
import {
  explainText,
  translateSelectedText,
  generateQuizFromText,
  generateFlashcardsFromText,
  generateCitation,
  getAssignmentFeedback,
  explainMistakes,
} from '../controller/contextualActions.controller';

const router = Router();

// Secure all contextual actions endpoints
router.use(protect);

router.post('/explain', explainText);
router.post('/translate', translateSelectedText);
router.post('/generate-quiz', generateQuizFromText);
router.post('/generate-flashcards', generateFlashcardsFromText);
router.post('/citation', generateCitation);
router.post('/assignment-feedback', getAssignmentFeedback);
router.post('/explain-mistakes', explainMistakes);

export default router;
