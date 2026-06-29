import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getAIChatbotMetrics,
  getRAGMetrics,
  getExplainMetrics,
  getAssignmentMetrics,
  getNotesMetrics,
  getStudyPlannerMetrics,
  getResearchMetrics,
  getSupportBotMetrics,
  getCommunicationMetrics,
  getFacultyMetrics,
  getStudentMetrics,
  getSystemMetrics,
  getSecurityMetrics,
  getTAMResults,
  submitTAMSurvey,
} from '../controllers/ai-evaluation.controller';

const router = Router();

// ── TAM: any authenticated user can submit their survey ───────
router.post('/tam/submit', protect, submitTAMSurvey);

// ── All other endpoints: admin only ──────────────────────────
router.use(protect, authorize('admin'));

router.get('/chatbot', getAIChatbotMetrics);
router.get('/rag', getRAGMetrics);
router.get('/explain', getExplainMetrics);
router.get('/assignments', getAssignmentMetrics);
router.get('/notes', getNotesMetrics);
router.get('/study-planner', getStudyPlannerMetrics);
router.get('/research', getResearchMetrics);
router.get('/support-bot', getSupportBotMetrics);
router.get('/communication', getCommunicationMetrics);
router.get('/faculty', getFacultyMetrics);
router.get('/students', getStudentMetrics);
router.get('/system', getSystemMetrics);
router.get('/security', getSecurityMetrics);
router.get('/tam', getTAMResults);

export default router;
