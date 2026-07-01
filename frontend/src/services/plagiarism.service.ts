import api from './api';

export interface PlagiarismHighlight {
  text: string;
  startIndex: number;
  endIndex: number;
  similarityPercent: number;
  reason?: string;
}

export interface CitationAnalysis {
  missingCitations: string[];
  incorrectReferences: string[];
  duplicateReferences: string[];
  formattingIssues: string[];
}

export interface PlagiarismReport {
  _id: string;
  userId: { _id: string; name: string; email: string; role: string } | string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentText?: string;
  similarityScore: number;
  originalityScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  highlightedSections: PlagiarismHighlight[];
  aiSuggestions: string[];
  citationAnalysis: CitationAnalysis;
  wordCount: number;
  pageCount?: number;
  createdAt: string;
}

export interface PlagiarismAnalytics {
  totalDocuments: number;
  averageSimilarity: number;
  highRiskDocuments: number;
  moderateRiskDocuments: number;
  lowRiskDocuments: number;
  facultyUsage: number;
  studentUsage: number;
  adminUsage: number;
  monthlyStats: { year: number; month: number; count: number; avgSimilarity: number }[];
}

export const plagiarismService = {
  analyzeDocument: async (file: File): Promise<{ report: PlagiarismReport }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/plagiarism/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large docs
    });
    return res.data;
  },

  getReports: async (page = 1, limit = 10): Promise<{
    reports: PlagiarismReport[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    const res = await api.get('/plagiarism', { params: { page, limit } });
    return res.data;
  },

  getReportById: async (id: string): Promise<{ report: PlagiarismReport }> => {
    const res = await api.get(`/plagiarism/${id}`);
    return res.data;
  },

  getAnalytics: async (): Promise<PlagiarismAnalytics> => {
    const res = await api.get('/plagiarism/analytics');
    return res.data;
  },

  deleteReport: async (id: string): Promise<void> => {
    await api.delete(`/plagiarism/${id}`);
  },
};
