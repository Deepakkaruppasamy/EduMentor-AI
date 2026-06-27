import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { courseService } from '../services/course.service';
import { Course, Recommendation } from '../types';
import toast from 'react-hot-toast';
import { Loader } from '../components/common/Loader';

export const RecommendationsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    courseService.getAll().then(c => { setCourses(c); if (c.length) setSelectedCourse(c[0]._id); });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setIsLoading(true);
    api.get('/recommendations', { params: { courseId: selectedCourse } })
      .then(({ data }) => setRecommendation(data.recommendation))
      .catch(() => toast.error('Failed to load recommendations'))
      .finally(() => setIsLoading(false));
  }, [selectedCourse]);

  const handleGeneratePlan = async () => {
    setIsGenerating(true);
    try {
      const { data } = await api.post('/recommendations/generate-plan', { courseId: selectedCourse });
      setRecommendation(data.recommendation);
      toast.success('Personalized plan generated!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const strengthColors: Record<string, string> = { weak: '#fc8181', moderate: '#f6ad55', strong: '#48bb78' };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">🎯 Personalized Recommendations</h1>
        <p className="mt-1 text-sm text-white/40">AI-powered learning plan based on your progress</p>
      </div>

      {/* Course selector */}
      <div className="flex items-center gap-3">
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="input-field max-w-xs">
          {courses.map(c => <option key={c._id} value={c._id} className="bg-[#1a1d27]">{c.title}</option>)}
        </select>
        <button onClick={handleGeneratePlan} disabled={isGenerating} className="btn-primary text-sm py-2">
          {isGenerating ? '⏳ Generating...' : '✨ Generate Plan'}
        </button>
      </div>

      {isLoading ? (
        <Loader message="Synthesizing personalized study plan..." />
      ) : !recommendation ? (
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-base font-semibold text-white">No Data Yet</h3>
          <p className="mt-2 text-sm text-white/40">Start chatting and taking quizzes to get personalized recommendations.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Stats */}
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white/80">📈 Learning Stats</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Total Queries', value: recommendation.totalQueries },
                { label: 'Avg Quiz Score', value: `${Math.round(recommendation.avgQuizScore)}%` },
                { label: 'Learning Streak', value: `${recommendation.learningStreak}d` },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: 'rgba(79,99,255,0.1)', border: '1px solid rgba(79,99,255,0.2)' }}>
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-[10px] text-white/40">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Topic Progress */}
            {recommendation.topicProgress.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-medium text-white/50">Topic Strengths</h3>
                <div className="space-y-2">
                  {recommendation.topicProgress.slice(0, 6).map(tp => (
                    <div key={tp.topic} className="flex items-center gap-3">
                      <span className="w-24 text-[11px] text-white/60 truncate">{tp.topic}</span>
                      <div className="progress-bar flex-1">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, tp.queryCount * 10)}%`, background: strengthColors[tp.strength] }} />
                      </div>
                      <span className="text-[10px] capitalize" style={{ color: strengthColors[tp.strength] }}>{tp.strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Plan & Suggestions */}
          <div className="space-y-4">
            {recommendation.weakTopics.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="mb-3 text-xs font-semibold text-red-400">⚠️ Weak Topics (Need Review)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.weakTopics.map(t => (
                    <span key={t} className="rounded-full px-2.5 py-1 text-[11px]"
                      style={{ background: 'rgba(252,129,129,0.1)', border: '1px solid rgba(252,129,129,0.2)', color: '#fc8181' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {recommendation.suggestedTopics.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="mb-3 text-xs font-semibold text-blue-400">💡 Suggested Topics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.suggestedTopics.map(t => (
                    <span key={t} className="rounded-full px-2.5 py-1 text-[11px]"
                      style={{ background: 'rgba(79,99,255,0.1)', border: '1px solid rgba(79,99,255,0.2)', color: '#7c8fff' }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {recommendation.revisionPlan && (
              <div className="glass-card p-4">
                <h3 className="mb-3 text-xs font-semibold text-green-400">📅 Revision Plan</h3>
                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">{recommendation.revisionPlan}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Resource Recommendations */}
        <div className="glass-card p-6 border border-white/5 shadow-md mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-white/5">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>📚</span> AI Resource Recommendations
              </h2>
              <p className="text-[11px] text-white/40 mt-0.5">Targeted learning material recommended by the AI based on your weak concepts</p>
            </div>
            <span className="text-[9px] text-white/40 font-mono tracking-widest uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              Resource Engine v1
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {['Lecture Slides', 'PDFs', 'Books', 'YouTube Videos', 'Research Papers'].map((category) => {
              // Find recommended item for this category
              let item = recommendation.resourceRecommendations?.find(r => r.category === category);
              
              // Fallback Generator if not populated by LLM yet
              if (!item) {
                const weakTopic = recommendation.weakTopics[0] || 'Core Course Concepts';
                const fallbackResources: Record<string, { title: string; description: string; link?: string }> = {
                  'Lecture Slides': {
                    title: `${weakTopic} Lecture Companion`,
                    description: `Review chapter slides and lecture annotations for ${weakTopic}.`,
                    link: '#'
                  },
                  'PDFs': {
                    title: `${weakTopic} Reference Sheet`,
                    description: `Printable cheat sheet covering key formulas and terminology.`,
                    link: '#'
                  },
                  'Books': {
                    title: `Modern Computer Science - ${weakTopic}`,
                    description: `Recommended textbook reading on the theoretical foundations of ${weakTopic}.`,
                    link: '#'
                  },
                  'YouTube Videos': {
                    title: `Mastering ${weakTopic} - Tutorial`,
                    description: `Comprehensive video tutorial explaining the practical applications of ${weakTopic}.`,
                    link: 'https://www.youtube.com'
                  },
                  'Research Papers': {
                    title: `Seminal Study on ${weakTopic}`,
                    description: `Read the original academic paper introducing the concepts of ${weakTopic}.`,
                    link: '#'
                  }
                };
                item = {
                  category: category as any,
                  ...fallbackResources[category]
                };
              }

              // Category icons
              const categoryIcons: Record<string, string> = {
                'Lecture Slides': '📊',
                'PDFs': '📄',
                'Books': '📚',
                'YouTube Videos': '🎥',
                'Research Papers': '🔬'
              };

              const linkLabel = category === 'YouTube Videos' 
                ? 'Watch Tutorial ↗' 
                : category === 'Research Papers' 
                  ? 'Read Paper ↗' 
                  : 'View Document ↗';

              return (
                <div key={category} className="p-4 rounded-2xl border border-white/5 bg-[#12151e]/50 flex flex-col justify-between space-y-4 hover:border-primary-500/20 hover:bg-[#12151e]/80 transition-all group">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl group-hover:scale-110 transition-transform duration-300">{categoryIcons[category]}</span>
                      <span className="text-[9px] font-extrabold uppercase text-white/40 tracking-wider font-mono">{category}</span>
                    </div>
                    <h4 className="text-[11px] font-bold text-white leading-snug group-hover:text-primary-300 transition-colors truncate">{item.title}</h4>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium line-clamp-3">{item.description}</p>
                  </div>

                  {item.link && (
                    <a 
                      href={item.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] font-bold py-1.5 w-full bg-white/5 group-hover:bg-primary-600 border border-white/10 group-hover:border-primary-500 text-center text-white rounded-lg transition-all"
                    >
                      {linkLabel}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
