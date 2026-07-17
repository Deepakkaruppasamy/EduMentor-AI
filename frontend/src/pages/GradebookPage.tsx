import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { courseService } from '../services/course.service';
import { quizService } from '../services/chat.service';
import api from '../services/api';
import { Course } from '../types';
import { getGradeColor, formatDate } from '../utils/uuid';
import { Loader } from '../components/common/Loader';
import toast from 'react-hot-toast';

interface StudentGrade {
  studentId: string;
  name: string;
  email: string;
  lastLogin?: string;
  avatar?: string;
  bio?: string;
  department?: string;
  avgQuizScore: number;
  totalQueries: number;
  weakTopics: string[];
  strongTopics: string[];
}

interface StruggledTopic {
  topic: string;
  count: number;
  avgScore: number;
}

export const GradebookPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [gradebook, setGradebook] = useState<StudentGrade[]>([]);
  const [struggledTopics, setStruggledTopics] = useState<StruggledTopic[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'grades' | 'risk' | 'assign' | 'history'>('grades');

  // Assign Quiz form state
  const [assignTopic, setAssignTopic] = useState('');
  const [assignType, setAssignType] = useState<'mcq' | 'short' | 'long' | 'mixed'>('mcq');
  const [assignDifficulty, setAssignDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [assignCount, setAssignCount] = useState(5);
  const [assignDueDate, setAssignDueDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Assignment history state
  const [assignedQuizzes, setAssignedQuizzes] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [assignmentAnalytics, setAssignmentAnalytics] = useState<any | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // At-Risk Intervention states
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [selectedRiskStudent, setSelectedRiskStudent] = useState<any | null>(null);
  const [emailDraftText, setEmailDraftText] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSendingIntervention, setIsSendingIntervention] = useState(false);

  // Student detail modal state
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<any | null>(null);

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
    setIsLoadingGrades(true);
    api.get('/analytics/faculty/gradebook', { params: { courseId: selectedCourseId } })
      .then(({ data }) => {
        setGradebook(data.gradebook);
        setStruggledTopics(data.struggledTopics);
      })
      .catch(() => toast.error('Failed to load gradebook stats'))
      .finally(() => setIsLoadingGrades(false));
  }, [selectedCourseId]);

  const fetchAtRiskStudents = async () => {
    if (!selectedCourseId) return;
    setIsLoadingRisk(true);
    try {
      const { data } = await api.get('/analytics/faculty/at-risk', { params: { courseId: selectedCourseId } });
      setAtRiskStudents(data.students);
    } catch (err) {
      toast.error('Failed to load at-risk warning metrics');
    } finally {
      setIsLoadingRisk(false);
    }
  };

  const handleSendIntervention = async () => {
    if (!selectedRiskStudent) return;
    setIsSendingIntervention(true);
    try {
      await api.post('/analytics/faculty/intervene', {
        studentId: selectedRiskStudent.studentId,
        emailText: emailDraftText,
        subject: emailSubject,
      });
      toast.success(`Intervention sent to ${selectedRiskStudent.name}!`);
      setSelectedRiskStudent(null);
      fetchAtRiskStudents();
    } catch (err) {
      toast.error('Failed to send intervention email');
    } finally {
      setIsSendingIntervention(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'risk') {
      fetchAtRiskStudents();
    }
  }, [activeTab, selectedCourseId]);

  const fetchAssignedQuizzes = async () => {
    setIsLoadingHistory(true);
    try {
      const data = await quizService.getAssignedQuizzes();
      setAssignedQuizzes(data);
    } catch (err) {
      toast.error('Failed to load assignment history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFetchAnalytics = async (id: string) => {
    setSelectedAssignmentId(id);
    setIsLoadingAnalytics(true);
    try {
      const data = await quizService.getAssignmentAnalytics(id);
      setAssignmentAnalytics(data);
    } catch (err) {
      toast.error('Failed to load assignment analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAssignedQuizzes();
    }
  }, [activeTab]);

  const handleAssignQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !assignTopic) {
      toast.error('Please select a course and enter a topic');
      return;
    }
    setIsAssigning(true);
    try {
      await quizService.assign({
        courseId: selectedCourseId,
        topic: assignTopic,
        questionType: assignType,
        difficulty: assignDifficulty,
        count: assignCount,
        dueDate: assignDueDate || undefined,
      });
      toast.success('Quiz generated and assigned to all enrolled students!');
      setAssignTopic('');
      setAssignDueDate('');
      fetchAssignedQuizzes();
      setActiveTab('history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate and assign quiz');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoadingCourses) {
    return <Loader message="Accessing Gradebook records..." />;
  }

  // Calculate class averages
  const classAvgScore = gradebook.length 
    ? Math.round(gradebook.reduce((sum, s) => sum + s.avgQuizScore, 0) / gradebook.length) 
    : 0;
  const totalClassQueries = gradebook.reduce((sum, s) => sum + s.totalQueries, 0);

  const strugglesChartData = struggledTopics.map(t => ({
    name: t.topic.substring(0, 18),
    avgScore: t.avgScore,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📒 Course Gradebook & Analytics</h1>
          <p className="mt-1 text-sm text-white/40">Track enrollment progress, average quiz performance, and class struggles</p>
        </div>

        {/* Course Filter Dropdown - only display when not looking at specific assignment details */}
        {(!selectedAssignmentId || activeTab !== 'history') && (
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
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-2 border-b border-white/5 pb-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'grades', label: '📊 Student Grades & Analytics' },
          { id: 'risk', label: '🚨 At-Risk Warning Alerts' },
          { id: 'assign', label: '✨ Generate & Assign Quiz' },
          { id: 'history', label: '🕐 Assignment History' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as any);
              setSelectedAssignmentId(null);
              setAssignmentAnalytics(null);
              setSelectedRiskStudent(null);
            }}
            className="px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-200 flex-shrink-0"
            style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.03)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
              borderBottom: activeTab === tab.id ? '2px solid #4f5dc8' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'grades' && (
        isLoadingGrades ? (
          <Loader message="Loading class performance analytics..." />
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Class Summary Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="glass-card p-5">
                <span className="text-xs text-white/40 block font-semibold uppercase tracking-wider">Total Enrolled Students</span>
                <span className="text-3xl font-black text-white block mt-2">{gradebook.length}</span>
              </div>
              <div className="glass-card p-5">
                <span className="text-xs text-white/40 block font-semibold uppercase tracking-wider">Class Quiz Average</span>
                <span className={`text-3xl font-black block mt-2 ${getGradeColor(classAvgScore)}`}>{classAvgScore}%</span>
              </div>
              <div className="glass-card p-5">
                <span className="text-xs text-white/40 block font-semibold uppercase tracking-wider">Total Student AI Interactions</span>
                <span className="text-3xl font-black text-white block mt-2">{totalClassQueries} queries</span>
              </div>
            </div>

            {/* Struggles Section */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Class Struggles Chart */}
              <div className="glass-card p-5 lg:col-span-2">
                <h2 className="text-sm font-bold text-white/80 mb-4">⚠️ Class Struggles: Lowest Performing Topics</h2>
                {strugglesChartData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={strugglesChartData}>
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'rgba(26,29,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f0f2f8', fontSize: '11px' }} />
                        <Bar dataKey="avgScore" fill="#c0524a" radius={[6, 6, 0, 0]} name="Avg Quiz Score (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-white/30">No quiz data recorded for this course yet</div>
                )}
              </div>

              {/* Struggled topics list */}
              <div className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white/80 mb-3">🔥 Struggle Details</h2>
                  <p className="text-[11px] text-white/40 mb-4">Ranked list of topics requiring review or supplementary lecture uploads</p>
                  <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
                    {struggledTopics.map((topic, i) => (
                      <div key={topic.topic} className="flex justify-between items-center text-xs p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                        <span className="truncate text-white/80 font-medium max-w-[150px]">{topic.topic}</span>
                        <span className="font-bold text-red-400">{topic.avgScore}% avg</span>
                      </div>
                    ))}
                    {struggledTopics.length === 0 && (
                      <p className="text-xs text-white/20 text-center py-6">All topics are clear</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] text-red-300 leading-normal">
                  💡 **Recommendation:** Upload additional text resources or lecture transcripts covering struggled topics. EduMentor AI will automatically ingest them to fill these learning gaps.
                </div>
              </div>
            </div>

            {/* Student Grades Grid */}
            <div className="glass-card p-5 overflow-hidden">
              <h2 className="text-sm font-bold text-white/80 mb-4">👥 Student Enrollment Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="pb-3 text-white/40 font-semibold uppercase">Student</th>
                      <th className="pb-3 text-white/40 font-semibold uppercase text-center">Quiz Avg</th>
                      <th className="pb-3 text-white/40 font-semibold uppercase text-center">AI Queries</th>
                      <th className="pb-3 text-white/40 font-semibold uppercase hidden md:table-cell">Weak Topics</th>
                      <th className="pb-3 text-white/40 font-semibold uppercase hidden md:table-cell">Strong Topics</th>
                      <th className="pb-3 text-white/40 font-semibold uppercase text-right hidden sm:table-cell">Last Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {gradebook.map((student) => (
                      <tr
                        key={student.studentId}
                        onClick={() => setSelectedStudentForModal(student)}
                        className="hover:bg-white/[0.03] hover:text-primary-300 transition-colors cursor-pointer"
                      >
                        <td className="py-4 pr-3">
                          <div className="font-semibold text-white group-hover:text-primary-400 flex items-center gap-2">
                            {student.avatar ? (
                              <img src={student.avatar} alt={student.name} className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-white/70">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span>{student.name}</span>
                          </div>
                          <div className="text-[10px] text-white/35 ml-8">{student.email}</div>
                        </td>
                        <td className="py-4 text-center">
                          <span className={`font-bold text-sm ${getGradeColor(student.avgQuizScore)}`}>
                            {student.avgQuizScore}%
                          </span>
                        </td>
                        <td className="py-4 text-center font-medium text-white/70">{student.totalQueries}</td>
                        <td className="py-4 pr-3 max-w-[200px] truncate text-white/60 hidden md:table-cell">
                          {student.weakTopics.join(', ') || <span className="text-white/20">None</span>}
                        </td>
                        <td className="py-4 pr-3 max-w-[200px] truncate text-white/60 hidden md:table-cell">
                          {student.strongTopics.join(', ') || <span className="text-white/20">None</span>}
                        </td>
                        <td className="py-4 text-right text-white/40 hidden sm:table-cell">
                          {student.lastLogin ? formatDate(student.lastLogin) : 'Never'}
                        </td>
                      </tr>
                    ))}
                    {gradebook.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-white/30">No students enrolled in this course yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {activeTab === 'risk' && (
        <div className="animate-fadeIn space-y-6">
          {isLoadingRisk ? (
            <Loader message="Scanning recommendation engines for at-risk flags..." />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* At-Risk Warning Cards List */}
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-sm font-bold text-white mb-2">Struggling Student Flags</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {atRiskStudents.map(student => {
                    const isHigh = student.riskLevel === 'high';
                    return (
                      <div
                        key={student.studentId}
                        className="glass-card p-5 space-y-4 flex flex-col justify-between border-white/5"
                        style={{
                          borderColor: isHigh ? 'rgba(192,82,74,0.2)' : 'rgba(196,137,58,0.2)',
                          background: isHigh ? 'rgba(192,82,74,0.02)' : 'rgba(196,137,58,0.02)',
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="cursor-pointer group flex items-center gap-2.5" onClick={() => setSelectedStudentForModal(student)}>
                              {student.avatar ? (
                                <img src={student.avatar} alt={student.name} className="h-8 w-8 rounded-lg object-cover border border-white/10" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold bg-white/5 text-white/70">
                                  {student.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold text-sm text-white group-hover:text-primary-400 group-hover:underline transition-colors">{student.name}</h3>
                                <p className="text-[10px] text-white/40">{student.email}</p>
                              </div>
                            </div>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                background: isHigh ? 'rgba(192,82,74,0.15)' : 'rgba(196,137,58,0.15)',
                                color: isHigh ? '#c0524a' : '#c4893a',
                                border: `1px solid ${isHigh ? 'rgba(192,82,74,0.3)' : 'rgba(196,137,58,0.3)'}`,
                              }}
                            >
                              {student.riskLevel.toUpperCase()} RISK
                            </span>
                          </div>

                          {/* Risk reason tags */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {student.reasons.map((r: string) => (
                              <span key={r} className="px-2 py-0.5 rounded text-[9px] bg-white/[0.04] text-white/60 border border-white/[0.06]">
                                ⚠️ {r}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-white/50 bg-white/[0.01] p-2 rounded-lg border border-white/5">
                            <div>
                              <span>Quiz Avg:</span>
                              <strong className={`block text-xs font-bold ${getGradeColor(student.avgQuizScore)}`}>
                                {student.avgQuizScore}%
                              </strong>
                            </div>
                            <div>
                              <span>Weak Topics:</span>
                              <strong className="block text-xs font-bold text-white/80 truncate">
                                {student.weakTopics.join(', ') || 'None'}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedRiskStudent(student);
                            setEmailDraftText(student.emailDraft);
                            setEmailSubject(`Academic Support: ${student.suggestedDocuments[0] ? `Resource recommendation` : 'Course assistance'}`);
                          }}
                          className="btn-primary py-2 text-xs w-full mt-2"
                          style={{
                            background: isHigh ? 'linear-gradient(135deg, #c0524a 0%, #d53f8c 100%)' : undefined,
                            boxShadow: isHigh ? '0 4px 15px rgba(192,82,74,0.2)' : undefined,
                          }}
                        >
                          📢 Launch Support Intervention
                        </button>
                      </div>
                    );
                  })}

                  {atRiskStudents.length === 0 && (
                    <div className="col-span-full text-center py-16">
                      <p className="text-white/40">🎉 Excellent! No students are currently flagged as at-risk.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Intervention Drawer / Email Composer */}
              <div className="glass-card p-5 space-y-4 flex flex-col justify-between">
                {selectedRiskStudent ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-white">Compose Intervention</h3>
                        <p className="text-[10px] text-white/40">Sending to: {selectedRiskStudent.name}</p>
                      </div>
                      <button
                        onClick={() => setSelectedRiskStudent(null)}
                        className="text-white/30 hover:text-white text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 font-semibold uppercase">Email Subject</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={e => setEmailSubject(e.target.value)}
                          className="input-field py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-white/40 mb-1 font-semibold uppercase">Email Message Draft</label>
                        <textarea
                          rows={12}
                          value={emailDraftText}
                          onChange={e => setEmailDraftText(e.target.value)}
                          className="input-field text-xs resize-none"
                        />
                      </div>

                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 leading-normal">
                        💡 **Note:** Suggested materials are selected automatically based on the student's weak topics identified in their personalization models.
                      </div>
                    </div>

                    <button
                      onClick={handleSendIntervention}
                      disabled={isSendingIntervention}
                      className="btn-primary w-full py-2.5 mt-2"
                    >
                      {isSendingIntervention ? 'Sending...' : '📧 Send Support Email'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-20 text-white/35 flex flex-col items-center justify-center space-y-3">
                    <span className="text-4xl">📧</span>
                    <p className="text-xs font-medium max-w-[200px]">Select a student to launch a support intervention email draft.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="animate-fadeIn max-w-2xl glass-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/10">
              📝
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate & Assign Quiz</h2>
              <p className="text-xs text-white/40">Assign educational assessments to all enrolled students using AI</p>
            </div>
          </div>

          <form onSubmit={handleAssignQuiz} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Active Course</label>
              <select
                value={selectedCourseId}
                onChange={e => setSelectedCourseId(e.target.value)}
                className="input-field text-white"
                required
              >
                <option value="">Select course...</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Topic</label>
              <input
                type="text"
                value={assignTopic}
                onChange={e => setAssignTopic(e.target.value)}
                placeholder="e.g., SQL Joins, Concurrency Control, Process Scheduling..."
                className="input-field"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">Question Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['mcq', 'short', 'long', 'mixed'] as const).map(type => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setAssignType(type)}
                      className="rounded-xl py-2 text-xs font-medium transition-all capitalize"
                      style={{
                        background: assignType === type ? 'rgba(79,93,200,0.18)' : 'rgba(255,255,255,0.04)',
                        border: assignType === type ? '1px solid rgba(79,93,200,0.45)' : '1px solid rgba(255,255,255,0.08)',
                        color: assignType === type ? '#8b94e0' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {type === 'mcq' ? 'MCQ' : type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map(d => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => setAssignDifficulty(d)}
                      className="rounded-xl py-2 text-xs font-medium transition-all capitalize"
                      style={{
                        background: assignDifficulty === d ? 'rgba(79,93,200,0.10)' : 'rgba(255,255,255,0.04)',
                        border: assignDifficulty === d ? '1px solid rgba(79,93,200,0.32)' : '1px solid rgba(255,255,255,0.08)',
                        color: assignDifficulty === d ? '#8b94e0' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/60">
                <span>Number of Questions</span>
                <span className="text-white font-bold">{assignCount}</span>
              </label>
              <input
                type="range"
                min={3}
                max={20}
                value={assignCount}
                onChange={e => setAssignCount(Number(e.target.value))}
                className="w-full accent-primary-500 h-1"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Due Date (Optional)</label>
              <input
                type="datetime-local"
                value={assignDueDate}
                onChange={e => setAssignDueDate(e.target.value)}
                className="input-field text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isAssigning}
              className="btn-primary w-full"
            >
              {isAssigning ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating & Assigning Quiz...
                </span>
              ) : (
                '🚀 Generate and Assign to Class'
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="animate-fadeIn">
          {selectedAssignmentId && assignmentAnalytics ? (
            <div className="space-y-6">
              <button
                onClick={() => { setSelectedAssignmentId(null); setAssignmentAnalytics(null); }}
                className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
              >
                ← Back to History List
              </button>

              <div className="glass-card p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{assignmentAnalytics.title}</h2>
                    <p className="text-xs text-white/45 mt-0.5">
                      Assigned on: {formatDate(assignmentAnalytics.createdAt)} · Due: {assignmentAnalytics.dueDate ? formatDate(assignmentAnalytics.dueDate) : 'No due date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 mt-3 md:mt-0 text-center">
                    <div>
                      <div className="text-2xl font-black text-white">{assignmentAnalytics.completedStudents} / {assignmentAnalytics.totalStudents}</div>
                      <div className="text-[10px] text-white/40 uppercase font-semibold">Submissions</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-black ${getGradeColor(assignmentAnalytics.avgScore)}`}>{assignmentAnalytics.avgScore}%</div>
                      <div className="text-[10px] text-white/40 uppercase font-semibold">Class Avg</div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="pb-3 text-white/40 font-semibold uppercase">Student</th>
                        <th className="pb-3 text-white/40 font-semibold uppercase text-center">Status</th>
                        <th className="pb-3 text-white/40 font-semibold uppercase text-center">Grade</th>
                        <th className="pb-3 text-white/40 font-semibold uppercase text-right hidden sm:table-cell">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {assignmentAnalytics.submissions.map((sub: any) => (
                        <tr key={sub.student._id} className="hover:bg-white/[0.01]">
                          <td className="py-3">
                            <div className="font-semibold text-white">{sub.student.name}</div>
                            <div className="text-[10px] text-white/35">{sub.student.email}</div>
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                              style={{
                                background: sub.status === 'completed' ? 'rgba(52,168,122,0.1)' : sub.status === 'overdue' ? 'rgba(192,82,74,0.1)' : 'rgba(79,93,200,0.08)',
                                color: sub.status === 'completed' ? '#34a87a' : sub.status === 'overdue' ? '#c0524a' : '#8b94e0',
                              }}
                            >
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            {sub.status === 'completed' ? (
                              <span className={`font-bold text-sm ${getGradeColor(sub.percentage)}`}>
                                {sub.score} / {sub.maxScore} ({sub.percentage}%)
                              </span>
                            ) : (
                              <span className="text-white/20">-</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-white/45 hidden sm:table-cell">
                            {sub.completedAt ? formatDate(sub.completedAt) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : isLoadingAnalytics ? (
            <Loader message="Fetching assignment performance metrics..." />
          ) : (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white mb-2">Quiz Assignment History</h2>
              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse bg-white/5" />)}
                </div>
              ) : assignedQuizzes.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-white/40 font-semibold">No quizzes assigned to courses yet.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {assignedQuizzes.map(quiz => {
                    const completionRate = quiz.totalStudents > 0 ? Math.round((quiz.completedStudents / quiz.totalStudents) * 100) : 0;
                    return (
                      <div key={quiz.assignmentId} className="glass-card p-5 space-y-4 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="font-bold text-sm text-white">{quiz.topic}</h3>
                              <p className="text-[10px] text-white/40 mt-0.5">
                                {quiz.course.code} · Assigned: {new Date(quiz.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-[10px] bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 rounded-full text-primary-400 font-mono font-semibold">
                              {quiz.course.code}
                            </span>
                          </div>

                          <div className="mt-4 space-y-1.5">
                            <div className="flex justify-between text-[10px] text-white/40">
                              <span>Submissions: {quiz.completedStudents} / {quiz.totalStudents} ({completionRate}%)</span>
                              {quiz.completedStudents > 0 && (
                                <span>Avg Score: <strong className="text-white font-bold">{quiz.avgScore}%</strong></span>
                              )}
                            </div>
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${completionRate}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] text-white/35">
                            {quiz.dueDate ? `Due: ${new Date(quiz.dueDate).toLocaleDateString()}` : 'No due date'}
                          </span>
                          <button
                            onClick={() => handleFetchAnalytics(quiz.assignmentId)}
                            className="btn-secondary py-1 px-3 text-[10px]"
                          >
                            Inspect Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Student Profile Details Modal */}
      <AnimatePresence>
        {selectedStudentForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 flex flex-col relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white text-lg"
              >
                ✕
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                {selectedStudentForModal.avatar ? (
                  <img
                    src={selectedStudentForModal.avatar}
                    alt={selectedStudentForModal.name}
                    className="h-24 w-24 rounded-2xl object-cover border border-white/10"
                  />
                ) : (
                  <div
                    className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white font-mono"
                    style={{ background: 'linear-gradient(135deg, #4f5dc8 0%, #7c6fc2 100%)' }}
                  >
                    {selectedStudentForModal.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-white">{selectedStudentForModal.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/15 border border-green-500/30 text-green-400 uppercase mt-1 inline-block">
                    Enrolled Student
                  </span>
                  <p className="text-[10px] text-white/35 mt-1 font-mono">{selectedStudentForModal.email}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5 text-xs text-white/70">
                {selectedStudentForModal.department && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-0.5">Department / Major</span>
                    <p className="font-medium text-white/95">{selectedStudentForModal.department}</p>
                  </div>
                )}

                <div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-0.5">Student Biography</span>
                  <p className="font-light leading-relaxed whitespace-pre-line text-white/80">
                    {selectedStudentForModal.bio || 'No biography details provided by student.'}
                  </p>
                </div>

                {/* Academic Metrics */}
                <div className="pt-2">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-2">Performance Metrics</span>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[11px]">
                    <div>
                      <span className="text-white/40 block">Quiz Average</span>
                      <strong className={`text-sm font-bold block mt-0.5 ${getGradeColor(selectedStudentForModal.avgQuizScore)}`}>
                        {selectedStudentForModal.avgQuizScore}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-white/40 block">AI Interactions</span>
                      <strong className="text-sm font-bold text-white/90 block mt-0.5">
                        {selectedStudentForModal.totalQueries || 0} queries
                      </strong>
                    </div>
                    <div className="col-span-2 border-t border-white/[0.04] pt-2 mt-1">
                      <span className="text-white/40 block mb-1">Struggled Topics</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedStudentForModal.weakTopics && selectedStudentForModal.weakTopics.length > 0 ? (
                          selectedStudentForModal.weakTopics.map((t: string) => (
                            <span key={t} className="px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] rounded font-medium">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/20 text-[10px]">None flagged</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
