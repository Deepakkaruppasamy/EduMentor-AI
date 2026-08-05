import api from './api';

const BASE = '/ai-evaluation';

export const aiEvaluationService = {
  getChatbot:       () => api.get(`${BASE}/chatbot`),
  getRAG:           () => api.get(`${BASE}/rag`),
  getExplain:       () => api.get(`${BASE}/explain`),
  getAssignments:   () => api.get(`${BASE}/assignments`),
  getNotes:         () => api.get(`${BASE}/notes`),
  getStudyPlanner:  () => api.get(`${BASE}/study-planner`),
  getResearch:      () => api.get(`${BASE}/research`),
  getSupportBot:    () => api.get(`${BASE}/support-bot`),
  getCommunication: () => api.get(`${BASE}/communication`),
  getFaculty:       () => api.get(`${BASE}/faculty`),
  getStudents:      () => api.get(`${BASE}/students`),
  getSystem:        () => api.get(`${BASE}/system`),
  getSecurity:      () => api.get(`${BASE}/security`),
  getTAM:           () => api.get(`${BASE}/tam`),
  submitTAM: (data: {
    perceivedUsefulness: number;
    perceivedEaseOfUse: number;
    attitudeTowardUse: number;
    behavioralIntention: number;
    selfEfficacy: number;
    systemAccessibility: number;
    overallSatisfaction: number;
    comments?: string;
  }) => api.post(`${BASE}/tam/submit`, data),

  // ── Research Evaluation (6-Study Infrastructure) ─────────────────
  getBenchmarkQuestions: () => api.get('/research-eval/benchmark'),
  createBenchmarkQuestion: (data: any) => api.post('/research-eval/benchmark', data),
  seedBenchmarkQuestions: () => api.post('/research-eval/benchmark/seed'),
  runExperimentBatch: (questionIds?: string[]) => api.post('/research-eval/experiment/run', { questionIds }),
  getBlindedReviews: () => api.get('/research-eval/blinded-reviews'),
  submitExpertReview: (anonymousId: string, data: any) => api.post(`/research-eval/blinded-reviews/${anonymousId}`, data),
  getEval2Correctness: () => api.get('/research-eval/eval2-correctness'),
  getEval3Grounding: () => api.get('/research-eval/eval3-grounding'),
  getEval4Congruency: () => api.get('/research-eval/eval4-congruency'),
  getEval5CostPerformance: () => api.get('/research-eval/eval5-cost-performance'),
  getEval6Retrieval: () => api.get('/research-eval/eval6-retrieval'),
  exportCSV: () => api.get('/research-eval/export/csv', { responseType: 'blob' }),
  exportJSON: () => api.get('/research-eval/export/json'),

  // Real AI Chat Sample Import & Management
  getAIChatCandidates: (params?: any) => api.get('/research-eval/chat-candidates', { params }),
  importAIChatSamples: (data: { selections: Array<{ chatId: string; messageId: string }>; samplingMethod?: string; randomSeed?: number }) => api.post('/research-eval/chat-samples/import', data),
  getImportedAIChatSamples: (params?: any) => api.get('/research-eval/chat-samples', { params }),
};


