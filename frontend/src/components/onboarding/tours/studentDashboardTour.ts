import { TourStep } from '../../../store/onboarding.store';

export const studentDashboardTour: TourStep[] = [
  {
    targetId: 'dashboard-welcome',
    title: 'Welcome to EduMentor AI!',
    description: 'This is your personal learning assistant dashboard. Let us show you around!',
    placement: 'center'
  },
  {
    targetId: 'nav-chat',
    title: 'AI Tutor Chat',
    description: 'Chat with your AI Tutor, get explanations, work through concepts, and ask questions about your course content.',
    placement: 'right'
  },
  {
    targetId: 'nav-quiz',
    title: 'Quiz Arena & Generator',
    description: 'Test your understanding by generating mock exams or joining real-time live battles hosted by your faculty.',
    placement: 'right'
  },
  {
    targetId: 'mobile-notif-bell',
    title: 'Instant Notifications',
    description: 'Stay updated when quizzes are assigned, evaluations are completed, or announcements are posted.',
    placement: 'bottom'
  },
  {
    targetId: 'cmd-palette-trigger',
    title: 'Universal Command Palette',
    description: 'Press Ctrl+K (or Cmd+K) anywhere to instantly search files, trigger actions, or navigate pages.',
    placement: 'bottom'
  },
  {
    targetId: 'nav-profile',
    title: 'Your Account & Customization',
    description: 'Configure theme, language, font size, accessibility settings, and customize your AI Avatar.',
    placement: 'right'
  }
];
