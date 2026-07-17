import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Quiz, Course } from '../../types';
import { quizService } from '../../services/chat.service';

interface QuizGeneratorProps {
  courses: Course[];
  onQuizGenerated: (quiz: Quiz) => void;
}

export const QuizGenerator: React.FC<QuizGeneratorProps> = ({ courses, onQuizGenerated }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<'mcq' | 'short' | 'long' | 'mixed'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedCourse || !topic) {
      toast.error('Please select a course and enter a topic');
      return;
    }
    setIsGenerating(true);
    try {
      const quiz = await quizService.generate({ courseId: selectedCourse, topic, questionType, difficulty, count });
      onQuizGenerated(quiz);
      toast.success(`Generated ${quiz.totalQuestions} questions!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    easy: 'rgba(52,168,122,0.15)',
    medium: 'rgba(196,137,58,0.15)',
    hard: 'rgba(192,82,74,0.15)',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
          style={{ background: 'linear-gradient(135deg, rgba(79,93,200,0.14) 0%, rgba(124,111,194,0.2) 100%)', border: '1px solid rgba(79,93,200,0.22)' }}>
          📝
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Quiz Generator</h2>
          <p className="text-xs text-white/40">AI-powered questions from your course materials</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Course */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/60">Course</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
            className="input-field text-white">
            <option value="" className="bg-[#1a1d27]">Select a course...</option>
            {courses.map(c => (
              <option key={c._id} value={c._id} className="bg-[#1a1d27]">{c.title}</option>
            ))}
          </select>
        </div>

        {/* Topic */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/60">Topic</label>
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g., SQL Joins, Process Scheduling, TCP/IP..."
            className="input-field" />
        </div>

        {/* Question Type */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Question Type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(['mcq', 'short', 'long', 'mixed'] as const).map(type => (
              <button key={type} onClick={() => setQuestionType(type)}
                className="rounded-xl py-2 text-xs font-medium transition-all capitalize"
                style={{
                  background: questionType === type ? 'rgba(79,93,200,0.18)' : 'rgba(255,255,255,0.04)',
                  border: questionType === type ? '1px solid rgba(79,93,200,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  color: questionType === type ? '#8b94e0' : 'rgba(255,255,255,0.5)',
                }}>
                {type === 'mcq' ? 'MCQ' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="mb-2 block text-xs font-medium text-white/60">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className="rounded-xl py-2 text-xs font-medium transition-all capitalize"
                style={{
                  background: difficulty === d ? difficultyColors[d] : 'rgba(255,255,255,0.04)',
                  border: difficulty === d ? `1px solid ${d === 'easy' ? 'rgba(52,168,122,0.4)' : d === 'medium' ? 'rgba(196,137,58,0.4)' : 'rgba(192,82,74,0.4)'}` : '1px solid rgba(255,255,255,0.08)',
                  color: difficulty === d ? (d === 'easy' ? '#34a87a' : d === 'medium' ? '#c4893a' : '#c0524a') : 'rgba(255,255,255,0.5)',
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div>
          <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/60">
            <span>Number of Questions</span>
            <span className="text-white font-bold">{count}</span>
          </label>
          <input type="range" min={3} max={20} value={count} onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-primary-500 h-1" />
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>3</span><span>10</span><span>20</span>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary w-full">
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Quiz...
            </span>
          ) : (
            '✨ Generate Quiz'
          )}
        </button>
      </div>
    </motion.div>
  );
};
