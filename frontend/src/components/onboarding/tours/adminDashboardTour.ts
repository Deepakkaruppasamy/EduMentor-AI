import { TourStep } from '../../../store/onboarding.store';

export const adminDashboardTour: TourStep[] = [
  {
    targetId: 'admin-dashboard-welcome',
    title: 'Welcome, Administrator!',
    description: 'Here are your system-wide governance, diagnostics, and management controls.',
    placement: 'center'
  },
  {
    targetId: 'nav-users',
    title: 'User Management Directory',
    description: 'Provision accounts, update roles (student, faculty, admin), restrict messaging, or delete users.',
    placement: 'right'
  },
  {
    targetId: 'nav-ai-eval',
    title: 'RAG / AI Evaluation Studio',
    description: 'Audit AI answer accuracy, groundness, trust scores, and run diagnostics against Groq, Llama, and Embedding pipelines.',
    placement: 'right'
  },
  {
    targetId: 'system-health-indicator',
    title: 'System Diagnostics & Telemetry',
    description: 'Monitor server CPU, memory, MongoDB connectivity, ChromaDB storage levels, and incoming alerts.',
    placement: 'bottom'
  }
];
export type { TourStep };
