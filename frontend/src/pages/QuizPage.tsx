import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QuizGenerator } from '../components/quiz/QuizGenerator';
import { QuizViewer } from '../components/quiz/QuizViewer';
import { QuizResultsView } from '../components/quiz/QuizResults';
import { LiveBattleScreen } from '../components/quiz/LiveBattleScreen';
import { OralExamScreen } from '../components/quiz/OralExamScreen';
import { courseService } from '../services/course.service';
import { quizService } from '../services/chat.service';
import { Course, Quiz, QuizResults } from '../types';
import { useAuthStore } from '../store/auth.store';
import { formatDate, getGradeColor } from '../utils/uuid';
import toast from 'react-hot-toast';

type QuizState = 'generate' | 'taking' | 'results';

export const QuizPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [quizState, setQuizState] = useState<QuizState>('generate');
  const [pastQuizzes, setPastQuizzes] = useState<Quiz[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'practice' | 'assigned'>('practice');
  const [showLiveBattle, setShowLiveBattle] = useState(false);
  const [showOralExam, setShowOralExam] = useState(false);

  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

  useEffect(() => {
    Promise.all([
      courseService.getAll(),
      quizService.getMy(),
    ]).then(([c, q]) => {
      setCourses(c);
      setPastQuizzes(q);
    }).catch(err => toast.error('Failed to load data')).finally(() => setIsLoadingHistory(false));
  }, []);

  const handleQuizGenerated = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setQuizState('taking');
  };

  const handleQuizComplete = (quiz: Quiz, quizResults: QuizResults) => {
    setCurrentQuiz(quiz);
    setResults(quizResults);
    setQuizState('results');
    // Refresh the list so it includes the completed status and score
    quizService.getMy().then(setPastQuizzes).catch(() => {});
  };

  const handleSelectPastQuiz = async (quizId: string) => {
    const loadingToast = toast.loading('Loading quiz...');
    try {
      const fullQuiz = await quizService.getById(quizId);
      if (fullQuiz.status === 'completed') {
        const score = fullQuiz.score || 0;
        const maxScore = fullQuiz.maxScore || 0;
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        const quizResults: QuizResults = {
          score,
          maxScore,
          percentage,
          grade: percentage >= 90 ? 'A' : percentage >= 75 ? 'B' : percentage >= 60 ? 'C' : percentage >= 45 ? 'D' : 'F',
          feedback: percentage >= 75 ? '🎉 Excellent work!' : percentage >= 45 ? '📚 Good effort, keep studying!' : '⚠️ Needs more practice on this topic.',
        };
        setCurrentQuiz(fullQuiz);
        setResults(quizResults);
        setQuizState('results');
      } else {
        setCurrentQuiz(fullQuiz);
        setResults(null);
        setQuizState('taking');
      }
      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to load quiz');
    }
  };

  const practiceQuizzes = pastQuizzes.filter(q => !q.assignedBy);
  const assignedQuizzes = pastQuizzes.filter(q => q.assignedBy);

  if (showLiveBattle) {
    return (
      <div className="p-6">
        <LiveBattleScreen courses={courses} onClose={() => setShowLiveBattle(false)} />
      </div>
    );
  }

  if (showOralExam) {
    return (
      <div className="p-6">
        <OralExamScreen courses={courses} onBack={() => setShowOralExam(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {quizState === 'generate' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">📝 Assessments & Quizzes</h1>
            <p className="mt-1 text-sm text-white/40">AI-powered quizzes from your course materials</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
            {/* Live Battle Launcher Button */}
            <button
              onClick={() => setShowLiveBattle(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-indigo-500/20"
              style={{ background: 'linear-gradient(135deg, #4f63ff 0%, #9f7aea 100%)' }}
            >
              ⚔️ {isFaculty ? 'Host Live Quiz Battle' : 'Join Live Quiz Battle'}
            </button>

            {!isFaculty && (
              <button
                onClick={() => setShowOralExam(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all duration-300 hover:scale-[1.02] bg-gradient-to-r from-red-500 to-rose-600 border border-red-500/20 shadow-lg shadow-red-500/10"
              >
                🎙️ Take AI Oral Exam
              </button>
            )}

            {/* Tab Selector */}
            <div className="flex gap-2 bg-white/[0.02] border border-white/[0.06] p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('practice')}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: activeTab === 'practice' ? 'rgba(79,99,255,0.15)' : 'transparent',
                  color: activeTab === 'practice' ? '#7c8fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                Practice Arena
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                style={{
                  background: activeTab === 'assigned' ? 'rgba(79,99,255,0.15)' : 'transparent',
                  color: activeTab === 'assigned' ? '#7c8fff' : 'rgba(255,255,255,0.4)',
                }}
              >
                Class Assignments
                {assignedQuizzes.filter(q => q.status !== 'completed').length > 0 && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main taking/results screen full width to minimize clutter */}
      {quizState !== 'generate' ? (
        <div className="max-w-4xl mx-auto">
          {quizState === 'taking' && currentQuiz && (
            <QuizViewer quiz={currentQuiz} onComplete={handleQuizComplete} />
          )}
          {quizState === 'results' && currentQuiz && results && (
            <QuizResultsView
              quiz={currentQuiz}
              results={results}
              onRetry={() => { setQuizState('taking'); }}
              onNewQuiz={() => { setCurrentQuiz(null); setResults(null); setQuizState('generate'); }}
            />
          )}
        </div>
      ) : activeTab === 'practice' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Practice Generator */}
          <div className="lg:col-span-2">
            <QuizGenerator courses={courses} onQuizGenerated={handleQuizGenerated} />
          </div>

          {/* Practice History */}
          <div className="glass-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-white/80">🕐 Practice History</h2>
            {isLoadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse bg-white/5" />)}
              </div>
            ) : practiceQuizzes.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">No practice quizzes taken yet</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {practiceQuizzes.map((quiz) => (
                  <div key={quiz._id} onClick={() => handleSelectPastQuiz(quiz._id)}
                    className="rounded-xl p-3 cursor-pointer hover:bg-white/[0.06] active:bg-white/[0.04] transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{quiz.topic || quiz.title}</p>
                        <p className="text-[10px] text-white/40">{quiz.type.toUpperCase()} · {quiz.difficulty}</p>
                      </div>
                      {quiz.status === 'completed' && quiz.score !== undefined && (
                        <span className={`text-sm font-bold flex-shrink-0 ${getGradeColor(quiz.maxScore > 0 ? (quiz.score / quiz.maxScore) * 100 : 0)}`}>
                          {quiz.maxScore > 0 ? Math.round((quiz.score / quiz.maxScore) * 100) : 0}%
                        </span>
                      )}
                      {quiz.status === 'generated' && (
                        <span className="text-[10px] text-white/30">Generated</span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-white/25">{formatDate(quiz.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Assigned Quizzes Arena */
        <div className="space-y-4">
          {isLoadingHistory ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-2xl animate-pulse bg-white/5" />)}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedQuizzes.map(quiz => {
                const isCompleted = quiz.status === 'completed';
                const isOverdue = !isCompleted && quiz.dueDate && new Date() > new Date(quiz.dueDate);

                let badgeText = 'Pending';
                let badgeBg = 'rgba(79,99,255,0.1)';
                let badgeColor = '#7c8fff';

                if (isCompleted) {
                  badgeText = `Completed (${quiz.maxScore > 0 ? Math.round(((quiz.score || 0) / quiz.maxScore) * 100) : 0}%)`;
                  badgeBg = 'rgba(72,187,120,0.1)';
                  badgeColor = '#48bb78';
                } else if (isOverdue) {
                  badgeText = 'Overdue';
                  badgeBg = 'rgba(252,129,129,0.1)';
                  badgeColor = '#fc8181';
                }

                const courseCode = quiz.course && typeof quiz.course === 'object' ? quiz.course.code : 'Course';
                const courseTitle = quiz.course && typeof quiz.course === 'object' ? quiz.course.title : 'Course';
                const facultyName = quiz.assignedBy && typeof quiz.assignedBy === 'object' ? (quiz.assignedBy as any).name : 'Instructor';

                return (
                  <div key={quiz._id} className="glass-card p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-white/30 font-mono">
                          {courseCode}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: badgeBg, color: badgeColor }}>
                          {badgeText}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white mt-2 leading-snug">{quiz.topic || quiz.title}</h3>
                      <p className="text-[10px] text-white/40 mt-1.5 flex items-center gap-1">
                        <span>👨‍🏫</span>
                        <span className="truncate max-w-[150px]">{facultyName}</span>
                      </p>
                      <p className="text-[10px] text-white/30 truncate max-w-full font-mono mt-0.5">{courseTitle}</p>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] text-white/30">
                        {quiz.dueDate ? `Due: ${new Date(quiz.dueDate).toLocaleDateString()}` : 'No due date'}
                      </span>
                      <button
                        onClick={() => handleSelectPastQuiz(quiz._id)}
                        className={`py-1.5 px-4 text-xs font-semibold rounded-xl transition-all duration-200 ${
                          isCompleted ? 'btn-secondary' : 'btn-primary'
                        }`}
                      >
                        {isCompleted ? 'Review' : 'Start Quiz'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {assignedQuizzes.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <p className="text-white/40">No assigned quizzes found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
