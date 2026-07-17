import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';
import { StudentProgress } from '../types';
import { formatDate } from '../utils/uuid';
import { Loader } from '../components/common/Loader';
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard';
import { preferenceService, UserPreferences } from '../services/preference.service';
import { appointmentService } from '../services/appointment.service';
import { calendarService } from '../services/calendar.service';
import { AIDashboardOverview } from '../components/dashboard/AIDashboardOverview';
import { BookmarksWidget } from '../components/dashboard/BookmarksWidget';
import { RecentlyViewedWidget } from '../components/dashboard/RecentlyViewedWidget';
import { DashboardLayoutManager } from '../components/dashboard/DashboardLayoutManager';
import { WidgetWrapper } from '../components/dashboard/WidgetWrapper';
import { useOnboardingStore } from '../store/onboarding.store';
import { studentDashboardTour } from '../components/onboarding/tours/studentDashboardTour';
import toast from 'react-hot-toast';
import { pageVariants, pageChildVariants, listContainerVariants, listItemVariants } from '../utils/motion';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { PageTransition } from '../components/common/PageTransition';


const StatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; gradient: string }> = ({ icon, label, value, sub, gradient }) => (
  <motion.div
    variants={pageChildVariants}
    className="glass-card p-5"
    whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.16)', transition: { duration: 0.18 } }}
    whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
  >
    <div className="flex items-start gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${gradient}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">
          {typeof value === 'number'
            ? <AnimatedNumber value={value} />
            : value
          }
        </div>
        <div className="text-xs text-white/50">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-white/30">{sub}</div>}
      </div>
    </div>
  </motion.div>
);

type HeatmapView = 'instant' | 'weakness' | 'map';

const HeatmapSection: React.FC<{ courseProgress: { courseId: string; title: string; code: string; progress: number }[] }> = ({ courseProgress }) => {
  const [view, setView] = useState<HeatmapView>('instant');

  const getTheme = (val: number) => {
    if (val >= 85) return { badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', bar: 'bg-emerald-500', blockColor: 'text-emerald-400' };
    if (val >= 60) return { badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', bar: 'bg-indigo-500', blockColor: 'text-indigo-400' };
    return { badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30', bar: 'bg-rose-500', blockColor: 'text-rose-400' };
  };

  const filtered = view === 'weakness'
    ? [...courseProgress].sort((a, b) => a.progress - b.progress)
    : view === 'map'
    ? [...courseProgress].sort((a, b) => b.progress - a.progress)
    : courseProgress;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🧠</span> Learning Heatmap &amp; Subject Mastery
        </h2>
        <div className="flex items-center gap-1">
          {(['instant', 'weakness', 'map'] as HeatmapView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                view === v
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                  : 'text-white/25 hover:text-white/50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {courseProgress.length === 0 ? (
        <div className="text-center py-6 text-xs text-white/30 italic">No active courses enrolled yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((course) => {
              const theme = getTheme(course.progress);
              const totalBlocks = 10;
              const filled = Math.round((course.progress / 100) * totalBlocks);
              return (
                <motion.div
                  key={course.courseId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col gap-3 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold text-white/35 tracking-wider font-mono block">{course.code}</span>
                      <h3 className="text-xs font-semibold text-white truncate" title={course.title}>{course.title}</h3>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 whitespace-nowrap ${theme.badge}`}>
                      {course.progress}% Mastery
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="font-mono text-xs tracking-wider select-none">
                      <span className={theme.blockColor}>{'█'.repeat(filled)}</span>
                      <span className="text-white/10">{'░'.repeat(totalBlocks - filled)}</span>
                    </div>
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${theme.bar}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${course.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export const StudentDashboard: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  
  // Custom Widget Data
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [recommendation, setRecommendation] = useState<any>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTouchIndex, setActiveTouchIndex] = useState<number | null>(null);

  const quizScoreData = progress?.recentQuizzes?.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.maxScore > 0 ? Math.round(((q.score || 0) / q.maxScore) * 100) : 0,
    topic: q.topic || 'Quiz',
  })) || [];

  const fetchDashboardData = async () => {
    try {
      const [progRes, leaderboardRes, prefsData, appRes, calRes, assignRes, actRes] = await Promise.all([
        api.get('/analytics/progress'),
        api.get('/analytics/leaderboard'),
        preferenceService.get(),
        appointmentService.getMy().catch(() => ({ data: { data: [] } })),
        calendarService.getEvents().catch(() => ({ data: { data: [] } })),
        api.get('/assignment-evaluations/history').catch(() => ({ data: { evaluations: [] } })),
        api.get('/activity').catch(() => ({ data: { logs: [] } })),
      ]);

      setProgress(progRes.data.progress);
      if (progRes.data.progress?.courses && updateUser) {
        updateUser({ courses: progRes.data.progress.courses });
      }
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setPrefs(prefsData);
      setAppointments(appRes.data?.data || []);
      setCalendarEvents(calRes.data?.data || []);
      const assignmentsList = assignRes.data?.evaluations || assignRes.data?.data || (Array.isArray(assignRes.data) ? assignRes.data : []);
      setAssignments(assignmentsList);
      setActivityLogs(actRes.data?.logs || []);

      // Fetch AI Recommendations based on course progress
      let recData = null;
      if (progRes.data?.progress?.courseProgress?.length > 0) {
        const cId = progRes.data.progress.courseProgress[0].courseId;
        const recRes = await api.get('/recommendations', { params: { courseId: cId } }).catch(() => null);
        if (recRes) recData = recRes.data.recommendation;
      }
      setRecommendation(recData);
    } catch (err) {
      console.error('Failed to load student dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { startTour, hasTourCompleted } = useOnboardingStore();

  useEffect(() => {
    if (!isLoading && !hasTourCompleted('student-dashboard')) {
      startTour('student-dashboard', studentDashboardTour);
    }
  }, [isLoading]);

  const handleUpdateWidget = async (id: string, updates: any) => {
    if (!prefs) return;
    const list = prefs.dashboard.widgets.map(w => (w.id === id ? { ...w, ...updates } : w));
    try {
      const updated = await preferenceService.update({
        dashboard: { widgets: list },
      });
      setPrefs(updated);
    } catch {
      toast.error('Failed to update widget preference');
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     Mouse Drag-and-Drop Handlers
  ───────────────────────────────────────────────────────────────────────────── */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !prefs) return;

    const list = [...prefs.dashboard.widgets];
    // Swap items
    const temp = list[draggedIndex];
    list[draggedIndex] = list[index];
    list[index] = temp;

    try {
      const updated = await preferenceService.update({
        dashboard: { widgets: list },
      });
      setPrefs(updated);
    } catch {
      toast.error('Failed to save layout order.');
    } finally {
      setDraggedIndex(null);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     Touch Drag-and-Drop Handlers (Touchscreens)
  ───────────────────────────────────────────────────────────────────────────── */
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setActiveTouchIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    // Touch move tracking (visual snap indicator could go here)
  };

  const handleTouchEnd = async (e: React.TouchEvent, index: number) => {
    if (activeTouchIndex === null || !prefs) return;

    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropTarget = element?.closest('[data-drag-index]');

    if (dropTarget) {
      const dropIndexAttr = dropTarget.getAttribute('data-drag-index');
      if (dropIndexAttr !== null) {
        const targetIdx = parseInt(dropIndexAttr);
        if (activeTouchIndex !== targetIdx) {
          const list = [...prefs.dashboard.widgets];
          const temp = list[activeTouchIndex];
          list[activeTouchIndex] = list[targetIdx];
          list[targetIdx] = temp;

          try {
            const updated = await preferenceService.update({
              dashboard: { widgets: list },
            });
            setPrefs(updated);
          } catch {
            toast.error('Failed to save layout order.');
          }
        }
      }
    }
    setActiveTouchIndex(null);
  };

  if (isLoading || !prefs) {
    return <Loader message="Aggregating your customized study metrics..." />;
  }

  // Pinned widgets bubble up to the top automatically
  const displayWidgets = [...(prefs.dashboard?.widgets || [])].sort(
    (a: any, b: any) => Number(b.isPinned || false) - Number(a.isPinned || false)
  );

  /* ─────────────────────────────────────────────────────────────────────────────
     Individual Widget Renderers (15 total)
  ───────────────────────────────────────────────────────────────────────────── */

  const renderAiTutorWidget = () => (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/50 leading-relaxed">Ask any academic question or launch live interactive voice tutor sessions instantly.</p>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask a homework doubt..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          className="input-field text-xs flex-1 py-1.5"
          onKeyDown={e => e.key === 'Enter' && chatInput.trim() && navigate(`/chat?q=${encodeURIComponent(chatInput)}`)}
        />
        <button
          onClick={() => chatInput.trim() && navigate(`/chat?q=${encodeURIComponent(chatInput)}`)}
          className="btn-primary px-3 py-1.5 text-xs font-bold whitespace-nowrap"
        >
          Send
        </button>
      </div>
      <div className="flex gap-2 justify-end">
        <Link to="/chat" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">Open Active Chat →</Link>
      </div>
    </div>
  );

  const renderAiExplainWidget = () => (
    <div className="p-4 space-y-2">
      <p className="text-xs text-white/50 mb-3">Get detailed AI explanations on challenging structural topics:</p>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {[
          { label: 'Normal Forms (DBMS)', q: 'Explain DBMS 1NF, 2NF, 3NF normalization with code examples' },
          { label: 'Time Complexity', q: 'Explain Big O time complexity for binary search vs quicksort' },
          { label: 'OAuth 2 Flow', q: 'Provide a step by step diagram explanation of OAuth2 token exchange flow' },
          { label: 'Flexbox Layouts', q: 'Explain CSS Flexbox alignments step by step' },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate(`/chat?q=${encodeURIComponent(item.q)}`)}
            className="p-2 text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-indigo-500/10 text-white/70 hover:text-white transition-all"
          >
            💡 {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderAiNotesWidget = () => (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/50">Instantly generate complete, organized Markdown notes using Groq AI.</p>
      <div className="flex gap-2">
        <Link to="/notes-generator" className="btn-primary py-1.5 px-4 text-xs font-bold flex-1 text-center">Open Notes Generator</Link>
      </div>
    </div>
  );

  const renderStudyPlannerWidget = () => (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/50">Access your personalized weekly calendar study roadmap.</p>
      <div className="flex gap-2">
        <Link to="/study-planner" className="btn-primary py-1.5 px-4 text-xs font-bold flex-1 text-center">Open Study Planner</Link>
      </div>
    </div>
  );

  const renderResearchAssistantWidget = () => (
    <div className="p-4 space-y-3">
      <p className="text-xs text-white/50">Upload academic papers to perform cross-document comparisons and citations audits.</p>
      <div className="flex gap-2">
        <Link to="/research-assistant" className="btn-primary py-1.5 px-4 text-xs font-bold flex-1 text-center">Open Research Assistant</Link>
      </div>
    </div>
  );

  const renderAssignmentsWidget = () => (
    <div className="p-4 space-y-2">
      {assignments.length === 0 ? (
        <div className="text-center py-4 text-xs text-white/30 italic">No assignment submissions uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {assignments.slice(0, 3).map(a => (
            <div key={a._id} className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01] flex justify-between items-center text-xs">
              <div className="min-w-0">
                <div className="font-bold text-white truncate max-w-[150px]">{a.fileName}</div>
                <div className="text-[9px] text-white/45">Grade: {a.grade || 'Evaluated'}</div>
              </div>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                {a.evaluation?.score ?? a.score ?? 0}/100
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQuizzesWidget = () => (
    <div className="p-4 space-y-2">
      {progress?.recentQuizzes && progress.recentQuizzes.length > 0 ? (
        <div className="space-y-2">
          {progress.recentQuizzes.slice(0, 3).map((q, idx) => (
            <div key={idx} className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01] flex justify-between items-center text-xs">
              <div className="min-w-0">
                <div className="font-bold text-white truncate max-w-[150px]">{q.topic || 'Practice Quiz'}</div>
                <div className="text-[9px] text-white/45">{new Date(q.completedAt || '').toLocaleDateString()}</div>
              </div>
              <span className="font-mono text-indigo-400 font-bold">
                {q.score}/{q.maxScore}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-white/30 italic">No quizzes attempted.</div>
      )}
    </div>
  );

  const renderProgressWidget = () => {
    if (!progress?.courseProgress || progress.courseProgress.length === 0) {
      return <div className="text-center py-4 text-xs text-white/30 italic">No active courses with learning progress.</div>;
    }

    return (
      <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {progress.courseProgress.map((course) => {
          const progressVal = course.progress;
          const theme = progressVal >= 85 
            ? { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', bar: 'bg-emerald-500' }
            : progressVal >= 60
              ? { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', bar: 'bg-indigo-500' }
              : { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', bar: 'bg-rose-500' };

          const totalBlocks = 10;
          const filledBlocks = Math.round((progressVal / 100) * totalBlocks);

          return (
            <div key={course.courseId} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between space-y-3 text-xs">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider font-mono">{course.code}</span>
                  <h3 className="text-xs font-semibold text-white truncate" title={course.title}>{course.title}</h3>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 whitespace-nowrap ${theme.bg}`}>
                  {progressVal}% Mastery
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Unicode Blocks Progress Bar */}
                <div className="font-mono text-xs tracking-wider select-none text-white/60">
                  <span className={theme.bar === 'bg-emerald-500' ? 'text-emerald-400' : theme.bar === 'bg-indigo-500' ? 'text-indigo-400' : 'text-rose-400'}>
                    {'█'.repeat(filledBlocks)}
                  </span>
                  <span className="text-white/10">
                    {'░'.repeat(totalBlocks - filledBlocks)}
                  </span>
                </div>

                {/* Standard Premium Progress Bar */}
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div className={`h-full ${theme.bar}`} style={{ width: `${progressVal}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRecommendationsWidget = () => (
    <div className="p-4 space-y-3.5 text-xs">
      {recommendation ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-[10px] text-white/45 uppercase font-black tracking-wider block">Suggested Focus Topics</span>
            <div className="flex flex-wrap gap-1.5">
              {recommendation.suggestedTopics?.slice(0, 3).map((topic: string) => (
                <span key={topic} className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-medium border border-indigo-500/15">
                  🎯 {topic}
                </span>
              ))}
              {(!recommendation.suggestedTopics || recommendation.suggestedTopics.length === 0) && (
                <span className="text-white/40 italic text-[11px]">No specific topic recommendations.</span>
              )}
            </div>
          </div>
          
          {recommendation.resourceRecommendations?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-white/45 uppercase font-black tracking-wider block">Recommended Resources</span>
              <div className="space-y-1.5">
                {recommendation.resourceRecommendations.slice(0, 2).map((res: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white/80 truncate text-[11px]">{res.title}</div>
                      <div className="text-[9px] text-white/35 capitalize mt-0.5">{res.type}</div>
                    </div>
                    {res.url && (
                      <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-indigo-400 hover:underline flex-shrink-0 font-mono">
                        OPEN ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-white/30 italic">No recommendations. Start taking quizzes!</div>
      )}
    </div>
  );

  const renderCalendarWidget = () => {
    const today = new Date();
    const todayEvents = calendarEvents.filter(e => {
      const start = new Date(e.startDate);
      return start.toDateString() === today.toDateString();
    });

    return (
      <div className="p-4 space-y-2">
        {todayEvents.length === 0 ? (
          <div className="text-center py-4 text-xs text-white/30 italic">No events scheduled for today.</div>
        ) : (
          <div className="space-y-1.5">
            {todayEvents.slice(0, 3).map(e => (
              <div key={e._id} className="p-2 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-400 flex justify-between">
                <span className="font-bold truncate max-w-[140px]">{e.title}</span>
                <span className="font-semibold uppercase tracking-wider text-[8px]">{e.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNotificationsWidget = () => (
    <div className="p-4 space-y-2">
      <div className="space-y-1.5">
        <div className="p-2 rounded-xl bg-white/[0.01] border border-white/5 text-[10px] text-white/60">
          🚀 New RAG models optimized. Accuracy is up 12%.
        </div>
        <div className="p-2 rounded-xl bg-white/[0.01] border border-white/5 text-[10px] text-white/60">
          📆 Midterm Database Systems exams calendar update.
        </div>
      </div>
    </div>
  );

  const renderMeetingsWidget = () => {
    const upcoming = appointments.filter(a => new Date(a.date) >= new Date() && a.status !== 'Cancelled');
    return (
      <div className="p-4 space-y-2">
        {upcoming.length === 0 ? (
          <div className="text-center py-4 text-xs text-white/30 italic">No scheduled meetings.</div>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 3).map(m => (
              <div key={m._id} className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01] flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white truncate max-w-[120px]">{m.purpose}</div>
                  <div className="text-[9px] text-white/45">{new Date(m.date).toLocaleDateString()}</div>
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderActivityWidget = () => (
    <div className="p-4 space-y-2">
      {activityLogs.length === 0 ? (
        <div className="text-center py-4 text-xs text-white/30 italic">No activity timeline logs.</div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[160px]">
          {activityLogs.slice(0, 4).map(log => (
            <div key={log._id} className="flex justify-between items-center text-[10px] text-white/60 py-1 border-b border-white/5">
              <span className="font-semibold text-white/80">{log.action}</span>
              <span>{new Date(log.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQuickActionsWidget = () => (
    <div className="p-4 space-y-2">
      {[
        { to: '/chat', icon: '💬', label: 'Start Chat Session', sub: 'Ask the AI tutor' },
        { to: '/quiz', icon: '📋', label: 'Generate Quiz', sub: 'Test your knowledge' },
        { to: '/courses', icon: '📚', label: 'Browse Courses', sub: 'Enroll in courses' },
        { to: '/recommendations', icon: '🎯', label: 'View Plan', sub: 'Personalized learning' },
      ].map(item => (
        <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl p-3 transition-all"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,93,200,0.06)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
          <span className="text-lg">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white">{item.label}</div>
            <div className="text-[10px] text-white/40">{item.sub}</div>
          </div>
          <span className="ml-auto text-white/20">›</span>
        </Link>
      ))}
    </div>
  );

  const renderRecentChatsWidget = () => (
    <div className="p-4 space-y-2">
      {progress?.recentChats && progress.recentChats.length > 0 ? (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {progress.recentChats.map((chat) => (
            <Link key={chat._id} to={`/chat?chatId=${chat._id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,93,200,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
              <span className="text-base">💬</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm text-white">{chat.title}</p>
                <p className="text-[10px] text-white/40">{chat.totalMessages} messages · {formatDate(chat.updatedAt)}</p>
              </div>
              <span className="text-white/20">›</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-white/30 italic">No recent chat sessions.</div>
      )}
    </div>
  );

  const renderQuizTrendsWidget = () => (
    <div className="p-4 space-y-3">
      {quizScoreData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={quizScoreData} barCategoryGap="30%">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f5dc8" />
                <stop offset="100%" stopColor="#7c6fc2" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '12px' }}
              formatter={(v: any) => [`${v}%`, 'Score']} />
            <Bar dataKey="score" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-48 items-center justify-center text-sm text-white/30">
          No quiz data yet. Take your first quiz!
        </div>
      )}
    </div>
  );

  const renderLeaderboardWidget = () => (
    <div className="p-4 space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-4">
        {leaderboard.slice(0, 3).map((student, idx) => {
          const badges = ['🥇', '🥈', '🥉'];
          const gradients = [
            'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(252, 211, 77, 0.05) 100%)',
            'linear-gradient(135deg, rgba(75, 85, 99, 0.15) 0%, rgba(209, 213, 219, 0.05) 100%)',
            'linear-gradient(135deg, rgba(180, 83, 9, 0.15) 0%, rgba(253, 186, 116, 0.05) 100%)',
          ];
          const borders = ['rgba(217, 119, 6, 0.3)', 'rgba(75, 85, 99, 0.3)', 'rgba(180, 83, 9, 0.3)'];
          
          return (
            <motion.div
              key={student.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="rounded-2xl p-4 flex flex-col items-center text-center relative border"
              style={{
                background: gradients[idx],
                borderColor: borders[idx],
              }}
            >
              <div className="absolute top-3 left-3 text-lg">{badges[idx]}</div>
              <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-white mb-2 text-sm border border-white/10">
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{student.name}</div>
              <div className="text-[10px] text-white/40 mt-0.5">{student.learningStreak} day streak 🔥</div>
              
              <div className="mt-3 flex items-center justify-between w-full border-t border-white/5 pt-2 text-[10px] text-white/60">
                <div>
                  <div className="font-semibold text-white">{student.avgQuizScore}%</div>
                  <div>Quiz Avg</div>
                </div>
                <div>
                  <div className="font-semibold text-white">{student.totalQueries}</div>
                  <div>Queries</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="space-y-2 mt-2 max-h-[220px] overflow-y-auto">
        {leaderboard.map((student, idx) => {
          if (idx < 3) return null; // Already shown as card
          return (
            <motion.div
              key={student.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all text-xs border border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
            >
              <span className="font-bold text-white/40 w-4">{idx + 1}</span>
              <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center font-bold text-white/70 text-[10px] border border-white/10">
                {student.name.split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="font-semibold text-white min-w-0 truncate">{student.name}</div>
              
              <div className="ml-auto flex items-center gap-4 text-white/50 text-[11px]">
                <span className="flex items-center gap-0.5">🔥 <strong className="text-white">{student.learningStreak}d</strong></span>
                <span>Score: <strong className="text-white">{student.avgQuizScore}%</strong></span>
                <span>Queries: <strong className="text-white">{student.totalQueries}</strong></span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderWeeklyGoalsWidget = () => {
    const goals = [
      { name: 'Study Time', current: 2.5, target: 4, unit: ' hrs', color: 'bg-indigo-500' },
      { name: 'Quizzes Completed', current: progress?.totalQuizzesTaken || 0, target: 3, unit: '', color: 'bg-emerald-500' },
      { name: 'AI Tutor Queries', current: progress?.totalQueries || 0, target: 10, unit: '', color: 'bg-blue-500' },
      { name: 'Avg Quiz Accuracy', current: progress?.avgQuizScore || 0, target: 80, unit: '%', color: 'bg-amber-500' },
    ];
    return (
      <div className="p-4 space-y-3.5">
        <p className="text-xs text-white/50">Track your learning goals for this week.</p>
        <div className="space-y-3">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100));
            return (
              <div key={g.name} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-white/80">{g.name}</span>
                  <span className="text-white/40">{g.current}/{g.target}{g.unit}</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex">
                  <div className={`h-full ${g.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'weekly-goals': return renderWeeklyGoalsWidget();
      case 'ai-tutor': return renderAiTutorWidget();
      case 'ai-explain': return renderAiExplainWidget();
      case 'ai-notes': return renderAiNotesWidget();
      case 'study-planner': return renderStudyPlannerWidget();
      case 'research-assistant': return renderResearchAssistantWidget();
      case 'assignments': return renderAssignmentsWidget();
      case 'quizzes': return renderQuizzesWidget();
      case 'progress': return renderProgressWidget();
      case 'recommendations': return renderRecommendationsWidget();
      case 'calendar': return renderCalendarWidget();
      case 'notifications': return renderNotificationsWidget();
      case 'bookmarks': return <BookmarksWidget />;
      case 'recently-viewed': return <RecentlyViewedWidget />;
      case 'meetings': return renderMeetingsWidget();
      case 'activity': return renderActivityWidget();
      case 'ai-summary': return <AIDashboardOverview />;
      case 'schedule': return renderCalendarWidget();
      case 'leaderboard': return renderLeaderboardWidget();
      case 'quiz-trends': return renderQuizTrendsWidget();
      case 'recent-chats': return renderRecentChatsWidget();
      case 'quick-actions': return renderQuickActionsWidget();
      default: return null;
    }
  };

  return (
    <PageTransition className="p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        variants={pageChildVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 id="dashboard-welcome" className="text-2xl font-bold text-white">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="mt-1 text-sm text-white/40">Manage your custom learning dashboard</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLayoutManagerOpen(true)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all"
          >
            🎛️ Customize Dashboard Widgets
          </button>
        </div>
      </motion.div>

      {/* Stats Grid — staggered entrance */}
      <motion.div
        variants={listContainerVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <StatCard icon="💬" label="Total Queries" value={progress?.totalQueries || 0} gradient="stat-gradient-blue" />
        <StatCard icon="📋" label="Quizzes Taken" value={progress?.totalQuizzesTaken || 0} gradient="stat-gradient-purple" />
        <StatCard icon="🎯" label="Avg Quiz Score" value={`${progress?.avgQuizScore || 0}%`} gradient="stat-gradient-green" />
        <StatCard icon="🔥" label="Active Courses" value={progress?.courseProgress?.length || progress?.courses?.length || user?.courses?.length || 0} gradient="stat-gradient-amber" />
      </motion.div>

      {/* ── Learning Heatmap & Subject Mastery ── */}
      {(progress?.courseProgress || user?.courses) && (
        <HeatmapSection courseProgress={progress?.courseProgress || []} />
      )}

      {/* ── Quiz Performance Trend + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quiz Performance Trend */}
        <motion.div
          variants={pageChildVariants}
          className="glass-card p-5 space-y-4 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📈</span> Quiz Performance Trend
            </h2>
            <span className="text-[10px] text-indigo-400 font-bold font-mono uppercase tracking-wider">Accuracy Index</span>
          </div>
          {quizScoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={quizScoreData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="quizAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f5dc8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f5dc8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(20,22,32,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '12px' }}
                  formatter={(v: any) => [`${v}%`, 'Score']}
                />
                <Area type="monotone" dataKey="score" stroke="#4f5dc8" strokeWidth={2} fill="url(#quizAreaGrad)" dot={{ fill: '#4f5dc8', r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <p className="text-sm text-white/30">No quiz data yet. Take your first quiz!</p>
                <Link to="/quiz" className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Start a Quiz →</Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>⚡</span> Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { to: '/chat', icon: '💬', label: 'Start Chat Session', sub: 'Ask the AI tutor', color: 'hover:bg-indigo-500/10 hover:border-indigo-500/25' },
              { to: '/quiz', icon: '📋', label: 'Generate Quiz', sub: 'Test your knowledge', color: 'hover:bg-violet-500/10 hover:border-violet-500/25' },
              { to: '/courses', icon: '📚', label: 'Browse Courses', sub: 'Enroll in courses', color: 'hover:bg-emerald-500/10 hover:border-emerald-500/25' },
              { to: '/recommendations', icon: '🎯', label: 'View Plan', sub: 'Personalized learning', color: 'hover:bg-amber-500/10 hover:border-amber-500/25' },
            ].map((item, i) => (
              <motion.div key={item.to} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-all border border-white/5 bg-white/[0.02] ${item.color} group`}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white">{item.label}</div>
                    <div className="text-[10px] text-white/40">{item.sub}</div>
                  </div>
                  <span className="text-white/20 group-hover:text-white/50 transition-colors">›</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Student Leaderboard + Recent Chats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Leaderboard & Streaks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 space-y-4 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🏆</span> Student Leaderboard &amp; Streaks
            </h2>
            <span className="text-[10px] text-amber-400 font-bold font-mono uppercase tracking-wider">Weekly Rankings</span>
          </div>

          {/* Top 3 Podium Cards */}
          {leaderboard.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {leaderboard.slice(0, 3).map((student, idx) => {
                  const badges = ['🥇', '🥈', '🥉'];
                  const gradients = [
                    'linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(252,211,77,0.06) 100%)',
                    'linear-gradient(135deg, rgba(75,85,99,0.18) 0%, rgba(209,213,219,0.06) 100%)',
                    'linear-gradient(135deg, rgba(180,83,9,0.18) 0%, rgba(253,186,116,0.06) 100%)',
                  ];
                  const borders = ['rgba(217,119,6,0.3)', 'rgba(75,85,99,0.3)', 'rgba(180,83,9,0.3)'];
                  return (
                    <motion.div
                      key={student.name + idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + idx * 0.08 }}
                      className="rounded-2xl p-3 flex flex-col items-center text-center relative border"
                      style={{ background: gradients[idx], borderColor: borders[idx] }}
                    >
                      <div className="absolute top-2.5 left-2.5 text-base">{badges[idx]}</div>
                      <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center font-bold text-white mb-1.5 text-xs border border-white/10">
                        {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="text-[11px] font-bold text-white truncate max-w-full">{student.name}</div>
                      <div className="text-[9px] text-white/40 mt-0.5">{student.learningStreak} day streak 🔥</div>
                      <div className="mt-2 flex items-center justify-between w-full border-t border-white/5 pt-2">
                        <div className="text-center flex-1">
                          <div className="text-[10px] font-bold text-white">{student.avgQuizScore}%</div>
                          <div className="text-[9px] text-white/40">Quiz Avg</div>
                        </div>
                        <div className="w-px h-6 bg-white/5" />
                        <div className="text-center flex-1">
                          <div className="text-[10px] font-bold text-white">{student.totalQueries}</div>
                          <div className="text-[9px] text-white/40">Queries</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Remaining Leaderboard List */}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {leaderboard.slice(3).map((student, idx) => (
                  <motion.div
                    key={student.name + (idx + 3)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.04 }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors text-xs"
                  >
                    <span className="font-bold text-white/35 w-4 text-center">{idx + 4}</span>
                    <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center font-bold text-white/60 text-[10px] border border-white/10 flex-shrink-0">
                      {student.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="font-semibold text-white min-w-0 truncate flex-1">{student.name}</div>
                    <div className="flex items-center gap-3 text-[10px] text-white/45 flex-shrink-0">
                      <span>🔥 <strong className="text-white">{student.learningStreak}d</strong></span>
                      <span>Score: <strong className="text-white">{student.avgQuizScore}%</strong></span>
                      <span>Queries: <strong className="text-white">{student.totalQueries}</strong></span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-xs text-white/30 italic">No leaderboard data yet.</div>
          )}
        </motion.div>

        {/* Recent Chat Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 space-y-3"
        >
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>💬</span> Recent Chat Sessions
          </h2>
          {progress?.recentChats && progress.recentChats.length > 0 ? (
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
              {progress.recentChats.map((chat, i) => (
                <motion.div
                  key={chat._id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Link
                    to={`/chat?chatId=${chat._id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all border border-white/5 bg-white/[0.02] hover:bg-indigo-500/10 hover:border-indigo-500/20 group"
                  >
                    <span className="text-sm flex-shrink-0 group-hover:scale-110 transition-transform">💬</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-white">{chat.title}</p>
                      <p className="text-[10px] text-white/35 mt-0.5">{chat.totalMessages} messages · {formatDate(chat.updatedAt)}</p>
                    </div>
                    <span className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0">›</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-xs text-white/30">No recent chat sessions.</p>
              <Link to="/chat" className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">Start a conversation →</Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Dynamic Grid Layout */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
        {displayWidgets
          .filter(w => w.visible)
          .map((w, idx) => {
            const content = renderWidgetContent(w.id);
            if (!content) return null;

            let spanClass = 'md:col-span-1';
            if (w.gridSpan === 'col-span-2') spanClass = 'md:col-span-2';
            else if (w.gridSpan === 'col-span-3') spanClass = 'md:col-span-3';
            else if (w.gridSpan === 'col-span-4') spanClass = 'md:col-span-4';

            return (
              <div
                key={w.id}
                data-drag-index={idx}
                className={`col-span-1 ${spanClass}`}
              >
                <WidgetWrapper
                  widget={w}
                  onUpdate={(updates) => handleUpdateWidget(w.id, updates)}
                  onRefresh={() => fetchDashboardData()}
                  dragIndex={idx}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {content}
                </WidgetWrapper>
              </div>
            );
          })}
      </div>

      {/* Weekly Digest Summary */}
      <WeeklyDigestCard />

      {/* Layout Manager overlay drawer */}
      {layoutManagerOpen && (
        <DashboardLayoutManager
          currentPrefs={prefs}
          onClose={() => setLayoutManagerOpen(false)}
          onSaved={(newPrefs) => setPrefs(newPrefs)}
        />
      )}
    </PageTransition>
  );
};
