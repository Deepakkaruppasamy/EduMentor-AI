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
import { useOnboardingStore } from '../store/onboarding.store';
import { adminDashboardTour } from '../components/onboarding/tours/adminDashboardTour';
import { facultyDashboardTour } from '../components/onboarding/tours/facultyDashboardTour';

const COLORS = ['#4f5dc8', '#7c6fc2', '#34a87a', '#c4893a', '#c0524a', '#2d9a8a', '#a78bcd'];

const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="glass-card p-4 flex items-center gap-4 border border-white/5 shadow-md">
    <div className="text-xl flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10" style={{ color }}>{icon}</div>
    <div>
      <div className="text-lg md:text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase font-bold text-white/40">{label}</div>
    </div>
  </div>
);

const FacultyStatCard: React.FC<{
  icon: string;
  label: string;
  value: string | number;
  color: string;
  progress?: number;
}> = ({ icon, label, value, color, progress }) => {
  const isPercentage = progress !== undefined;
  const fillWidth = isPercentage ? `${Math.max(0, Math.min(100, progress))}%` : '100%';

  return (
    <div className="glass-card p-5 flex flex-col justify-between border border-white/5 shadow-md rounded-2xl bg-[#111319]/80 hover:bg-[#151821] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="text-2xl flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10" style={{ color }}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
          <div className="text-[11px] font-semibold text-white/40 mt-1">{label}</div>
        </div>
      </div>
      <div className="w-full bg-white/[0.04] h-1.5 rounded-full mt-4 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500" 
          style={{ 
            backgroundColor: color, 
            width: fillWidth,
            boxShadow: `0 0 8px ${color}33`
          }} 
        />
      </div>
    </div>
  );
};


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

  const { startTour, hasTourCompleted } = useOnboardingStore();

  useEffect(() => {
    if (!isLoading && !hasTourCompleted('admin-dashboard')) {
      startTour('admin-dashboard', adminDashboardTour);
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
      case 'bookmarks': return <BookmarksWidget />;
      default: return null;
    }
  };

  const renderDashboardContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon="👥" label="Total Students" value={data.userAnalytics.totalStudents} color="#4f5dc8" />
              <StatCard icon="👨‍🏫" label="Total Faculty" value={data.userAnalytics.totalFaculty} color="#7c6fc2" />
              <StatCard icon="🟢" label="Active Users" value={data.userAnalytics.activeUsers} color="#34a87a" />
              <StatCard icon="🔴" label="Inactive Users" value={data.userAnalytics.inactiveUsers} color="#c0524a" />
              <StatCard icon="✨" label="New Users (Mo)" value={data.userAnalytics.newUsersThisMonth} color="#c4893a" />
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
                      <Bar dataKey="value" fill="#4f5dc8" radius={[4, 4, 0, 0]} name="Users" />
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
              <StatCard icon="💬" label="Questions Asked" value={data.studentAnalytics.totalQuestionsAsked} color="#4f5dc8" />
              <StatCard icon="📈" label="Avg Daily Queries" value={data.studentAnalytics.avgDailyUsage} color="#34a87a" />
              <StatCard icon="🎯" label="Avg Quiz Score" value={`${data.studentAnalytics.quizScores}%`} color="#7c6fc2" />
              <StatCard icon="📋" label="Avg Assignment Score" value={`${data.studentAnalytics.assignmentScores}%`} color="#c4893a" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Weak Topics */}
              <div className="glass-card p-5 border border-white/5 font-sans">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Concept Struggles (Top Weak Topics)</h3>
                {data.studentAnalytics.weakTopics && data.studentAnalytics.weakTopics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.studentAnalytics.weakTopics} layout="vertical">
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <YAxis dataKey="topic" type="category" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="count" fill="#c0524a" radius={[0, 4, 4, 0]} name="Students Struggling" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No struggling topics recorded</div>
                )}
              </div>

              {/* Strong Topics */}
              <div className="glass-card p-5 border border-white/5 font-sans">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Concepts Mastered (Top Strong Topics)</h3>
                {data.studentAnalytics.strongTopics && data.studentAnalytics.strongTopics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.studentAnalytics.strongTopics} layout="vertical">
                      <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <YAxis dataKey="topic" type="category" tick={{ fill: 'rgba(255,255,255,0.65)', fontSize: 10 }} width={120} />
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="count" fill="#34a87a" radius={[0, 4, 4, 0]} name="Students Mastered" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No mastered topics recorded</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'faculty':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="📚" label="Total Courses" value={data.facultyAnalytics.totalCourses} color="#4f5dc8" />
              <StatCard icon="📄" label="Docs Uploaded" value={data.facultyAnalytics.uploadedDocuments} color="#2d9a8a" />
              <StatCard icon="📋" label="Assignments Created" value={data.facultyAnalytics.assignmentsCreated} color="#c4893a" />
              <StatCard icon="📝" label="Quizzes Created" value={data.facultyAnalytics.quizzesCreated} color="#7c6fc2" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Activity Overview */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Faculty Materials Upload Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Documents', count: data.facultyAnalytics.uploadedDocuments },
                    { name: 'Assignments', count: data.facultyAnalytics.assignmentsCreated },
                    { name: 'Quizzes', count: data.facultyAnalytics.quizzesCreated }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="count" fill="url(#facultyGrad)" radius={[4, 4, 0, 0]} name="Total Uploaded" />
                    <defs>
                      <linearGradient id="facultyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c6fc2" />
                        <stop offset="100%" stopColor="#4f5dc8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Class Performance Metrics */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Most Queried Academic Topics</h3>
                {data.facultyAnalytics.mostAskedTopics && data.facultyAnalytics.mostAskedTopics.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.facultyAnalytics.mostAskedTopics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="topic" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="count" fill="#4f5dc8" radius={[4, 4, 0, 0]} name="Interactions Count" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No queries processed yet</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'chatbot':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon="💬" label="Total Conversations" value={data.chatbotAnalytics.totalConversations} color="#4f5dc8" />
              <StatCard icon="⚡" label="Avg Response" value={`${data.chatbotAnalytics.avgResponseTime}ms`} color="#2d9a8a" />
              <StatCard icon="⚠️" label="Hallucination Rate" value={`${data.chatbotAnalytics.hallucinationRate}%`} color="#c0524a" />
              <StatCard icon="🎯" label="Retrieval Accuracy" value={`${data.chatbotAnalytics.retrievalAccuracy}%`} color="#34a87a" />
              <StatCard icon="😊" label="User Satisfaction" value={`${data.chatbotAnalytics.userSatisfaction}%`} color="#c4893a" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Language Breakdown */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Conversational Language Usage</h3>
                {data.chatbotAnalytics.languageUsage && data.chatbotAnalytics.languageUsage.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.chatbotAnalytics.languageUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                        {data.chatbotAnalytics.languageUsage.map((entry: any, idx: number) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No language data recorded</div>
                )}
              </div>

              {/* Peak Usage Times */}
              <div className="glass-card p-5 border border-white/5 md:col-span-2">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Chat Activity Load Profile (Peak Times)</h3>
                {data.chatbotAnalytics.peakUsageTime && data.chatbotAnalytics.peakUsageTime.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.chatbotAnalytics.peakUsageTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="count" stroke="#4f5dc8" fill="rgba(79, 93, 200, 0.10)" strokeWidth={2} name="Queries" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No activity logs recorded</div>
                )}
              </div>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🔥" label="Most Popular Course" value={data.courseAnalytics.mostPopularCourse} color="#4f5dc8" />
              <StatCard icon="❄️" label="Least Popular Course" value={data.courseAnalytics.leastAccessedCourse} color="#c0524a" />
              <StatCard icon="📄" label="Total Course Docs" value={data.courseAnalytics.totalDocuments} color="#2d9a8a" />
              <StatCard icon="📥" label="Total Downloads" value={data.courseAnalytics.totalDownloads} color="#34a87a" />
            </div>

            {/* Student Engagement by Course */}
            <div className="glass-card p-5 border border-white/5">
              <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Enrolled Students Engagement Rate (%)</h3>
              {data.courseAnalytics.studentEngagement.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.courseAnalytics.studentEngagement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="course" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                    <Bar dataKey="engagement" fill="#34a87a" radius={[4, 4, 0, 0]} name="Engagement Rate (%)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-xs text-white/30">No course statistics</div>
              )}
            </div>
          </div>
        );
      case 'system':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="👥" label="Daily Active (DAU)" value={data.systemAnalytics.dau} color="#34a87a" />
              <StatCard icon="🔵" label="Weekly Active (WAU)" value={data.systemAnalytics.wau} color="#4f5dc8" />
              <StatCard icon="🟣" label="Monthly Active (MAU)" value={data.systemAnalytics.mau} color="#7c6fc2" />
              <StatCard icon="⚡" label="API Avg Latency" value={`${data.systemAnalytics.apiResponseTime}ms`} color="#2d9a8a" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* CPU & Memory Load */}
              <div className="glass-card p-5 border border-white/5 md:col-span-2">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Resource Utilization Load Profile (%)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={[
                    { name: '08:00', CPU: 12, Memory: data.systemAnalytics.memoryUsage },
                    { name: '12:00', CPU: data.systemAnalytics.cpuUsage, Memory: data.systemAnalytics.memoryUsage },
                    { name: '16:00', CPU: Math.min(data.systemAnalytics.cpuUsage + 15, 95), Memory: data.systemAnalytics.memoryUsage },
                    { name: '20:00', CPU: Math.max(data.systemAnalytics.cpuUsage - 10, 5), Memory: data.systemAnalytics.memoryUsage }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="CPU" stroke="#c0524a" fill="rgba(252, 129, 129, 0.1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Memory" stroke="#7c6fc2" fill="rgba(124, 111, 194, 0.08)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Data Sizes */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Storage & Databases Sizes</h3>
                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">Uploads Storage:</span>
                    <span className="text-white font-bold">{data.systemAnalytics.storageUsage} GB</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60">MDB Data Size:</span>
                    <span className="text-white font-bold">{data.systemAnalytics.databaseSize} MB</span>
                  </div>
                  <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden mt-6">
                    <div className="bg-primary-500 h-full" style={{ width: '45%' }} />
                  </div>
                  <p className="text-[10px] text-white/40 italic">ChromaDB index size sync checks active.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="💚" label="Successful Logins" value={data.securityDashboard.successfulLogins} color="#34a87a" />
              <StatCard icon="❤️" label="Failed Attempts" value={data.securityDashboard.failedLoginAttempts} color="#c0524a" />
              <StatCard icon="⚠️" label="Blocked Attempts" value={data.securityDashboard.blockedLoginAttempts} color="#c4893a" />
              <StatCard icon="🔑" label="Password Resets" value={data.securityDashboard.passwordResetRequests} color="#7c6fc2" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Security devices */}
              <div className="glass-card p-5 border border-white/5">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Logged-in Devices Breakdown</h3>
                {data.securityDashboard.loginDevice.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.securityDashboard.loginDevice} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60}>
                        {data.securityDashboard.loginDevice.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }} />
                      <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-xs text-white/30">No device logs yet</div>
                )}
              </div>

              {/* Recent Active Logins list */}
              <div className="glass-card p-5 border border-white/5 md:col-span-2">
                <h3 className="text-xs md:text-sm font-semibold text-white/80 mb-4">Audit Feed: Recent Successful Logins</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-white/40 border-b border-white/5">
                        <th className="pb-2">User Email</th>
                        <th className="pb-2">Time</th>
                        <th className="pb-2">IP Address</th>
                        <th className="pb-2">Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03] text-white/70">
                      {data.securityDashboard.lastLoginTime.map((log: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 font-semibold text-white">{log.email}</td>
                          <td className="py-2">{new Date(log.time).toLocaleTimeString()}</td>
                          <td className="py-2 font-mono">{log.ip}</td>
                          <td className="py-2 truncate max-w-[120px]">{log.device.split(' ')[0] || log.device}</td>
                        </tr>
                      ))}
                      {data.securityDashboard.lastLoginTime.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-white/30">No security login entries logged yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
          <h1 id="admin-dashboard-welcome" className="text-xl md:text-2xl font-bold text-white">🔒 Platform Administration &amp; Diagnostics</h1>
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
          { id: 'faculty', label: '👨‍🏫 Faculty Analytics' },
          { id: 'chatbot', label: '🤖 Chatbot Analytics' },
          { id: 'courses', label: '📚 Course Analytics' },
          { id: 'system', label: '⚙️ System Metrics' },
          { id: 'security', label: '🛡️ Security Dashboard' },
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
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { startTour, hasTourCompleted } = useOnboardingStore();


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
      setDeptStats(data.departmentAnalytics || []);
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

  useEffect(() => {
    if (!isLoading && !hasTourCompleted('faculty-dashboard')) {
      startTour('faculty-dashboard', facultyDashboardTour);
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
      case 'bookmarks': return <BookmarksWidget />;
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
          <h1 id="admin-dashboard-welcome" className="text-xl md:text-2xl font-bold text-white">📈 Faculty Dashboard</h1>
          <p className="mt-0.5 text-xs md:text-sm text-white/40">Platform-wide analytics and system health</p>
        </div>
        <button
          onClick={() => setLayoutOpen(true)}
          className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 self-start transition-all"
        >
          🎛️ Customize Dashboard Widgets
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FacultyStatCard icon="👥" label="Total Users" value={stats?.totalUsers || 0} color="#4f5dc8" />
        <FacultyStatCard icon="🟢" label="Active Users (7d)" value={stats?.activeUsers || 0} color="#34a87a" />
        <FacultyStatCard icon="💬" label="Total Queries" value={stats?.totalQueries || 0} color="#7c6fc2" />
        <FacultyStatCard icon="📚" label="Total Courses" value={stats?.totalCourses || 0} color="#c4893a" />
        <FacultyStatCard icon="📁" label="Docs Processed" value={stats?.totalDocuments || 0} color="#2d9a8a" />
        <FacultyStatCard icon="📝" label="Quizzes Generated" value={stats?.totalQuizzes || 0} color="#a78bcd" />
        <FacultyStatCard icon="✅" label="Avg Trust Score" value={`${stats?.avgTrustScore || 0}%`} color="#34a87a" progress={stats?.avgTrustScore || 0} />
        <FacultyStatCard icon="⚠️" label="Hallucination Rate" value={`${stats?.avgHallucinationRate || 0}%`} color="#c0524a" progress={stats?.avgHallucinationRate || 0} />
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

      {/* Permanent Faculty Analytics & Class Trends Section */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div>
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <span>📊</span> Faculty Analytics &amp; Class Trends
          </h2>
          <p className="text-xs text-white/40 mt-0.5">Permanent indicators of query volume, topic distribution, and user engagement</p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Query Trends Chart */}
          <div className="glass-card p-5 space-y-3.5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">📈 Activity &amp; AI Trust Trend</h3>
              <span className="text-[10px] text-indigo-400 font-semibold font-mono">Daily log</span>
            </div>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="queries" stroke="#4f5dc8" strokeWidth={2} name="Queries" />
                  <Line type="monotone" dataKey="trust" stroke="#34a87a" strokeWidth={2} name="Avg Trust" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-white/30 italic">No query activity recorded.</div>
            )}
          </div>

          {/* Top Topics Chart */}
          <div className="glass-card p-5 space-y-3.5 bg-white/[0.01]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">🗂️ Top Queried Learning Topics</h3>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono">Topic count</span>
            </div>
            {topicsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topicsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#7c6fc2" radius={[4, 4, 0, 0]} name="Queries" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-white/30 italic">No queried topics recorded.</div>
            )}
          </div>

          {/* Departmental Comparison */}
          <div className="glass-card p-5 space-y-3.5 bg-white/[0.01] md:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase font-black text-white/50 tracking-wider">🏢 Departmental AI Usage</h3>
              <span className="text-[10px] text-amber-400 font-semibold font-mono">Total Queries</span>
            </div>
            {deptStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="department" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                  <Bar dataKey="aiUsage" fill="#2d9a8a" radius={[4, 4, 0, 0]} name="Queries" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-white/30 italic">No departmental records found.</div>
            )}
          </div>
        </div>
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
