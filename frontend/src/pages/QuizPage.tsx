import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QuizGenerator } from '../components/quiz/QuizGenerator';
import { QuizViewer } from '../components/quiz/QuizViewer';
import { QuizResultsView } from '../components/quiz/QuizResults';
import { courseService } from '../services/course.service';
import { quizService } from '../services/chat.service';
import { Course, Quiz, QuizResults } from '../types';
import { formatDate, getGradeColor } from '../utils/uuid';
import toast from 'react-hot-toast';

type QuizState = 'generate' | 'taking' | 'results';

export const QuizPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResults | null>(null);
  const [quizState, setQuizState] = useState<QuizState>('generate');
  const [pastQuizzes, setPastQuizzes] = useState<Quiz[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Quiz Generator</h1>
        <p className="mt-1 text-sm text-white/40">AI-powered quizzes from your course materials</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Quiz Area */}
        <div className="lg:col-span-2">
          {quizState === 'generate' && (
            <QuizGenerator courses={courses} onQuizGenerated={handleQuizGenerated} />
          )}
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

        {/* Quiz History */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white/80">🕐 Quiz History</h2>
          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
            </div>
          ) : pastQuizzes.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-8">No quizzes yet</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {pastQuizzes.map((quiz, i) => (
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
    </div>
  );
};
