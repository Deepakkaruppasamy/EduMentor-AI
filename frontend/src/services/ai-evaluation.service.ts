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
};
