import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface StudentDigest {
  weeklyXp: number;
  xpChange: number;
  practiceCount: number;
  learningStreak: number;
  avgScore: number;
  weakTopics: string[];
  suggestedDocuments: {
    _id: string;
    originalName: string;
    courseId: string;
    courseTitle: string;
    courseCode: string;
    reason: string;
  }[];
  checklist: {
    id: string;
    text: string;
    done: boolean;
  }[];
}

interface FacultyDigest {
  totalStudentsCount: number;
  atRiskCount: number;
  struggledTopics: {
    topic: string;
    courseTitle: string;
    studentCount: number;
    avgScore: number;
  }[];
  atRiskStudents: {
    studentId: string;
    name: string;
    courseCode: string;
    courseTitle: string;
    avgQuizScore: number;
    daysInactive: string;
    riskLevel: 'high' | 'medium';
  }[];
  checklist: {
    id: string;
    text: string;
    done: boolean;
  }[];
}

export const WeeklyDigestCard: React.FC = () => {
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [studentDigest, setStudentDigest] = useState<StudentDigest | null>(null);
  const [facultyDigest, setFacultyDigest] = useState<FacultyDigest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDigest = async () => {
      try {
        const { data } = await api.get('/analytics/weekly-digest');
        setRole(data.role);
        if (data.role === 'student') {
          setStudentDigest(data.digest);
        } else {
          setFacultyDigest(data.digest);
        }
      } catch (error) {
        console.error('Failed to fetch weekly digest analytics', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDigest();
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center space-y-3 py-12">
        <div className="h-6 w-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <span className="text-xs text-white/40">Aggregating weekly digest statistics...</span>
      </div>
    );
  }

  // 1. STUDENT VIEW
  if (role === 'student' && studentDigest) {
    const xpChangePositive = studentDigest.xpChange >= 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📅</span>
            <div>
              <h3 className="text-sm font-bold text-white">Your Weekly AI Learning Digest</h3>
              <p className="text-[10px] text-white/40">Computed from your recent chat and practice activities</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
            Student Report
          </span>
        </div>

        {/* XP and Core Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-white/30 block mb-1">Weekly XP</span>
            <div className="text-xl font-black text-white">{studentDigest.weeklyXp}</div>
            <div className={`text-[9px] mt-1 font-semibold flex items-center justify-center gap-0.5 ${xpChangePositive ? 'text-green-400' : 'text-red-400'}`}>
              {xpChangePositive ? '▲ +' : '▼ -'}{Math.abs(studentDigest.xpChange)} vs last week
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-white/30 block mb-1">Quiz Practices</span>
            <div className="text-xl font-black text-white">{studentDigest.practiceCount}</div>
            <div className="text-[9px] text-white/40 mt-1">Last 7 days</div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-white/30 block mb-1">Weekly Avg</span>
            <div className="text-xl font-black text-white">{studentDigest.avgScore}%</div>
            <div className="text-[9px] text-white/40 mt-1">Quiz precision</div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-white/30 block mb-1">Current Streak</span>
            <div className="text-xl font-black text-amber-400">🔥 {studentDigest.learningStreak}d</div>
            <div className="text-[9px] text-white/40 mt-1">Keep studying!</div>
          </div>
        </div>

        {/* Mid-Row: Weak Topics & Recommendations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Weak Topics */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ Struggled Concepts
            </h4>
            {studentDigest.weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {studentDigest.weakTopics.map(topic => (
                  <span
                    key={topic}
                    className="px-2.5 py-1 text-[10px] font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/10"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 py-2">Awesome! No weak topics flagged this week.</p>
            )}

            {/* Suggested documents */}
            {studentDigest.suggestedDocuments.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-white/30 block">Auto-Suggested Revision Files</span>
                <div className="space-y-1.5">
                  {studentDigest.suggestedDocuments.map(doc => (
                    <div
                      key={doc._id}
                      className="p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] flex flex-col space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/80 truncate max-w-[200px]">📄 {doc.originalName}</span>
                        <span className="text-[8px] font-mono text-white/30 uppercase">{doc.courseCode}</span>
                      </div>
                      <span className="text-[9px] text-primary-400 font-light">{doc.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Goal Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              🎯 Weekly Study Checklist
            </h4>
            <div className="space-y-2.5">
              {studentDigest.checklist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04] transition-colors"
                  style={{ background: item.done ? 'rgba(72,187,120,0.04)' : 'rgba(255,255,255,0.01)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center text-[10px] ${
                      item.done 
                        ? 'border-green-500 bg-green-500/20 text-green-400' 
                        : 'border-white/20 text-transparent'
                    }`}>
                      ✓
                    </div>
                    <span className={`text-xs ${item.done ? 'text-white/40 line-through' : 'text-white/85 font-light'}`}>
                      {item.text}
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold ${item.done ? 'text-green-400' : 'text-white/30'}`}>
                    {item.done ? 'Completed' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // 2. FACULTY REPORT
  if (role === 'faculty' && facultyDigest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="text-sm font-bold text-white">Faculty Class Performance Digest</h3>
              <p className="text-[10px] text-white/40">Aggregated weak topics, at-risk students, and dynamic reminders</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Instructor Report
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex items-center gap-4">
            <div className="text-2xl">👥</div>
            <div>
              <div className="text-xl font-black text-white">{facultyDigest.totalStudentsCount}</div>
              <div className="text-[10px] text-white/40">Total Active Enrollments</div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.04] p-4 rounded-xl flex items-center gap-4">
            <div className="text-2xl">🚨</div>
            <div>
              <div className="text-xl font-black text-red-400">{facultyDigest.atRiskCount}</div>
              <div className="text-[10px] text-white/40">Students at High/Medium Risk</div>
            </div>
          </div>
        </div>

        {/* Bottom Split panels */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Class Struggles & Struggled Topics */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              ⚠️ Lowest Average Quiz Topics
            </h4>
            {facultyDigest.struggledTopics.length > 0 ? (
              <div className="space-y-2">
                {facultyDigest.struggledTopics.map(t => (
                  <div
                    key={t.topic}
                    className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white/80 block">{t.topic}</span>
                      <span className="text-[9px] text-white/30 truncate max-w-[180px] block">{t.courseTitle}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-red-400 block">{t.avgScore}% avg</span>
                      <span className="text-[9px] text-white/30">{t.studentCount} students struggling</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/30 py-2">No struggling topics flagged below 65% average score!</p>
            )}

            {/* At-risk student outreach list */}
            {facultyDigest.atRiskStudents.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-[9px] uppercase tracking-wider font-bold text-white/30 block">Outreach Required</span>
                <div className="space-y-1.5">
                  {facultyDigest.atRiskStudents.map(student => (
                    <div
                      key={student.studentId}
                      className="p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white/80">{student.name}</span>
                        <span className="text-[9px] text-white/30 block">{student.courseCode} · Inactive {student.daysInactive}</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold bg-red-500/10 text-red-400">
                          {student.avgQuizScore}% Avg
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              📝 Instructor Action List
            </h4>
            <div className="space-y-2.5">
              {facultyDigest.checklist.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/[0.04]"
                  style={{ background: item.done ? 'rgba(72,187,120,0.04)' : 'rgba(255,255,255,0.01)' }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center text-[10px] ${
                      item.done 
                        ? 'border-green-500 bg-green-500/20 text-green-400' 
                        : 'border-white/20 text-transparent'
                    }`}>
                      ✓
                    </div>
                    <span className="text-xs text-white/85 font-light">
                      {item.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
};
