import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { courseService } from '../services/course.service';
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

        {/* Course Filter Dropdown */}
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

      {isLoadingGrades ? (
        <Loader message="Loading class performance analytics..." />
      ) : (
        <div className="space-y-6">
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
                      <Bar dataKey="avgScore" fill="#fc8181" radius={[6, 6, 0, 0]} name="Avg Quiz Score (%)" />
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
                    <th className="pb-3 text-white/40 font-semibold uppercase">Weak Topics</th>
                    <th className="pb-3 text-white/40 font-semibold uppercase">Strong Topics</th>
                    <th className="pb-3 text-white/40 font-semibold uppercase text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {gradebook.map((student) => (
                    <tr key={student.studentId} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 pr-3">
                        <div className="font-semibold text-white">{student.name}</div>
                        <div className="text-[10px] text-white/35">{student.email}</div>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`font-bold text-sm ${getGradeColor(student.avgQuizScore)}`}>
                          {student.avgQuizScore}%
                        </span>
                      </td>
                      <td className="py-4 text-center font-medium text-white/70">{student.totalQueries}</td>
                      <td className="py-4 pr-3 max-w-[200px] truncate text-white/60">
                        {student.weakTopics.join(', ') || <span className="text-white/20">None</span>}
                      </td>
                      <td className="py-4 pr-3 max-w-[200px] truncate text-white/60">
                        {student.strongTopics.join(', ') || <span className="text-white/20">None</span>}
                      </td>
                      <td className="py-4 text-right text-white/40">
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
      )}
    </div>
  );
};
