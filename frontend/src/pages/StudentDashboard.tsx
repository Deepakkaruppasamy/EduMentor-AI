import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
import toast from 'react-hot-toast';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
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

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTouchIndex, setActiveTouchIndex] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      const [progRes, leaderboardRes, prefsData, appRes, calRes, assignRes, actRes] = await Promise.all([
        api.get('/analytics/progress'),
        api.get('/analytics/leaderboard'),
        preferenceService.get(),
        appointmentService.getMy().catch(() => ({ data: { data: [] } })),
        calendarService.getEvents().catch(() => ({ data: { data: [] } })),
        api.get('/assignment-evaluations').catch(() => ({ data: [] })),
        api.get('/activity').catch(() => ({ data: { logs: [] } })),
      ]);

      setProgress(progRes.data.progress);
      setLeaderboard(leaderboardRes.data.leaderboard || []);
      setPrefs(prefsData);
      setAppointments(appRes.data?.data || []);
      setCalendarEvents(calRes.data?.data || []);
      setAssignments(assignRes.data || []);
      setActivityLogs(actRes.data?.logs || []);
    } catch (err) {
      console.error('Failed to load student dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    (a, b) => Number(b.isPinned || false) - Number(a.isPinned || false)
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
                {a.score}/100
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

  const renderProgressWidget = () => (
    <div className="p-4 space-y-3">
      {progress?.courseProgress && progress.courseProgress.length > 0 ? (
        <div className="grid gap-2">
          {progress.courseProgress.slice(0, 3).map(course => (
            <div key={course.courseId} className="flex justify-between items-center text-xs">
              <span className="font-semibold text-white/70 truncate max-w-[140px]">{course.title}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${course.progress}%` }} />
                </div>
                <span className="font-bold font-mono text-[10px] text-white">{course.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-white/30 italic">No progress data.</div>
      )}
    </div>
  );

  const renderRecommendationsWidget = () => (
    <div className="p-4 space-y-2 text-xs">
      <p className="text-white/70 leading-relaxed">
        Based on quiz stand, focus on:
      </p>
      {progress?.courseProgress && progress.courseProgress.some(c => c.progress < 60) ? (
        <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/15 text-red-400 text-[10px]">
          ⚠️ DBMS Normalization score trend warrants urgent practice sessions.
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-[10px]">
          ✅ Solid mastery. Maintain consistency by answering daily concept queries.
        </div>
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

  const renderWidgetContent = (id: string) => {
    switch (id) {
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
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
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
    </div>
  );
};
