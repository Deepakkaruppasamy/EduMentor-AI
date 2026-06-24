import { Router } from 'express';
import { generateDeck, getDecks, getDeckById, deleteDeck, reviewCard } from '../controllers/flashcard.controller';
import { protect } from '../middleware/auth';

const router = Router();

// All flashcard endpoints require authentication
router.use(protect);

router.post('/generate', generateDeck);
router.get('/my', getDecks);
router.get('/:id', getDeckById);
router.delete('/:id', deleteDeck);
router.post('/:deckId/cards/:cardId/review', reviewCard);

export default router;
