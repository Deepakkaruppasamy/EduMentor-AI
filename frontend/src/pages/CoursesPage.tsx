import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { courseService } from '../services/course.service';
import { recentlyViewedService } from '../services/recently-viewed.service';
import api from '../services/api';
import { Course } from '../types';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

export const CoursesPage: React.FC = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', code: '', description: '', image: '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('all');

  // Edit Course state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState({ title: '', code: '', description: '', image: '' });

  // Faculty info modal state
  const [selectedFacultyForModal, setSelectedFacultyForModal] = useState<any | null>(null);

  const isStudent = user?.role === 'student';

  const uniqueFaculties = React.useMemo(() => {
    const map = new Map<string, { _id: string; name: string; email: string; avatar?: string; bio?: string; qualifications?: string; department?: string }>();
    courses.forEach(c => {
      if (c.faculty && typeof c.faculty === 'object' && '_id' in c.faculty) {
        map.set(c.faculty._id, c.faculty);
      }
    });
    return Array.from(map.values());
  }, [courses]);

  const filteredCourses = React.useMemo(() => {
    if (selectedFacultyId === 'all') return courses;
    return courses.filter(c => c.faculty && typeof c.faculty === 'object' && c.faculty._id === selectedFacultyId);
  }, [courses, selectedFacultyId]);

  const fetchCourses = () => {
    setIsLoading(true);
    courseService.getAll()
      .then(setCourses)
      .catch(() => toast.error('Failed to load courses'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (courses.length > 0 && user) {
      courses.forEach(c => {
        if (c.students?.includes(user.id)) {
          recentlyViewedService.record({
            itemType: 'course',
            itemId: c._id,
            title: `Course: ${c.title}`,
            url: `/courses`
          }).catch(() => {});
        }
      });
    }
  }, [courses, user]);

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
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to seed courses');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file should be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingImage(true);

    try {
      const { data } = await api.post('/auth/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (isEdit) {
        setEditForm(prev => ({ ...prev, image: data.imageUrl }));
      } else {
        setNewCourse(prev => ({ ...prev, image: data.imageUrl }));
      }
      toast.success('Course cover photo uploaded successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cover photo upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const course = await courseService.create(newCourse);
      setCourses(prev => [course, ...prev]);
      setShowCreate(false);
      setNewCourse({ title: '', code: '', description: '', image: '' });
      toast.success('Course created successfully!');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create course');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const updated = await courseService.update(editingCourse._id, editForm);
      setCourses(prev => prev.map(c => c._id === updated._id ? { ...c, ...updated } : c));
      setEditingCourse(null);
      toast.success('Course updated successfully!');
      fetchCourses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course and all associated materials? This cannot be undone.')) return;
    try {
      await courseService.delete(id);
      setCourses(prev => prev.filter(c => c._id !== id));
      toast.success('Course deleted successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete course');
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
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/50">Course Cover Image (Optional)</label>
            <div className="flex items-center gap-3">
              {newCourse.image && (
                <img src={newCourse.image} alt="Preview" className="h-10 w-16 object-cover rounded border border-white/10" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, false)}
                disabled={isUploadingImage}
                className="text-xs text-white/50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer"
              />
              {isUploadingImage && (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary py-2 px-5 text-xs">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary py-2 px-5 text-xs">Cancel</button>
          </div>
        </motion.form>
      )}

      {/* Faculty Selection Card Deck */}
      {!isLoading && courses.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Filter by Instructor</label>
          <div className="flex flex-wrap gap-2">
            {/* All Instructors Card */}
            <div
              onClick={() => setSelectedFacultyId('all')}
              className="glass-card px-3 py-2 rounded-xl flex items-center gap-2.5 cursor-pointer select-none transition-all duration-250 text-left"
              style={{
                background: selectedFacultyId === 'all' ? 'rgba(79,93,200,0.09)' : 'rgba(255,255,255,0.02)',
                borderColor: selectedFacultyId === 'all' ? 'rgba(79,93,200,0.28)' : 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold bg-white/5 text-white/70">
                👥
              </div>
              <div>
                <div className="text-[11px] font-bold text-white">All Instructors</div>
                <div className="text-[9px] text-white/30">Show all courses</div>
              </div>
            </div>

            {/* Individual Faculty Cards */}
            {uniqueFaculties.map(fac => (
              <div
                key={fac._id}
                onClick={() => setSelectedFacultyId(fac._id)}
                className="glass-card px-3 py-2 rounded-xl flex items-center gap-2.5 cursor-pointer select-none transition-all duration-250 text-left group relative"
                style={{
                  background: selectedFacultyId === fac._id ? 'rgba(79,93,200,0.09)' : 'rgba(255,255,255,0.02)',
                  borderColor: selectedFacultyId === fac._id ? 'rgba(79,93,200,0.28)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {fac.avatar ? (
                  <img src={fac.avatar} alt={fac.name} className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold text-white font-mono"
                       style={{ background: 'linear-gradient(135deg, #4f5dc8 0%, #7c6fc2 100%)' }}>
                    {fac.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate flex items-center gap-1">
                    {fac.name}
                  </div>
                  <div className="text-[9px] text-white/30 truncate">{fac.email}</div>
                </div>
                
                {/* View info button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFacultyForModal(fac);
                  }}
                  className="ml-1 p-0.5 text-xs text-white/40 hover:text-white bg-white/5 rounded-md transition-colors"
                  title="View Profile Details"
                >
                  ℹ️
                </button>
              </div>
            ))}
          </div>
        </div>
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
          {filteredCourses.map((course, i) => {
            const isEnrolled = isStudent && course.students?.includes(user!.id);
            const facultyObj = course.faculty && typeof course.faculty === 'object' ? course.faculty : null;
            const facultyName = facultyObj ? facultyObj.name : 'Unknown';
            return (
              <motion.div key={course._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card flex flex-col overflow-hidden">
                
                {/* Cover Banner */}
                <div className="relative aspect-video rounded-t-2xl overflow-hidden bg-white/5 border-b border-white/5 flex items-center justify-center">
                  {course.image ? (
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  ) : (
                    <span className="text-3xl">📚</span>
                  )}
                  {/* Code badge */}
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[9px] font-mono font-bold text-white border border-white/10 uppercase tracking-wider">
                    {course.code}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-white leading-tight mb-1">{course.title}</h3>
                    <div className="flex items-center gap-1.5">
                      {facultyObj?.avatar ? (
                        <img src={facultyObj.avatar} alt={facultyName} className="h-4 w-4 rounded-full object-cover" />
                      ) : (
                        <span className="text-xs">👨‍🏫</span>
                      )}
                      <button
                        onClick={() => facultyObj && setSelectedFacultyForModal(facultyObj)}
                        className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold hover:underline"
                      >
                        {facultyName}
                      </button>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mt-2.5 line-clamp-3 font-light">{course.description}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-white/30 border-t border-white/5 pt-3 mt-1">
                      <span>👥 {course.students?.length || 0} students</span>
                      <span>📄 {course.documents?.length || 0} docs</span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {isStudent ? (
                        <button onClick={() => !isEnrolled && handleEnroll(course._id)}
                          disabled={isEnrolled}
                          className={`w-full rounded-xl py-2 text-xs font-semibold transition-all ${isEnrolled ? 'cursor-default' : 'btn-primary'}`}
                          style={isEnrolled ? { background: 'rgba(52,168,122,0.15)', border: '1px solid rgba(52,168,122,0.3)', color: '#34a87a' } : {}}>
                          {isEnrolled ? '✅ Enrolled' : 'Enroll Now'}
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingCourse(course);
                              setEditForm({
                                title: course.title,
                                code: course.code,
                                description: course.description,
                                image: course.image || '',
                              });
                            }}
                            className="btn-secondary w-full py-1.5 text-xs font-semibold"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course._id)}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 w-full py-1.5 text-xs font-semibold rounded-xl transition-all"
                          >
                            🗑️ Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Course Modal */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onSubmit={handleUpdate}
              className="glass-card w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">Edit Course Details</h3>
                <button type="button" onClick={() => setEditingCourse(null)} className="text-white/40 hover:text-white">✕</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Course Title</label>
                  <input
                    required
                    value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    className="input-field text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">Course Code</label>
                  <input
                    required
                    value={editForm.code}
                    onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))}
                    className="input-field text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Description</label>
                <textarea
                  required
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="input-field text-white resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-white/60">Cover Image</label>
                <div className="flex items-center gap-3">
                  {editForm.image && (
                    <img src={editForm.image} alt="Preview" className="h-10 w-16 object-cover rounded border border-white/10" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, true)}
                    disabled={isUploadingImage}
                    className="text-xs text-white/50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 file:cursor-pointer"
                  />
                  {isUploadingImage && (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary py-2 px-5 text-xs">Save Changes</button>
                <button type="button" onClick={() => setEditingCourse(null)} className="btn-secondary py-2 px-5 text-xs">Cancel</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Faculty Profile Details Modal */}
      <AnimatePresence>
        {selectedFacultyForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 flex flex-col relative space-y-4"
            >
              <button
                type="button"
                onClick={() => setSelectedFacultyForModal(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white text-lg"
              >
                ✕
              </button>

              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                {selectedFacultyForModal.avatar ? (
                  <img
                    src={selectedFacultyForModal.avatar}
                    alt={selectedFacultyForModal.name}
                    className="h-24 w-24 rounded-2xl object-cover border border-white/10"
                  />
                ) : (
                  <div
                    className="h-24 w-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white font-mono"
                    style={{ background: 'linear-gradient(135deg, #4f5dc8 0%, #7c6fc2 100%)' }}
                  >
                    {selectedFacultyForModal.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-white">{selectedFacultyForModal.name}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-primary-500/15 border border-primary-500/30 text-primary-400 uppercase mt-1 inline-block">
                    Course Instructor
                  </span>
                  <p className="text-[10px] text-white/35 mt-1 font-mono">{selectedFacultyForModal.email}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5 text-xs text-white/70">
                {selectedFacultyForModal.department && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-0.5">Department</span>
                    <p className="font-medium text-white/95">{selectedFacultyForModal.department}</p>
                  </div>
                )}

                {selectedFacultyForModal.qualifications && (
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-0.5">Qualifications & Degrees</span>
                    <p className="font-medium text-white/95">{selectedFacultyForModal.qualifications}</p>
                  </div>
                )}

                <div>
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-white/30 block mb-0.5">Biography & Research</span>
                  <p className="font-light leading-relaxed whitespace-pre-line text-white/80">
                    {selectedFacultyForModal.bio || 'No biography details provided by instructor.'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!isLoading && filteredCourses.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white/40">No courses match the selected instructor.</p>
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
