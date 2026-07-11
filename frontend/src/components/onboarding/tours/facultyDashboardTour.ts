import { TourStep } from '../../../store/onboarding.store';

export const facultyDashboardTour: TourStep[] = [
  {
    targetId: 'admin-dashboard-welcome',
    title: 'Welcome, Faculty member!',
    description: 'This dashboard gives you administrative control over your courses, materials, and student progression.',
    placement: 'center'
  },
  {
    targetId: 'nav-documents',
    title: 'Document Processing & RAG',
    description: 'Upload course slides, handouts, and recordings here. They will be automatically summarized, concept-mapped, and indexed for AI tutoring.',
    placement: 'right'
  },
  {
    targetId: 'nav-gradebook',
    title: 'Gradebook & Evaluations',
    description: 'Monitor student performance, look at automated AI grading breakdowns, and confirm manual grades.',
    placement: 'right'
  },
  {
    targetId: 'nav-quiz-faculty',
    title: 'Quiz Battle Arena',
    description: 'Create and launch real-time multi-player Live Quiz Battles for your classroom to boost engagement.',
    placement: 'right'
  },
  {
    targetId: 'nav-analytics',
    title: 'Deep Analytics Insights',
    description: 'Check concept weaknesses, activity engagement timelines, and average AI trust/hallucination metrics.',
    placement: 'right'
  }
];
