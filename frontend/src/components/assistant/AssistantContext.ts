export interface QuickAction {
  label: string;
  emoji: string;
  prompt?: string;    // pre-fill input with this
  href?: string;      // navigate to this path
}

export interface PageContext {
  greeting: string;
  description: string;
  tips: string[];
  quickActions: QuickAction[];
}

// ─── Student Quick Actions ───────────────────────────────────────────────────
const studentGlobalActions: QuickAction[] = [
  { label: 'Study Tips', emoji: '💡', prompt: 'Give me 3 effective study tips for university students.' },
  { label: 'Open Chat', emoji: '💬', href: '/chat' },
  { label: 'Start Quiz', emoji: '📝', href: '/quiz' },
  { label: 'Generate Notes', emoji: '📓', href: '/notes-generator' },
];

const facultyGlobalActions: QuickAction[] = [
  { label: 'Faculty AI', emoji: '🧙', href: '/faculty-ai-assistant' },
  { label: 'Gradebook', emoji: '📒', href: '/gradebook' },
  { label: 'Analytics', emoji: '📊', href: '/analytics' },
  { label: 'Create Quiz', emoji: '⚔️', href: '/quiz' },
];

const adminGlobalActions: QuickAction[] = [
  { label: 'Dashboard', emoji: '📈', href: '/admin' },
  { label: 'User Directory', emoji: '👥', href: '/admin/users' },
  { label: 'Analytics', emoji: '📊', href: '/analytics' },
  { label: 'AI Evaluation', emoji: '🧪', href: '/ai-evaluation' },
];

// ─── Page-specific contexts ──────────────────────────────────────────────────
const PAGE_CONTEXTS: Record<string, Omit<PageContext, 'quickActions'>> = {
  '/dashboard': {
    greeting: 'Welcome back! Ready to continue your learning journey? 🎓',
    description: 'Your student dashboard shows your progress, recent activity, and quick access to all tools.',
    tips: [
      'Reviewing notes within 24 hours improves retention by 60%.',
      'Attempt a quiz after each study session to reinforce concepts.',
      'Use the AI Study Planner to schedule topics before exams.',
    ],
  },
  '/admin': {
    greeting: 'Welcome to your admin dashboard! 📈',
    description: 'Manage users, courses, analytics, and platform performance from here.',
    tips: [
      'Check the Analytics page weekly to monitor AI usage trends.',
      'Review the AI Evaluation page to assess model performance.',
      'Use Announcements to broadcast important updates to all users.',
    ],
  },
  '/chat': {
    greeting: 'AI Chat Tutor is ready! Ask anything about your courses. 💬',
    description: 'This RAG-powered tutor answers questions based on your uploaded course documents.',
    tips: [
      'Ask follow-up questions to deepen your understanding.',
      'Type "explain simply" to get beginner-friendly explanations.',
      'Use "give me an example" for practical demonstrations.',
    ],
  },
  '/quiz': {
    greeting: 'Quiz Generator is ready! Need a practice test? 📝',
    description: 'Generate custom quizzes by topic and difficulty, or join a live quiz battle.',
    tips: [
      'Start with easy difficulty and work your way up.',
      'Review wrong answers immediately for better retention.',
      'Use Mixed type quizzes to simulate real exam conditions.',
    ],
  },
  '/flashcards': {
    greeting: 'Flashcards help you memorize key concepts faster! 🎴',
    description: 'Create and review AI-generated flashcard decks for any subject.',
    tips: [
      'Review flashcards at least 3 times for long-term retention.',
      'Use spaced repetition — revisit difficult cards more often.',
      'Create topic-specific decks for focused study sessions.',
    ],
  },
  '/notes-generator': {
    greeting: 'Generate comprehensive notes from any content! 📓',
    description: 'Upload documents or record voice lectures to generate structured study notes.',
    tips: [
      'Record your professor\'s lecture and generate instant notes.',
      'Combine notes with the flashcard generator for a complete study workflow.',
      'Export notes as PDF for offline study.',
    ],
  },
  '/research-assistant': {
    greeting: 'Research Assistant can summarize papers and generate citations! 🔬',
    description: 'Upload research papers to get AI-powered summaries, key findings, and citation suggestions.',
    tips: [
      'Upload your paper draft to get suggestions for missing citations.',
      'Use the summary to quickly assess if a paper is relevant.',
      'Cross-reference multiple papers for a stronger literature review.',
    ],
  },
  '/assignment-evaluator': {
    greeting: 'Get your assignment graded by AI before submitting! 📋',
    description: 'Upload your assignment to receive detailed feedback, scores, and improvement suggestions.',
    tips: [
      'Use AI feedback to revise before your final submission.',
      'Compare your assignment score to course requirements.',
      'Check the "Improvements" section for specific things to fix.',
    ],
  },
  '/plagiarism-checker': {
    greeting: 'AI Plagiarism Checker analyzes your document for originality! 🔍',
    description: 'Upload PDF, DOCX, or TXT files to get similarity scores, highlighted sections, and AI suggestions.',
    tips: [
      'A similarity score under 30% is generally considered acceptable in academia.',
      'Always add citations for statistics, quotes, and key claims.',
      'Paraphrasing is not enough — proper attribution is required.',
    ],
  },
  '/study-planner': {
    greeting: 'Your AI Study Planner helps you organize exam preparation! 🗓️',
    description: 'Create personalized study schedules based on your subjects and exam dates.',
    tips: [
      'Break large topics into 30–45 minute focused sessions.',
      'Include short breaks between sessions (Pomodoro technique).',
      'Prioritize weak topics identified by the Recommendations engine.',
    ],
  },
  '/recommendations': {
    greeting: 'AI Recommendations analyze your learning patterns! 🎯',
    description: 'View personalized topic recommendations based on your quiz scores and chat history.',
    tips: [
      'Focus on "Weak" topics first — they have the highest improvement potential.',
      'Strong topics can be maintained with occasional quiz reviews.',
      'Revisit recommendations weekly as your learning progresses.',
    ],
  },
  '/meetings': {
    greeting: 'Schedule meetings with faculty from this page! 📅',
    description: 'Request appointments, view upcoming meetings, and manage your schedule.',
    tips: [
      'Prepare 3–5 specific questions before each faculty meeting.',
      'Meetings are most productive when you come with examples of your confusion.',
      'Use Office Hours for quick questions and appointments for deep dives.',
    ],
  },
  '/office-hours': {
    greeting: 'Join the Office Hours queue to get live faculty help! 🏫',
    description: 'Connect with faculty during their office hours for real-time guidance.',
    tips: [
      'Check the queue status before joining to estimate wait time.',
      'Bring specific assignments or quiz questions to discuss.',
      'Regular office hours participation improves academic performance.',
    ],
  },
  '/calendar': {
    greeting: 'Track all your academic events and deadlines here! 📆',
    description: 'View and manage your academic calendar with exams, assignments, and events.',
    tips: [
      'Add study sessions to your calendar to build consistent habits.',
      'Set reminders 3 days before assignment deadlines.',
      'Color-code different subjects for quick visual identification.',
    ],
  },
  '/courses': {
    greeting: 'Browse and manage your courses! 📚',
    description: 'View all enrolled courses, upload documents, and access course materials.',
    tips: [
      'Upload lecture PDFs to enable AI Chat Tutor for that subject.',
      'Check course descriptions for hidden learning objectives.',
      'Engage with all available course documents for comprehensive RAG coverage.',
    ],
  },
  '/documents': {
    greeting: 'Upload and manage course documents here! 📁',
    description: 'Upload PDF, DOCX, PPTX, MP3, and other files to build the knowledge base.',
    tips: [
      'Well-indexed documents give the AI tutor more accurate answers.',
      'Upload lecture slides, textbook chapters, and past papers.',
      'Documents marked "completed" are ready for AI querying.',
    ],
  },
  '/analytics': {
    greeting: 'View platform analytics and usage statistics! 📊',
    description: 'Analyze student engagement, AI usage, quiz performance, and course activity.',
    tips: [
      'Compare monthly trends to identify peak engagement periods.',
      'Low quiz scores in a topic indicate content gaps to address.',
      'Use analytics to tailor your teaching strategy.',
    ],
  },
  '/gradebook': {
    greeting: 'Review and manage student grades! 📒',
    description: 'Track assignment scores, quiz results, and overall student performance.',
    tips: [
      'Filter by course to analyze performance in specific subjects.',
      'Students with consistently low scores may need additional support.',
      'Use the Assignment Evaluator for AI-assisted grading.',
    ],
  },
  '/faculty-ai-assistant': {
    greeting: 'Faculty AI Assistant helps you create course content! 🧙',
    description: 'Generate quizzes, assignments, notes, and educational content with AI.',
    tips: [
      'Generate quizzes in batch and review before publishing.',
      'Use AI to create differentiated content for different difficulty levels.',
      'Cross-reference AI-generated content with your expertise before use.',
    ],
  },
  '/support': {
    greeting: 'Support Center is here to help! 🛠️',
    description: 'Submit tickets, track issues, and get help from administrators.',
    tips: [
      'Include screenshots or error messages in your ticket for faster resolution.',
      'Check if your issue is listed in the FAQ before submitting a ticket.',
      'Urgent issues should be marked as "High Priority".',
    ],
  },
  '/profile': {
    greeting: 'Manage your profile and preferences! 👤',
    description: 'Update your personal information, language, and notification settings.',
    tips: [
      'Set your preferred language to get AI responses in your native language.',
      'Keep your department information current for better recommendations.',
      'Upload a profile photo to personalize your account.',
    ],
  },
  '/messages': {
    greeting: 'Stay connected with your academic community! ✉️',
    description: 'Send and receive messages with faculty, students, and administrators.',
    tips: [
      'Faculty messages receive priority attention during office hours.',
      'Group conversations help coordinate project teams efficiently.',
      'Archive important messages for future reference.',
    ],
  },
  '/announcements': {
    greeting: 'Stay up to date with the latest announcements! 📣',
    description: 'View and manage important announcements from faculty and administrators.',
    tips: [
      'Mark important announcements to easily find them later.',
      'Faculty can post course-specific or global announcements.',
      'Check announcements regularly to avoid missing deadlines.',
    ],
  },
  '/reports': {
    greeting: 'View comprehensive AI-generated reports! 🖨️',
    description: 'Access detailed reports on learning progress, AI usage, and academic performance.',
    tips: [
      'Export reports as PDF to share with advisors.',
      'Compare reports across months to track improvement.',
      'Use report insights to adjust your study strategy.',
    ],
  },
  '/feedback': {
    greeting: 'Share your feedback to help improve EduMentor AI! 💬',
    description: 'Submit feedback, rate features, and suggest improvements.',
    tips: [
      'Specific feedback is more actionable than general ratings.',
      'Report bugs with steps to reproduce for faster fixes.',
      'Feature requests are reviewed by the development team weekly.',
    ],
  },
  '/ai-evaluation': {
    greeting: 'Monitor AI model performance and quality! 🧪',
    description: 'Evaluate Llama 3 responses, hallucination rates, and RAG accuracy.',
    tips: [
      'High hallucination rates indicate the knowledge base needs more documents.',
      'Low trust scores suggest questions are outside the course material scope.',
      'Run evaluations monthly to track model quality over time.',
    ],
  },
};

const GLOBAL_TIPS = [
  'Reviewing topics within 24 hours improves retention by 60%.',
  'Attempt quizzes after each study session to test your understanding.',
  'Use the Explain Mode for difficult concepts.',
  'Consistent daily study is more effective than last-minute cramming.',
  'The Pomodoro Technique: 25 min study, 5 min break.',
  'Ask "why" and "how" questions for deeper understanding.',
  'Teach concepts to others to solidify your own knowledge.',
  'Use the Research Assistant for literature reviews.',
  'Set specific, measurable study goals for each session.',
];

export function getPageContext(
  pathname: string,
  role: 'student' | 'faculty' | 'admin'
): PageContext {
  const ctx = PAGE_CONTEXTS[pathname] || {
    greeting: `Welcome to EduMentor AI! How can I help you today? 🎓`,
    description: 'I can help you navigate the platform, answer questions, and suggest learning tools.',
    tips: GLOBAL_TIPS.slice(0, 3),
  };

  const roleActions =
    role === 'admin'
      ? adminGlobalActions
      : role === 'faculty'
      ? facultyGlobalActions
      : studentGlobalActions;

  // Page-specific quick action overrides
  const pageSpecificActions: Record<string, QuickAction[]> = {
    '/dashboard': [
      { label: 'Continue Study', emoji: '📖', href: '/study-planner' },
      { label: 'Take Quiz', emoji: '📝', href: '/quiz' },
      { label: 'Generate Notes', emoji: '📓', href: '/notes-generator' },
      { label: 'Research', emoji: '🔬', href: '/research-assistant' },
    ],
    '/quiz': [
      { label: 'New Quiz', emoji: '➕', prompt: 'How do I generate a new quiz on a specific topic?' },
      { label: 'Live Battle', emoji: '⚔️', prompt: 'How do I join a live quiz battle?' },
      { label: 'Quiz Tips', emoji: '💡', prompt: 'Give me 3 tips for improving quiz scores.' },
      { label: 'Study Plan', emoji: '🗓️', href: '/study-planner' },
    ],
    '/plagiarism-checker': [
      { label: 'Upload Guide', emoji: '📤', prompt: 'What file types can I upload for plagiarism checking?' },
      { label: 'Citation Help', emoji: '📚', prompt: 'Explain APA citation format for academic papers.' },
      { label: 'Originality Tips', emoji: '✍️', prompt: 'How can I improve the originality score of my document?' },
      { label: 'Research', emoji: '🔬', href: '/research-assistant' },
    ],
    '/chat': [
      { label: 'Explain Topic', emoji: '💡', prompt: 'Explain this concept in simple terms: ' },
      { label: 'Exam Tips', emoji: '📝', prompt: 'Give me tips for preparing for university exams.' },
      { label: 'Practice Q', emoji: '❓', prompt: 'Generate 3 practice questions on the topic I\'m studying.' },
      { label: 'Flashcards', emoji: '🎴', href: '/flashcards' },
    ],
    '/research-assistant': [
      { label: 'Citation Help', emoji: '📚', prompt: 'Explain how to properly cite a research paper in APA format.' },
      { label: 'Summary Tips', emoji: '📋', prompt: 'What makes a good research paper summary?' },
      { label: 'Upload Guide', emoji: '📤', prompt: 'What file formats are supported for research paper upload?' },
      { label: 'Plagiarism', emoji: '🔍', href: '/plagiarism-checker' },
    ],
  };

  const quickActions = pageSpecificActions[pathname] || roleActions;

  return {
    ...ctx,
    quickActions,
    tips: ctx.tips.length ? ctx.tips : GLOBAL_TIPS.slice(0, 3),
  };
}

export function getRandomTip(): string {
  return GLOBAL_TIPS[Math.floor(Math.random() * GLOBAL_TIPS.length)];
}

export { GLOBAL_TIPS };
