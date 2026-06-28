import { Router } from 'express';
import { protect } from '../middleware/auth';
import { createEvent, getEvents, updateEvent, deleteEvent } from '../controllers/calendar.controller';

const router = Router();
router.use(protect);

router.get('/', getEvents);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
