import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { courseService } from '../services/course.service';
import { Course } from '../types';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { DocumentUploader } from '../components/documents/DocumentUploader';

export const CoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', code: '', description: '' });

  const isStudent = user?.role === 'student';

  useEffect(() => {
    courseService.getAll()
      .then(setCourses)
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleEnroll = async (courseId: string) => {
    try {
      await courseService.enroll(courseId);
      toast.success('Enrolled successfully!');
      setCourses(prev => prev.map(c => c._id === courseId ? { ...c, students: [...c.students, user!.id] } : c));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    }
  };

  const handleSeed = async () => {
    try {
      const seeded = await courseService.seed();
      toast.success(`Created ${seeded.length} predefined courses`);
      const all = await courseService.getAll();
      setCourses(all);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to seed courses');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const course = await courseService.create(newCourse);
      setCourses(prev => [course, ...prev]);
      setShowCreate(false);
      setNewCourse({ title: '', code: '', description: '' });
      toast.success('Course created!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    }
  };

  const COURSE_ICONS: Record<string, string> = {
    'DBMS': '🗄️', 'OS': '💻', 'CN': '🌐', 'DS': '🌲', 'ML': '🤖',
  };

  const getIcon = (code: string) => {
    const prefix = Object.keys(COURSE_ICONS).find(k => code.startsWith(k));
    return prefix ? COURSE_ICONS[prefix] : '📚';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📚 Courses</h1>
          <p className="mt-1 text-sm text-white/40">{isStudent ? 'Browse and enroll in courses' : 'Manage your courses'}</p>
        </div>
        {!isStudent && (
          <div className="flex gap-2">
            <button onClick={handleSeed} className="btn-secondary py-2 text-xs">🌱 Seed Defaults</button>
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary py-2 text-xs">+ Create Course</button>
          </div>
        )}
      </div>

      {/* Create Course Form */}
      {showCreate && (
        <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreate}
          className="glass-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Create New Course</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input required value={newCourse.title} onChange={e => setNewCourse(p => ({ ...p, title: e.target.value }))}
              placeholder="Course Title" className="input-field" />
            <input required value={newCourse.code} onChange={e => setNewCourse(p => ({ ...p, code: e.target.value }))}
              placeholder="Course Code (e.g., CS101)" className="input-field" />
          </div>
          <textarea required value={newCourse.description} onChange={e => setNewCourse(p => ({ ...p, description: e.target.value }))}
            placeholder="Course description..." rows={2} className="input-field resize-none" />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => {
            const isEnrolled = isStudent && course.students?.includes(user!.id);
            return (
              <motion.div key={course._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2) 0%, rgba(159,122,234,0.2) 100%)', border: '1px solid rgba(79,99,255,0.2)' }}>
                    {getIcon(course.code)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white leading-tight">{course.title}</h3>
                    <p className="text-[10px] text-white/40 font-mono">{course.code}</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 flex-1 leading-relaxed line-clamp-2">{course.description}</p>
                <div className="mt-4 flex items-center justify-between text-[10px] text-white/30">
                  <span>👥 {course.students?.length || 0} students</span>
                  <span>📄 {course.documents?.length || 0} docs</span>
                </div>
                {isStudent && (
                  <button onClick={() => !isEnrolled && handleEnroll(course._id)}
                    disabled={isEnrolled}
                    className={`mt-3 rounded-xl py-2 text-xs font-medium transition-all ${isEnrolled ? 'cursor-default' : 'btn-primary'}`}
                    style={isEnrolled ? { background: 'rgba(72,187,120,0.15)', border: '1px solid rgba(72,187,120,0.3)', color: '#48bb78' } : {}}>
                    {isEnrolled ? '✅ Enrolled' : 'Enroll Now'}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {!isLoading && courses.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white/40">No courses available yet.</p>
          {!isStudent && <button onClick={handleSeed} className="btn-primary mt-4 text-sm">🌱 Seed Predefined Courses</button>}
        </div>
      )}
    </div>
  );
};
