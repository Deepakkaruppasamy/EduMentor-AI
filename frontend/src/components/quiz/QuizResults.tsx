import React from 'react';
import { motion } from 'framer-motion';
import { Quiz, QuizResults } from '../../types';
import { getGradeColor } from '../../utils/uuid';

interface QuizResultsProps {
  quiz: Quiz;
  results: QuizResults;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export const QuizResultsView: React.FC<QuizResultsProps> = ({ quiz, results, onRetry, onNewQuiz }) => {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
      {/* Score Card */}
      <div className="glass-card p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5"
          style={{ background: 'radial-gradient(circle at 50% 50%, #4f5dc8 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="text-6xl mb-3">{results.percentage >= 75 ? '🏆' : results.percentage >= 50 ? '📚' : '💪'}</div>
          <div className={`text-5xl font-black mb-1 ${getGradeColor(results.percentage)}`}>{results.grade}</div>
          <div className="text-xl font-bold text-white">{results.percentage}%</div>
          <div className="text-sm text-white/40 mt-1">{results.score} / {results.maxScore} correct</div>
          <p className="mt-3 text-sm text-white/60">{results.feedback}</p>
        </div>
      </div>

      {/* Question Review */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/70 px-1">Review Answers</h3>
        {quiz.questions.map((q, idx) => (
          <div key={idx} className="glass-card p-4 space-y-2">
            <div className="flex items-start gap-2">
              <span className={`flex-shrink-0 text-sm ${q.isCorrect === true ? 'text-green-400' : q.isCorrect === false ? 'text-red-400' : 'text-white/40'}`}>
                {q.isCorrect === true ? '✅' : q.isCorrect === false ? '❌' : '📝'}
              </span>
              <p className="text-sm text-white/80">{q.question}</p>
            </div>
            {q.type === 'mcq' && (
              <div className="pl-6 space-y-1 text-xs">
                <div className="text-white/50">Your answer: <span className={q.isCorrect ? 'text-green-400' : 'text-red-400'}>{q.studentAnswer || 'Not answered'}</span></div>
                {!q.isCorrect && <div className="text-white/50">Correct: <span className="text-green-400">{q.correctAnswer}</span></div>}
                {q.explanation && <div className="text-white/40 mt-1 italic">{q.explanation}</div>}
              </div>
            )}
            {(q.type === 'short' || q.type === 'long') && (
              <div className="pl-6 space-y-2 text-xs">
                <div className="text-white/50">Your answer: <span className="text-white">{q.studentAnswer || 'Not answered'}</span></div>
                <div className="text-white/50">Expected points: <span className="text-green-400">{q.correctAnswer || 'N/A'}</span></div>
                {q.explanation && <div className="text-white/40 mt-1 italic">Rubric: {q.explanation}</div>}
                {q.feedback && <div className="text-primary-400 mt-1 font-semibold">AI Evaluator: {q.feedback}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onRetry} className="btn-secondary">🔄 Try Again</button>
        <button onClick={onNewQuiz} className="btn-primary">✨ New Quiz</button>
      </div>
    </motion.div>
  );
};
