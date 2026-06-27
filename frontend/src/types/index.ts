// ─── Auth Types ────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  courses?: Course[];
  avatar?: string;
  bio?: string;
  qualifications?: string;
  department?: string;
  preferredLanguage?: string;
  isFirstLogin?: boolean;
  semester?: number;
  phone?: string;
  courseName?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ─── Course Types ───────────────────────────────────────────────────────────
export interface Course {
  _id: string;
  title: string;
  code: string;
  description: string;
  faculty: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    qualifications?: string;
    department?: string;
  } | string;
  students: string[];
  documents: Document[];
  chromaCollection: string;
  isActive: boolean;
  image?: string;
  createdAt: string;
}

// ─── Document Types ─────────────────────────────────────────────────────────
export interface Document {
  _id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt' | 'mp3' | 'wav' | 'm4a' | 'webm' | 'mpeg';
  fileSize: number;
  course: string | Course;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  summary?: string;
  conceptMap?: string;
  transcript?: string;
  processingError?: string;
  createdAt: string;
}

// ─── Chat Types ─────────────────────────────────────────────────────────────
export interface ChatSource {
  rank: number;
  documentName: string;
  pageNumber?: number;
  excerpt: string;
  relevanceScore: number;
  confidencePercent: number;
}

export interface HallucinationInfo {
  trustScore: number;
  status: 'verified' | 'partially_verified' | 'hallucinated';
  verdict: string;
  flags: string[];
}

export interface ExplainabilityInfo {
  sources: ChatSource[];
  overallConfidence: number;
  retrievalMethod: string;
  explanationSummary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  trustScore?: number;
  confidenceScore?: number;
  hallucination?: HallucinationInfo;
  explainability?: ExplainabilityInfo;
  conceptGraph?: any;
  explanations?: {
    simply?: string;
    detail?: string;
    example?: string;
    realWorld?: string;
    exam?: string;
  };
  isLoading?: boolean;
}

export interface ChatSession {
  _id: string;
  title: string;
  course: Course | string;
  totalMessages: number;
  updatedAt: string;
  createdAt: string;
}

// ─── Quiz Types ─────────────────────────────────────────────────────────────
export interface QuizOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  question: string;
  type: 'mcq' | 'short' | 'long';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
  topic?: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  feedback?: string;
}

export interface Quiz {
  _id: string;
  title: string;
  course: Course | string;
  questions: QuizQuestion[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq' | 'short' | 'long' | 'mixed';
  topic?: string;
  totalQuestions: number;
  score?: number;
  maxScore: number;
  status: 'generated' | 'in_progress' | 'completed';
  completedAt?: string;
  assignedBy?: { _id: string; name: string; email: string } | string;
  dueDate?: string;
  assignmentId?: string;
  createdAt: string;
}

export interface QuizResults {
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  feedback: string;
}

// ─── Analytics Types ────────────────────────────────────────────────────────
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalQueries: number;
  totalChats: number;
  totalQuizzes: number;
  totalDocuments: number;
  totalCourses: number;
  avgTrustScore: number;
  avgHallucinationRate: number;
  topTopics: { topic: string; count: number }[];
}

export interface StudentProgress {
  totalQueries: number;
  totalQuizzesTaken: number;
  avgQuizScore: number;
  recentChats: ChatSession[];
  recentQuizzes: Quiz[];
  courseProgress?: {
    courseId: string;
    title: string;
    code: string;
    progress: number;
  }[];
}

// ─── Recommendation Types ───────────────────────────────────────────────────
export interface TopicProgress {
  topic: string;
  queryCount: number;
  avgScore: number;
  strength: 'weak' | 'moderate' | 'strong';
}

export interface Recommendation {
  _id: string;
  weakTopics: string[];
  strongTopics: string[];
  topicProgress: TopicProgress[];
  suggestedTopics: string[];
  revisionPlan: string;
  personalizedQuizTopics: string[];
  resourceRecommendations?: {
    category: 'Lecture Slides' | 'PDFs' | 'Books' | 'YouTube Videos' | 'Research Papers';
    title: string;
    description: string;
    link?: string;
  }[];
  totalQueries: number;
  avgQuizScore: number;
  learningStreak: number;
  lastUpdated: string;
}

// ─── API Response Types ──────────────────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
