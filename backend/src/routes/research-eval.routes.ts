import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  getBenchmarkQuestions,
  createBenchmarkQuestion,
  seedSampleBenchmarkQuestions,
  runExperimentBatch,
  getBlindedReviews,
  submitExpertReview,
  getEvaluation2Correctness,
  getEvaluation3GroundingValidation,
  getEvaluation4Congruency,
  getEvaluation5CostPerformance,
  getEvaluation6RetrievalMetrics,
} from '../controllers/research-eval.controller';

const router = Router();

// Protect all research evaluation routes
router.use(protect);

// Benchmark Question Management
router.get('/benchmark', authorize('admin', 'faculty'), getBenchmarkQuestions);
router.post('/benchmark', authorize('admin', 'faculty'), createBenchmarkQuestion);
router.post('/benchmark/seed', authorize('admin'), seedSampleBenchmarkQuestions);

// Ablation Experiment Execution Runner
router.post('/experiment/run', authorize('admin'), runExperimentBatch);

// Blinded Expert Review Endpoints (Faculty & Admin can review)
router.get('/blinded-reviews', authorize('admin', 'faculty'), getBlindedReviews);
router.post('/blinded-reviews/:anonymousId', authorize('admin', 'faculty'), submitExpertReview);

// Analytics endpoints for the 6 Research Evaluations
router.get('/eval2-correctness', authorize('admin', 'faculty'), getEvaluation2Correctness);
router.get('/eval3-grounding', authorize('admin', 'faculty'), getEvaluation3GroundingValidation);
router.get('/eval4-congruency', authorize('admin', 'faculty'), getEvaluation4Congruency);
router.get('/eval5-cost-performance', authorize('admin', 'faculty'), getEvaluation5CostPerformance);
router.get('/eval6-retrieval', authorize('admin', 'faculty'), getEvaluation6RetrievalMetrics);

export default router;
