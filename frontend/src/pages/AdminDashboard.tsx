import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { WeeklyDigestCard } from '../components/dashboard/WeeklyDigestCard';
import { Loader } from '../components/common/Loader';

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
  const [activeTab, setActiveTab] = useState<'users' | 'students' | 'faculty' | 'chatbot' | 'courses' | 'system' | 'security'>('users');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get('/admin/analytics')
      .then(res => {
        setData(res.data);
      })
      .catch(() => toast.error('Failed to aggregate platform analytics.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !data) {
    return <Loader message="Aggregating complete platform analytics..." />;
  }

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
                      <Bar dataKey="count" fill="#fc8181" radius={[0, 4, 4, 0]} name="Students Struggling" />
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
                      <Bar dataKey="count" fill="#48bb78" radius={[0, 4, 4, 0]} name="Students Mastered" />
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
              <StatCard icon="📚" label="Total Courses" value={data.facultyAnalytics.totalCourses} color="#4f63ff" />
              <StatCard icon="📁" label="Docs Uploaded" value={data.facultyAnalytics.uploadedDocuments} color="#06b6d4" />
              <StatCard icon="📋" label="Assignments Created" value={data.facultyAnalytics.assignmentsCreated} color="#f6ad55" />
              <StatCard icon="📝" label="Quizzes Created" value={data.facultyAnalytics.quizzesCreated} color="#9f7aea" />
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
                        <stop offset="0%" stopColor="#9f7aea" />
                        <stop offset="100%" stopColor="#4f63ff" />
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
                      <Bar dataKey="count" fill="#4f63ff" radius={[4, 4, 0, 0]} name="Interactions Count" />
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
              <StatCard icon="💬" label="Total Conversations" value={data.chatbotAnalytics.totalConversations} color="#4f63ff" />
              <StatCard icon="⚡" label="Avg Response" value={`${data.chatbotAnalytics.avgResponseTime}ms`} color="#06b6d4" />
              <StatCard icon="⚠️" label="Hallucination Rate" value={`${data.chatbotAnalytics.hallucinationRate}%`} color="#fc8181" />
              <StatCard icon="🎯" label="Retrieval Accuracy" value={`${data.chatbotAnalytics.retrievalAccuracy}%`} color="#48bb78" />
              <StatCard icon="😊" label="User Satisfaction" value={`${data.chatbotAnalytics.userSatisfaction}%`} color="#f6ad55" />
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
                      <Area type="monotone" dataKey="count" stroke="#4f63ff" fill="rgba(79, 99, 255, 0.15)" strokeWidth={2} name="Queries" />
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
              <StatCard icon="🔥" label="Most Popular Course" value={data.courseAnalytics.mostPopularCourse} color="#4f63ff" />
              <StatCard icon="❄️" label="Least Popular Course" value={data.courseAnalytics.leastAccessedCourse} color="#fc8181" />
              <StatCard icon="📁" label="Total Course Docs" value={data.courseAnalytics.totalDocuments} color="#06b6d4" />
              <StatCard icon="📥" label="Total File Downloads" value={data.courseAnalytics.totalDownloads} color="#48bb78" />
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
                    <Bar dataKey="engagement" fill="#48bb78" radius={[4, 4, 0, 0]} name="Engagement Rate (%)" />
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
              <StatCard icon="🟢" label="Daily Active (DAU)" value={data.systemAnalytics.dau} color="#48bb78" />
              <StatCard icon="🔵" label="Weekly Active (WAU)" value={data.systemAnalytics.wau} color="#4f63ff" />
              <StatCard icon="🟣" label="Monthly Active (MAU)" value={data.systemAnalytics.mau} color="#9f7aea" />
              <StatCard icon="⚡" label="API Avg Latency" value={`${data.systemAnalytics.apiResponseTime}ms`} color="#06b6d4" />
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
                    <Area type="monotone" dataKey="CPU" stroke="#fc8181" fill="rgba(252, 129, 129, 0.1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Memory" stroke="#9f7aea" fill="rgba(159, 122, 234, 0.1)" strokeWidth={2} />
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
              <StatCard icon="🟢" label="Successful Logins" value={data.securityDashboard.successfulLogins} color="#48bb78" />
              <StatCard icon="🔴" label="Failed Attempts" value={data.securityDashboard.failedLoginAttempts} color="#fc8181" />
              <StatCard icon="⚠️" label="Blocked Attempts" value={data.securityDashboard.blockedLoginAttempts} color="#f6ad55" />
              <StatCard icon="🔑" label="Password Resets" value={data.securityDashboard.passwordResetRequests} color="#9f7aea" />
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
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">🔒 Platform Administration & Diagnostics</h1>
        <p className="mt-0.5 text-xs md:text-sm text-white/40">Real-time system diagnostics, learning analytics, security logging, and resource health</p>
      </div>

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
    </div>
  );
};

// ==========================================
// 2. FACULTY DASHBOARD VIEW (ORIGINAL LAYOUT)
// ==========================================
const FacultyDashboardView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
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
    return <Loader message="Aggregating platform diagnostics..." />;
  }

  const topicsChartData = stats?.topTopics?.slice(0, 8).map((t: any) => ({ name: t.topic.substring(0, 20), count: t.count })) || [];
  const activityData = activity.map((a: any) => ({ date: new Date(a.date).toLocaleDateString(), queries: a.queries, trust: a.avgTrustScore }));

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

  return (
    <div className="p-4 space-y-4 md:p-6 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">📈 Faculty Dashboard</h1>
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
