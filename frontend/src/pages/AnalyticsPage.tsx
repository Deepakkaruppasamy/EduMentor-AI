import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
import api from '../services/api';
import { courseService } from '../services/course.service';
import { Course, DashboardStats } from '../types';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Loader } from '../components/common/Loader';

const StatCard: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div className="glass-card p-4 flex items-center gap-4">
    <div className="text-2xl flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10" style={{ color }}>{icon}</div>
    <div>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[10px] uppercase font-bold text-white/40">{label}</div>
    </div>
  </div>
);

export const AnalyticsPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [gradebook, setGradebook] = useState<any[]>([]);
  const [struggledTopics, setStruggledTopics] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    courseService.getAll()
      .then(res => {
        setCourses(res);
        if (res.length > 0) {
          setSelectedCourseId(res[0]._id);
        }
      })
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setIsLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!selectedCourseId) return;
    setIsLoadingData(true);

    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/faculty/gradebook', { params: { courseId: selectedCourseId } }),
      api.get('/analytics/faculty/at-risk', { params: { courseId: selectedCourseId } })
    ])
      .then(([dashboardRes, gradebookRes, riskRes]) => {
        setStats(dashboardRes.data.stats);
        setActivity(dashboardRes.data.recentActivity || []);
        setGradebook(gradebookRes.data.gradebook || []);
        setStruggledTopics(gradebookRes.data.struggledTopics || []);
        setAtRiskStudents(riskRes.data.students || []);
      })
      .catch(() => toast.error('Failed to load analytics data'))
      .finally(() => setIsLoadingData(false));
  }, [selectedCourseId]);

  if (isLoadingCourses || (isLoadingData && !stats)) {
    return <Loader message="Aggregating academic insights..." />;
  }

  const topicsChartData = stats?.topTopics?.slice(0, 8).map(t => ({ name: t.topic.substring(0, 18), count: t.count })) || [];
  const activityData = activity.map(a => ({ date: new Date(a.date).toLocaleDateString(), queries: a.queries, trust: a.avgTrustScore }));
  const strugglesChartData = struggledTopics.slice(0, 8).map(t => ({ name: t.topic.substring(0, 18), avgScore: t.avgScore }));

  // Calculate course specific statistics
  const classAvgScore = gradebook.length 
    ? Math.round(gradebook.reduce((sum: number, s: any) => sum + s.avgQuizScore, 0) / gradebook.length) 
    : 0;
  const totalClassQueries = gradebook.reduce((sum: number, s: any) => sum + s.totalQueries, 0);

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">📊 Learning Analytics Dashboard</h1>
          <p className="mt-0.5 text-xs md:text-sm text-white/40">Track student progress, concepts struggles, active queries, and chatbot trends</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-white/60 font-semibold whitespace-nowrap">Active Course:</label>
          <select
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
            className="input-field py-2 bg-[#111318] text-xs font-semibold cursor-pointer max-w-[200px]"
          >
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Usage & Performance Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard icon="👥" label="Class Enrollments" value={gradebook.length} color="#4f63ff" />
        <StatCard icon="🎯" label="Class Avg Score" value={`${classAvgScore}%`} color="#48bb78" />
        <StatCard icon="💬" label="Chat Interactions" value={totalClassQueries} color="#9f7aea" />
        <StatCard icon="🚨" label="Students at Risk" value={atRiskStudents.length} color="#fc8181" />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Chatbot Usage Trend */}
        <div className="glass-card p-3.5 md:p-5">
          <h2 className="mb-4 text-xs md:text-sm font-bold text-white/80">📈 Chatbot Usage & Trust Trends</h2>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                <Line type="monotone" dataKey="queries" stroke="#4f63ff" strokeWidth={2} dot={{ fill: '#4f63ff', r: 3 }} name="Queries" />
                <Line type="monotone" dataKey="trust" stroke="#48bb78" strokeWidth={2} dot={{ fill: '#48bb78', r: 3 }} name="Trust %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-xs text-white/30">No trend data yet</div>
          )}
        </div>

        {/* Most Asked Topics */}
        <div className="glass-card p-3.5 md:p-5">
          <h2 className="mb-4 text-xs md:text-sm font-bold text-white/80">🔥 Most Queried Concepts</h2>
          {topicsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topicsChartData} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                <Bar dataKey="count" fill="url(#topicGrad)" radius={[0, 6, 6, 0]} />
                <defs>
                  <linearGradient id="topicGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#4f63ff" />
                    <stop offset="100%" stopColor="#9f7aea" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-xs text-white/30">No queries processed yet</div>
          )}
        </div>
      </div>

      {/* Weak Concepts & Engagement Alerts Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Class Struggles (Weak Concepts) Chart */}
        <div className="glass-card p-3.5 md:p-5 lg:col-span-2">
          <h2 className="text-xs md:text-sm font-bold text-white/80 mb-4">⚠️ Concept Struggles: Lowest Quiz Averages</h2>
          {strugglesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={strugglesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                <Bar dataKey="avgScore" fill="#fc8181" radius={[6, 6, 0, 0]} name="Avg Score (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-xs text-white/30">No quiz analytics available for this course</div>
          )}
        </div>

        {/* Inactivity & At-Risk Engagement Alerts */}
        <div className="glass-card p-3.5 md:p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-xs md:text-sm font-bold text-white/80 mb-3">🚨 Inactivity & Engagement Alerts</h2>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {atRiskStudents.map((student) => (
                <div key={student.studentId} className="flex justify-between items-center text-xs p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <span className="font-semibold text-white/95 block truncate max-w-[120px]">{student.name}</span>
                    <span className="text-[9px] text-white/35">{student.reasons[0] || 'At risk'}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${student.riskLevel === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'}`}>
                    {student.riskLevel.toUpperCase()}
                  </span>
                </div>
              ))}
              {atRiskStudents.length === 0 && (
                <p className="text-xs text-white/20 text-center py-10">All students are actively engaged!</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/gradebook')}
            className="btn-secondary w-full py-2.5 text-xs font-semibold mt-4 text-center block"
          >
            📋 Launch Support Intervention
          </button>
        </div>
      </div>
    </div>
  );
};
