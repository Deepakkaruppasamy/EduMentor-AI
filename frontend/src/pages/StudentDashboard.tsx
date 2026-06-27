import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';
import { StudentProgress, Recommendation, Quiz, ChatSession } from '../types';
import { getGradeColor, formatDate } from '../utils/uuid';
import { Loader } from '../components/common/Loader';
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard';

const StatCard: React.FC<{ icon: string; label: string; value: string | number; sub?: string; gradient: string }> = ({ icon, label, value, sub, gradient }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
    <div className="flex items-start gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${gradient}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-white/50">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-white/30">{sub}</div>}
      </div>
    </div>
  </motion.div>
);

export const StudentDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progRes, leaderboardRes] = await Promise.all([
          api.get('/analytics/progress'),
          api.get('/analytics/leaderboard'),
        ]);
        setProgress(progRes.data.progress);
        setLeaderboard(leaderboardRes.data.leaderboard || []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const quizScoreData = progress?.recentQuizzes?.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.maxScore > 0 ? Math.round(((q.score || 0) / q.maxScore) * 100) : 0,
    topic: q.topic || 'Quiz',
  })) || [];

  if (isLoading) {
    return <Loader message="Analyzing your study metrics..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="mt-1 text-sm text-white/40">Here's your learning progress at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon="💬" label="Total Queries" value={progress?.totalQueries || 0} gradient="stat-gradient-blue" />
        <StatCard icon="📝" label="Quizzes Taken" value={progress?.totalQuizzesTaken || 0} gradient="stat-gradient-purple" />
        <StatCard icon="🎯" label="Avg Quiz Score" value={`${progress?.avgQuizScore || 0}%`} gradient="stat-gradient-green" />
        <StatCard icon="🔥" label="Active Courses" value={user?.courses?.length || 0} gradient="stat-gradient-amber" />
      </div>

      {/* Learning Heatmap & Subject Mastery */}
      <div className="glass-card p-5 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
            <span>🧠</span> Learning Heatmap & Subject Mastery
          </h2>
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Instant Weakness Map</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {progress?.courseProgress && progress.courseProgress.length > 0 ? (
            progress.courseProgress.map((course) => {
              const progressVal = course.progress;
              const theme = progressVal >= 85 
                ? { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', bar: 'bg-emerald-500' }
                : progressVal >= 60
                  ? { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', bar: 'bg-indigo-500' }
                  : { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', bar: 'bg-rose-500' };

              const totalBlocks = 10;
              const filledBlocks = Math.round((progressVal / 100) * totalBlocks);

              return (
                <div key={course.courseId} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider font-mono">{course.code}</span>
                      <h3 className="text-xs font-semibold text-white truncate max-w-[160px]">{course.title}</h3>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${theme.bg}`}>
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
            })
          ) : (
            <div className="col-span-3 text-center py-6 text-xs text-white/30">
              No active courses with learning progress.
            </div>
          )}
        </div>
      </div>

      {/* Weekly Digest Summary */}
      <WeeklyDigestCard />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quiz Performance Chart */}
        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-white/80">📊 Quiz Performance Trend</h2>
          {quizScoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={quizScoreData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '12px' }}
                  formatter={(v: any) => [`${v}%`, 'Score']} />
                <Bar dataKey="score" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f63ff" />
                    <stop offset="100%" stopColor="#9f7aea" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-white/30">
              No quiz data yet. Take your first quiz!
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-5">
          <h2 className="mb-4 text-sm font-semibold text-white/80">⚡ Quick Actions</h2>
          <div className="space-y-2">
            {[
              { to: '/chat', icon: '💬', label: 'Start Chat Session', sub: 'Ask the AI tutor' },
              { to: '/quiz', icon: '📝', label: 'Generate Quiz', sub: 'Test your knowledge' },
              { to: '/courses', icon: '📚', label: 'Browse Courses', sub: 'Enroll in courses' },
              { to: '/recommendations', icon: '🎯', label: 'View Plan', sub: 'Personalized learning' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl p-3 transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,99,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-xs font-medium text-white">{item.label}</div>
                  <div className="text-[10px] text-white/40">{item.sub}</div>
                </div>
                <span className="ml-auto text-white/20">›</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaderboard Widget */}
        <div className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/80 flex items-center gap-1.5">
              🏆 Student Leaderboard & Streaks
            </h2>
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Weekly Rankings</span>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {/* Display Top 3 Cards */}
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

          {/* List of remaining student rankings */}
          <div className="space-y-2 mt-2">
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

        {/* Recent Chats */}
        {progress?.recentChats && progress.recentChats.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-white/80">💬 Recent Chat Sessions</h2>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {progress.recentChats.map((chat) => (
                <Link key={chat._id} to={`/chat?chatId=${chat._id}`}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,99,255,0.08)')}
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
          </div>
        )}
      </div>
    </div>
  );
};
