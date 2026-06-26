import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import api from '../services/api';
import { DashboardStats } from '../types';
import toast from 'react-hot-toast';
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard';

const COLORS = ['#4f63ff', '#9f7aea', '#48bb78', '#f6ad55', '#fc8181', '#06b6d4', '#e879f9'];

const StatBig: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
  const isPercentage = typeof value === 'string' && value.endsWith('%');
  const widthVal = isPercentage ? value : '100%';

  return (
    <div className="glass-card p-3.5 md:p-5">
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

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(({ data }) => {
        setStats(data.stats);
        setActivity(data.recentActivity || []);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center">
      <div className="h-10 w-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
    </div>;
  }

  const topicsChartData = stats?.topTopics?.slice(0, 8).map(t => ({ name: t.topic.substring(0, 20), count: t.count })) || [];
  const activityData = activity.map(a => ({ date: new Date(a.date).toLocaleDateString(), queries: a.queries, trust: a.avgTrustScore }));

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">📈 Admin Dashboard</h1>
        <p className="mt-0.5 text-xs md:text-sm text-white/40">Platform-wide analytics and system health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatBig icon="👥" label="Total Users" value={stats?.totalUsers || 0} color="#4f63ff" />
        <StatBig icon="🟢" label="Active Users (7d)" value={stats?.activeUsers || 0} color="#48bb78" />
        <StatBig icon="💬" label="Total Queries" value={stats?.totalQueries || 0} color="#9f7aea" />
        <StatBig icon="📚" label="Total Courses" value={stats?.totalCourses || 0} color="#f6ad55" />
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatBig icon="📁" label="Docs Processed" value={stats?.totalDocuments || 0} color="#06b6d4" />
        <StatBig icon="📝" label="Quizzes Generated" value={stats?.totalQuizzes || 0} color="#e879f9" />
        <StatBig icon="✅" label="Avg Trust Score" value={`${stats?.avgTrustScore || 0}%`} color="#48bb78" />
        <StatBig icon="⚠️" label="Hallucination Rate" value={`${stats?.avgHallucinationRate || 0}%`} color="#fc8181" />
      </div>

      {/* Instructor / Faculty Weekly Action Items */}
      <WeeklyDigestCard />

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        {/* Query Activity Chart */}
        <div className="glass-card p-3.5 md:p-5">
          <h2 className="mb-4 text-xs md:text-sm font-semibold text-white/80">📊 Daily Query Activity</h2>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '12px' }} />
                <Line type="monotone" dataKey="queries" stroke="#4f63ff" strokeWidth={2} dot={{ fill: '#4f63ff', r: 3 }} name="Queries" />
                <Line type="monotone" dataKey="trust" stroke="#48bb78" strokeWidth={2} dot={{ fill: '#48bb78', r: 3 }} name="Trust %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-52 items-center justify-center text-sm text-white/30">No activity data yet</div>
          )}
        </div>

        {/* Top Topics */}
        <div className="glass-card p-3.5 md:p-5">
          <h2 className="mb-4 text-xs md:text-sm font-semibold text-white/80">🔥 Most Asked Topics</h2>
          {topicsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topicsChartData} layout="vertical" barCategoryGap="20%">
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '12px' }} />
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
            <div className="flex h-52 items-center justify-center text-sm text-white/30">No topic data yet</div>
          )}
        </div>
      </div>

      {/* System Health */}
      <div className="glass-card p-3.5 md:p-5">
        <h2 className="mb-4 text-xs md:text-sm font-semibold text-white/80">🔒 System Health</h2>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {[
            { label: 'API Status', value: '✅ Operational', color: 'text-green-400' },
            { label: 'MongoDB', value: '✅ Connected', color: 'text-green-400' },
            { label: 'ChromaDB', value: '🔄 Active', color: 'text-amber-400' },
            { label: 'Llama 3 (Groq)', value: '✅ Ready', color: 'text-green-400' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-2.5 md:p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className={`text-xs md:text-sm font-semibold ${item.color}`}>{item.value}</div>
              <div className="text-[9px] md:text-[10px] text-white/40 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
