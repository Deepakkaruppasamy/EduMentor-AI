import { Response } from 'express';
import FlashcardDeck from '../models/FlashcardDeck';
import Course from '../models/Course';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { generateFlashcards } from '../services/flashcard/flashcard.service';
import { hybridRetrieve } from '../services/rag/hybrid-rag.service';

/**
 * Generate a new flashcard deck for a topic using RAG
 */
export const generateDeck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, topic, count = 8 } = req.body;

  if (!courseId || !topic) {
    return res.status(400).json({ success: false, message: 'courseId and topic are required' });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  // Retrieve context for the topic to ensure high quality factual flashcards
  const ragResult = await hybridRetrieve(topic, course.chromaCollection, 5);

  const cards = await generateFlashcards(
    topic,
    course.title,
    ragResult.context || `Topic: ${topic} for ${course.title}`,
    Math.min(count, 15)
  );

  if (cards.length === 0) {
    return res.status(422).json({ success: false, message: 'Failed to generate flashcards. Try a different topic.' });
  }

  const deck = await FlashcardDeck.create({
    course: courseId,
    student: req.user?._id,
    title: `${topic} Study Cards`,
    topic,
    cards,
  });

  res.status(201).json({ success: true, deck });
});

/**
 * Get all decks for the logged-in student
 */
export const getDecks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.query;
  const filter: any = { student: req.user?._id };
  if (courseId) filter.course = courseId;

  const decks = await FlashcardDeck.find(filter)
    .populate('course', 'title code')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: decks.length, decks });
});

/**
 * Get a specific deck by ID
 */
export const getDeckById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deck = await FlashcardDeck.findOne({ _id: req.params.id, student: req.user?._id })
    .populate('course', 'title code');

  if (!deck) {
    return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
  }

  res.json({ success: true, deck });
});

/**
 * Delete a flashcard deck
 */
export const deleteDeck = asyncHandler(async (req: AuthRequest, res: Response) => {
  const deck = await FlashcardDeck.findOneAndDelete({ _id: req.params.id, student: req.user?._id });

  if (!deck) {
    return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
  }

  res.json({ success: true, message: 'Flashcard deck deleted successfully' });
});

/**
 * Review a specific card and update its SM-2 spaced-repetition attributes
 */
export const reviewCard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { deckId, cardId } = req.params;
  const { score } = req.body;

  if (score === undefined || score < 0 || score > 5) {
    return res.status(400).json({ success: false, message: 'score must be between 0 and 5' });
  }

  const deck = await FlashcardDeck.findOne({ _id: deckId, student: req.user?._id });
  if (!deck) {
    return res.status(404).json({ success: false, message: 'Flashcard deck not found' });
  }

  const card = (deck.cards as any).id(cardId);
  if (!card) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  const q = Number(score);
  let interval = card.interval || 0;
  let repetition = card.repetition || 0;
  let efactor = card.efactor || 2.5;

  if (q >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * efactor);
    }
    repetition++;
  } else {
    repetition = 0;
    interval = 1;
  }

  efactor = efactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (efactor < 1.3) efactor = 1.3;

  card.interval = interval;
  card.repetition = repetition;
  card.efactor = efactor;
  card.nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  await deck.save();

  res.json({ success: true, deck });
});
