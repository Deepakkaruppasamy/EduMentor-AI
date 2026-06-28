import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  querySupportChat,
  createTicket,
  getTickets,
  getTicketDetails,
  replyToTicket,
  updateTicketAdmin,
  submitFeedback,
  createAnnouncement,
  getAnnouncements,
  getSupportAnalytics,
} from '../controllers/support.controller';

const router = Router();

// Apply auth protection globally to support center routes
router.use(protect);

// ── Support Chat Bot ─────────────────────────────────────────
router.post('/chat', querySupportChat);

// ── Support Tickets ──────────────────────────────────────────
router.post('/ticket/create', createTicket);
router.get('/tickets', getTickets);
router.get('/tickets/:id', getTicketDetails);
router.post('/tickets/:id/message', replyToTicket);
router.put('/ticket/update/:id', authorize('admin'), updateTicketAdmin);

// ── Customer Satisfaction (CSAT) ─────────────────────────────
router.post('/feedback', submitFeedback);

// ── Announcements ────────────────────────────────────────────
router.post('/announcements', authorize('admin'), createAnnouncement);
router.get('/announcements', getAnnouncements);

// ── Analytics ────────────────────────────────────────────────
router.get('/analytics', authorize('admin'), getSupportAnalytics);

export default router;
