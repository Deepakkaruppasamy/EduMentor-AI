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
  getEvaluation7LearningEffectiveness,
  submitLearningStudy,
  getTAMFactorAnalysis,
  exportResearchDataCSV,
  exportResearchDataJSON,
  exportRealAIChatSamplesCSV,
  getAIChatCandidates,
  importAIChatSamples,
  getImportedAIChatSamples,
} from '../controllers/research-eval.controller';

const router = Router();

// Protect all research evaluation routes
router.use(protect);

// Real AI Chat Sample Management & Selection
router.get('/chat-candidates', authorize('admin', 'faculty'), getAIChatCandidates);
router.post('/chat-samples/import', authorize('admin', 'faculty'), importAIChatSamples);
router.get('/chat-samples', authorize('admin', 'faculty'), getImportedAIChatSamples);

// Benchmark Question Management
router.get('/benchmark', authorize('admin', 'faculty'), getBenchmarkQuestions);
router.post('/benchmark', authorize('admin', 'faculty'), createBenchmarkQuestion);
router.post('/benchmark/seed', authorize('admin', 'faculty'), seedSampleBenchmarkQuestions);

// Ablation Experiment Execution Runner
router.post('/experiment/run', authorize('admin', 'faculty'), runExperimentBatch);

// Learning Effectiveness Study Submissions
router.post('/learning/submit', submitLearningStudy);

// Blinded Expert Review Endpoints (Faculty & Admin can review)
router.get('/blinded-reviews', authorize('admin', 'faculty'), getBlindedReviews);
router.post('/blinded-reviews/:anonymousId', authorize('admin', 'faculty'), submitExpertReview);

// Analytics endpoints for the 7 Research Evaluations + TAM PCA
router.get('/eval2-correctness', authorize('admin', 'faculty'), getEvaluation2Correctness);
router.get('/eval3-grounding', authorize('admin', 'faculty'), getEvaluation3GroundingValidation);
router.get('/eval4-congruency', authorize('admin', 'faculty'), getEvaluation4Congruency);
router.get('/eval5-cost-performance', authorize('admin', 'faculty'), getEvaluation5CostPerformance);
router.get('/eval6-retrieval', authorize('admin', 'faculty'), getEvaluation6RetrievalMetrics);
router.get('/eval7-learning', authorize('admin', 'faculty'), getEvaluation7LearningEffectiveness);
router.get('/tam-pca', authorize('admin', 'faculty'), getTAMFactorAnalysis);

// Data Export Endpoints (CSV & JSON)
router.get('/export/csv', authorize('admin', 'faculty'), exportResearchDataCSV);
router.get('/export/json', authorize('admin', 'faculty'), exportResearchDataJSON);
router.get('/export/real-chat-csv', authorize('admin', 'faculty'), exportRealAIChatSamplesCSV);

export default router;


