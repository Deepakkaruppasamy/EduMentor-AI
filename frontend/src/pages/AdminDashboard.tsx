import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard';
import { Loader } from '../components/common/Loader';
import { AIEvaluationPage } from './AIEvaluationPage';
import { preferenceService, UserPreferences } from '../services/preference.service';
import { AIDashboardOverview } from '../components/dashboard/AIDashboardOverview';
import { BookmarksWidget } from '../components/dashboard/BookmarksWidget';
import { RecentlyViewedWidget } from '../components/dashboard/RecentlyViewedWidget';
import { DashboardLayoutManager } from '../components/dashboard/DashboardLayoutManager';
import { WidgetWrapper } from '../components/dashboard/WidgetWrapper';

const COLORS = ['#4f63ff', '#9f7aea', '#48bb78', '#f6ad55', '#fc8181', '#06b6d4', '#e879f9'];

const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="glass-card p-4 flex items-center gap-4 border border-white/5 shadow-md">
    <div className="text-xl flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10" style={{ color }}>{icon}</div>
    <div>
      <div className="text-lg md:text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase font-bold text-white/40">{label}</div>
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role === 'admin') {
    return <SuperAdminDashboardView />;
  }
  return <FacultyDashboardView />;
};

// ==========================================
// 1. SUPER ADMIN ANALYTICS DASHBOARD VIEW
// ==========================================
const SuperAdminDashboardView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'students' | 'faculty' | 'chatbot' | 'courses' | 'system' | 'security' | 'ai-evaluation'>('users');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Widget Customization states
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTouchIndex, setActiveTouchIndex] = useState<number | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [res, prefsData] = await Promise.all([
        api.get('/admin/analytics'),
        preferenceService.get(),
      ]);
      setData(res.data);
      setPrefs(prefsData);
    } catch {
      toast.error('Failed to aggregate platform analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
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
      toast.error('Failed to update widget preferences');
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     Drag and Drop Handlers
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

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setActiveTouchIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    // Touch movement check
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

  if (isLoading || !data || !prefs) {
    return <Loader message="Aggregating complete platform analytics..." />;
  }

  // Pinned widgets first
  const displayWidgets = [...(prefs.dashboard?.widgets || [])].sort(
    (a: any, b: any) => Number(b.isPinned || false) - Number(a.isPinned || false)
  );

  /* ─────────────────────────────────────────────────────────────────────────────
     Super Admin Widget Sub-Renderers
  ───────────────────────────────────────────────────────────────────────────── */

  const renderAiPerformanceWidget = () => (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xl font-bold text-white">{data.chatbotAnalytics?.avgResponseTime || 0}ms</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold">Response Latency</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xl font-bold text-red-400">{data.chatbotAnalytics?.hallucinationRate || 0}%</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold">Hallucination Rate</div>
        </div>
      </div>
    </div>
  );

  const renderUserAnalyticsWidget = () => (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-lg font-bold text-white">{data.userAnalytics?.totalStudents || 0}</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold font-mono">Students</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-lg font-bold text-indigo-400">{data.userAnalytics?.activeUsers || 0}</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold font-mono">Active (7d)</div>
        </div>
      </div>
    </div>
  );

  const renderSecurityWidget = () => (
    <div className="p-4 space-y-2">
      <div className="overflow-y-auto max-h-[140px] text-[10px] divide-y divide-white/5">
        {data.securityDashboard?.lastLoginTime?.slice(0, 3).map((log: any, idx: number) => (
          <div key={idx} className="py-2 flex justify-between text-white/70">
            <span className="font-semibold text-white truncate max-w-[120px]">{log.email}</span>
            <span>{log.ip}</span>
          </div>
        )) || <div className="text-white/30 italic">No activity logs recorded.</div>}
      </div>
    </div>
  );

  const renderSystemHealthWidget = () => (
    <div className="p-4 grid grid-cols-2 gap-2 text-center text-[10px]">
      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">API: Operational</div>
      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">MongoDB: Connected</div>
    </div>
  );

  const renderSupportWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
        <span className="text-white/70">Unresolved Tickets:</span>
        <span className="font-bold text-white">4</span>
      </div>
    </div>
  );

  const renderActivityWidget = () => (
    <div className="p-4 space-y-2 text-[10px] text-white/60">
      <div className="p-2 bg-white/5 rounded-lg">🔐 Login security audit checklists verified.</div>
      <div className="p-2 bg-white/5 rounded-lg">📊 Aggregated telemetry cron trigger run.</div>
    </div>
  );

  const renderAnnouncementsWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <p className="text-white/50">Admin Announcements logs and system notices manager is active.</p>
    </div>
  );

  const renderDatabaseStatusWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <div className="flex justify-between items-center text-white/70">
        <span>Storage Size:</span>
        <span className="font-bold text-white">{data.systemAnalytics?.storageUsage || '0'} GB</span>
      </div>
      <div className="flex justify-between items-center text-white/70">
        <span>MongoDB Size:</span>
        <span className="font-bold text-white">{data.systemAnalytics?.databaseSize || '0'} MB</span>
      </div>
    </div>
  );

  const renderApiStatusWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <div className="flex justify-between items-center text-white/70">
        <span>API Latency:</span>
        <span className="font-bold text-emerald-400">{data.systemAnalytics?.apiResponseTime || '0'}ms</span>
      </div>
    </div>
  );

  const renderReportsWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <p className="text-white/50">Generate system audit reviews and security incident reports here.</p>
      <Link to="/reports" className="btn-primary py-1.5 px-3 font-semibold text-[10px] block text-center mt-2">Open Reports Panel</Link>
    </div>
  );

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'ai-performance': return renderAiPerformanceWidget();
      case 'user-analytics': return renderUserAnalyticsWidget();
      case 'security': return renderSecurityWidget();
      case 'system-health': return renderSystemHealthWidget();
      case 'support': return renderSupportWidget();
      case 'activity': return renderActivityWidget();
      case 'announcements': return renderAnnouncementsWidget();
      case 'database-status': return renderDatabaseStatusWidget();
      case 'api-status': return renderApiStatusWidget();
      case 'reports': return renderReportsWidget();
      case 'ai-summary': return <AIDashboardOverview />;
      case 'recently-viewed': return <RecentlyViewedWidget />;
      default: return null;
    }
  };

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon="👥" label="Total Students" value={data.userAnalytics.totalStudents} color="#4f63ff" />
              <StatCard icon="👨‍🏫" label="Total Faculty" value={data.userAnalytics.totalFaculty} color="#9f7aea" />
              <StatCard icon="🟢" label="Active Users" value={data.userAnalytics.activeUsers} color="#48bb78" />
              <StatCard icon="🔴" label="Inactive Users" value={data.userAnalytics.inactiveUsers} color="#fc8181" />
              <StatCard icon="✨" label="New Users (Mo)" value={data.userAnalytics.newUsersThisMonth} color="#f6ad55" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Users by Department */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Users by Department</h3>
                {data.userAnalytics.usersByDepartment.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.userAnalytics.usersByDepartment} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                        {data.userAnalytics.usersByDepartment.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-xs text-white/30">No department breakdown</div>
                )}
              </div>

              {/* Users by Course */}
              <div className="glass-card p-5 border border-white/5 md:col-span-2">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Users by Course (Enrollment Distribution)</h3>
                {data.userAnalytics.usersByCourse.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.userAnalytics.usersByCourse}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="value" fill="#4f63ff" radius={[4, 4, 0, 0]} name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-xs text-white/30">No course data</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'students':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="💬" label="Questions Asked" value={data.studentAnalytics.totalQuestionsAsked} color="#4f63ff" />
              <StatCard icon="📈" label="Avg Daily Queries" value={data.studentAnalytics.avgDailyUsage} color="#48bb78" />
              <StatCard icon="🎯" label="Avg Quiz Score" value={`${data.studentAnalytics.quizScores}%`} color="#9f7aea" />
              <StatCard icon="📋" label="Avg Assignment Score" value={`${data.studentAnalytics.assignmentScores}%`} color="#f6ad55" />
            </div>
          </div>
        );
      case 'ai-evaluation':
        return <AIEvaluationPage />;
      default:
        return (
          <div className="p-4 text-center text-xs text-white/40 italic">
            Select a diagnostic tab to view detailed reports.
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">🔒 Platform Administration &amp; Diagnostics</h1>
          <p className="mt-0.5 text-xs md:text-sm text-white/40">Real-time system diagnostics, learning analytics, security logging, and resource health</p>
        </div>
        <button
          onClick={() => setLayoutOpen(true)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 self-start transition-all"
        >
          🎛️ Customize Overview Widgets
        </button>
      </div>

      {/* Dynamic Smart Widgets for Admin */}
      {prefs && prefs.dashboard?.widgets && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
          {displayWidgets
            .filter((w: any) => w.visible)
            .map((w: any, idx: number) => {
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
                    onRefresh={() => fetchAdminData()}
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
      )}

      {/* Tabs Row */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'users', label: '👥 User Analytics' },
          { id: 'students', label: '🎓 Student Analytics' },
          { id: 'ai-evaluation', label: '🧪 AI Evaluation' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${activeTab === tab.id ? 'bg-primary-600 border-primary-500 text-white font-bold' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="pt-2">
        {renderDashboardContent()}
      </div>

      {/* Dashboard Layout Customizer */}
      {layoutOpen && (
        <DashboardLayoutManager
          currentPrefs={prefs}
          onClose={() => setLayoutOpen(false)}
          onSaved={(newPrefs) => setPrefs(newPrefs)}
        />
      )}
    </div>
  );
};

// ==========================================
// 2. FACULTY DASHBOARD VIEW
// ==========================================
const FacultyDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Widget Customization states
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [layoutOpen, setLayoutOpen] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTouchIndex, setActiveTouchIndex] = useState<number | null>(null);

  const fetchFacultyDashboard = async () => {
    setIsLoading(true);
    try {
      const [{ data }, prefsData] = await Promise.all([
        api.get('/analytics/dashboard'),
        preferenceService.get(),
      ]);
      setStats(data.stats);
      setActivity(data.recentActivity || []);
      setPrefs(prefsData);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyDashboard();
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
      toast.error('Failed to update widget preferences');
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     Drag and Drop Handlers
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

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    setActiveTouchIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent, index: number) => {
    // Touch movement check
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
    return <Loader message="Aggregating platform diagnostics..." />;
  }

  const topicsChartData = stats?.topTopics?.slice(0, 8).map((t: any) => ({ name: t.topic.substring(0, 20), count: t.count })) || [];
  const activityData = activity.map((a: any) => ({ date: new Date(a.date).toLocaleDateString(), queries: a.queries, trust: a.avgTrustScore }));

  const StatBig: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
    const isPercentage = typeof value === 'string' && value.endsWith('%');
    const widthVal = isPercentage ? value : '100%';

    return (
      <div className="p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xl md:text-2xl">{icon}</span>
          <div className="text-right min-w-0">
            <div className="text-lg md:text-xl lg:text-2xl font-black text-white truncate">{value}</div>
            <div className="text-[9px] xs:text-[10px] md:text-xs text-white/40 truncate">{label}</div>
          </div>
        </div>
        <div className="progress-bar mt-2 md:mt-3">
          <div className="progress-fill" style={{ background: color, width: widthVal }} />
        </div>
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────────────────────
     Faculty Widget Sub-Renderers
  ───────────────────────────────────────────────────────────────────────────── */

  const renderStudentAnalyticsWidget = () => (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xl font-bold text-white">{stats?.totalUsers || 0}</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold">Total Students</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-xl font-bold text-emerald-400">{stats?.activeUsers || 0}</div>
          <div className="text-[9px] text-white/40 uppercase font-semibold font-mono">Active (7d)</div>
        </div>
      </div>
    </div>
  );

  const renderAssignmentsWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
        <span className="text-white/70">Submissions graded:</span>
        <span className="font-bold text-white">{stats?.totalDocuments || 0}</span>
      </div>
    </div>
  );

  const renderQuizzesWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
        <span className="text-white/70">Practice Quizzes:</span>
        <span className="font-bold text-white">{stats?.totalQuizzes || 0}</span>
      </div>
    </div>
  );

  const renderMessagesWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <p className="text-white/50">Inbox and student consultation boards are active.</p>
    </div>
  );

  const renderOfficeHoursWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <Link to="/office-hours" className="btn-primary py-1.5 px-3 font-semibold text-[10px] block text-center">Open Office Hours Manager</Link>
    </div>
  );

  const renderMeetingsWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <Link to="/meetings" className="btn-primary py-1.5 px-3 font-semibold text-[10px] block text-center">Open Scheduled Meetings</Link>
    </div>
  );

  const renderAiAssistantWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <p className="text-white/50 font-medium">Generate lecture reviews or evaluate uploaded materials dynamically.</p>
      <Link to="/faculty-ai-assistant" className="text-indigo-400 font-bold hover:text-indigo-300">Launch AI Assistant →</Link>
    </div>
  );

  const renderAnnouncementsWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <Link to="/announcements" className="btn-primary py-1.5 px-3 font-semibold text-[10px] block text-center">Manage Announcements</Link>
    </div>
  );

  const renderCalendarWidget = () => (
    <div className="p-4 text-xs space-y-2">
      <Link to="/calendar" className="btn-primary py-1.5 px-3 font-semibold text-[10px] block text-center">Open Academic Calendar</Link>
    </div>
  );

  const renderNotificationsWidget = () => (
    <div className="p-4 text-[10px] text-white/50 space-y-2">
      <div className="p-2 bg-white/5 rounded-lg">🔔 3 new student office hour slots booked for tomorrow.</div>
    </div>
  );

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'student-analytics': return renderStudentAnalyticsWidget();
      case 'assignments': return renderAssignmentsWidget();
      case 'quizzes': return renderQuizzesWidget();
      case 'messages': return renderMessagesWidget();
      case 'office-hours': return renderOfficeHoursWidget();
      case 'meetings': return renderMeetingsWidget();
      case 'ai-assistant': return renderAiAssistantWidget();
      case 'announcements': return renderAnnouncementsWidget();
      case 'calendar': return renderCalendarWidget();
      case 'notifications': return renderNotificationsWidget();
      case 'ai-summary': return <AIDashboardOverview />;
      case 'recently-viewed': return <RecentlyViewedWidget />;
      default: return null;
    }
  };

  const displayWidgets = [...(prefs.dashboard?.widgets || [])].sort(
    (a: any, b: any) => Number(b.isPinned || false) - Number(a.isPinned || false)
  );

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">📈 Faculty Dashboard</h1>
          <p className="mt-0.5 text-xs md:text-sm text-white/40">Platform-wide analytics and system health</p>
        </div>
        <button
          onClick={() => setLayoutOpen(true)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 self-start transition-all"
        >
          🎛️ Customize Dashboard Widgets
        </button>
      </div>

      {/* Customizable Widget Grid */}
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
                  onRefresh={() => fetchFacultyDashboard()}
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

      {/* Action Checklist */}
      <WeeklyDigestCard />

      {/* Layout Config modal */}
      {layoutOpen && (
        <DashboardLayoutManager
          currentPrefs={prefs}
          onClose={() => setLayoutOpen(false)}
          onSaved={(newPrefs) => setPrefs(newPrefs)}
        />
      )}
    </div>
  );
};
