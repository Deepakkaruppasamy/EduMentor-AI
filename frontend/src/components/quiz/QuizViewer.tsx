import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Quiz, QuizResults } from '../../types';
import { quizService } from '../../services/chat.service';

interface QuizViewerProps {
  quiz: Quiz;
  onComplete: (quiz: Quiz, results: QuizResults) => void;
}

export const QuizViewer: React.FC<QuizViewerProps> = ({ quiz, onComplete }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const totalQuestionsCount = quiz.questions.length;
  const answered = Object.entries(answers).filter(([_, val]) => val !== undefined && String(val).trim() !== '').length;

  const handleSubmit = async () => {
    if (answered < totalQuestionsCount) {
      toast.error(`Please answer all ${totalQuestionsCount} questions`);
      return;
    }
    setIsSubmitting(true);
    try {
      const { quiz: evaluated, results } = await quizService.evaluate(quiz._id, answers);
      onComplete(evaluated, results);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">{quiz.title}</h3>
            <p className="text-xs text-white/40">{quiz.totalQuestions} questions · {quiz.difficulty} · {quiz.type.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{answered}/{totalQuestionsCount}</div>
            <div className="text-[10px] text-white/40">Answered</div>
          </div>
        </div>
        {/* Progress */}
        <div className="progress-bar mt-3">
          <div className="progress-fill" style={{ width: `${totalQuestionsCount > 0 ? (answered / totalQuestionsCount) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Questions */}
      {quiz.questions.map((q, idx) => (
        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
          className="glass-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{ background: 'rgba(79,93,200,0.14)', color: '#8b94e0', border: '1px solid rgba(79,93,200,0.22)' }}>
              {idx + 1}
            </div>
            <p className="text-sm font-medium text-white leading-relaxed">{q.question}</p>
          </div>

          {q.type === 'mcq' && q.options && (
            <div className="grid gap-2 pl-9">
              {q.options.map((opt) => (
                <button key={opt.label} onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt.label }))}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-all"
                  style={{
                    background: answers[idx] === opt.label ? 'rgba(79,93,200,0.14)' : 'rgba(255,255,255,0.04)',
                    border: answers[idx] === opt.label ? '1px solid rgba(79,93,200,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: answers[idx] === opt.label ? '#8b94e0' : 'rgba(255,255,255,0.7)',
                  }}>
                  <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold
                    ${answers[idx] === opt.label ? 'border-primary-500 bg-primary-500/20 text-primary-400' : 'border-white/20 text-white/40'}`}>
                    {opt.label}
                  </div>
                  {opt.text}
                </button>
              ))}
            </div>
          )}

          {(q.type === 'short' || q.type === 'long') && (
            <textarea
              value={answers[idx] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
              placeholder={q.type === 'short' ? 'Write a brief answer...' : 'Write a detailed essay response...'}
              rows={q.type === 'short' ? 3 : 6}
              className="input-field ml-9 resize-none"
            />
          )}
        </motion.div>
      ))}

      <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Evaluating...
          </span>
        ) : '🎯 Submit Quiz'}
      </button>
    </motion.div>
  );
};
