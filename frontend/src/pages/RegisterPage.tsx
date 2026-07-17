import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';
import { Course } from '../types';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [semester, setSemester] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [genCredentials, setGenCredentials] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const navigate = useNavigate();

  // Load courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetched = await courseService.getAll();
        setCourses(fetched || []);
      } catch (err: any) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
  }, []);

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
          ? prev.filter(id => id !== courseId)
          : [...prev, courseId]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      toast.error('You must accept the Terms and Conditions.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.register({ 
        name, 
        email, 
        role,
        department,
        semester: semester ? Number(semester) : undefined,
        phone: phone || undefined,
        courseName: courseName || undefined,
        courses: selectedCourses
      });

      // Show email-confirmation modal (no password displayed)
      setGenCredentials({
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
      });

      toast.success('Registration request complete!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }} />
        <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-lg p-8">

        <div className="mb-6 text-center">
          <Logo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="mt-1 text-sm text-white/40 font-mono">Join EduMentor AI today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Full Name *</label>
              <input id="register-name" type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="John Doe" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Email *</label>
              <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@university.edu" className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">I am a... *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'faculty'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => { setRole(r); setSemester(''); setCourseName(''); }}
                    className="rounded-xl py-2.5 text-xs font-medium transition-all capitalize"
                    style={{
                      background: role === r ? 'rgba(79,93,200,0.18)' : 'rgba(255,255,255,0.04)',
                      border: role === r ? '1px solid rgba(79,93,200,0.45)' : '1px solid rgba(255,255,255,0.08)',
                      color: role === r ? '#8b94e0' : 'rgba(255,255,255,0.5)',
                    }}>
                    {r === 'student' ? '🎓 Student' : '👨‍🏫 Faculty'}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Department *</label>
              <input id="register-department" type="text" value={department} onChange={e => setDepartment(e.target.value)} required
                placeholder="Computer Science, Physics, etc." className="input-field" />
            </div>
          </div>

          {/* Student Specific Fields */}
          {role === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Course Code (Optional)</label>
                <input id="register-course-name" type="text" value={courseName} onChange={e => setCourseName(e.target.value)}
                  placeholder="CS101" className="input-field font-mono" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">Semester (Optional)</label>
                <input id="register-semester" type="number" value={semester} onChange={e => setSemester(e.target.value)}
                  placeholder="1" min="1" max="8" className="input-field" />
              </div>
            </div>
          )}

          {/* Extra Fields */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Phone Number (Optional)</label>
            <input id="register-phone" type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+1234567890" className="input-field" />
          </div>

          {/* Course Selection */}
          {courses.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Enrolled Courses (Optional)</label>
              <div className="max-h-28 overflow-y-auto p-3 bg-white/5 rounded-xl border border-white/5 grid grid-cols-1 gap-2 custom-scrollbar">
                {courses.map(course => (
                  <label key={course._id} className="flex items-center gap-2.5 text-xs text-white/70 hover:text-white transition-colors cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={selectedCourses.includes(course._id)}
                      onChange={() => handleCourseToggle(course._id)}
                      className="h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                    />
                    <span>{course.code} - {course.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Conditions Check */}
          <div className="flex items-start">
            <input 
              id="accept-terms" 
              type="checkbox" 
              checked={acceptTerms} 
              onChange={e => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-0" 
            />
            <label htmlFor="accept-terms" className="ml-2 block text-xs text-white/60 select-none cursor-pointer leading-normal">
              I accept the <a href="#" onClick={(e) => { e.preventDefault(); toast('Standard academic usage terms apply.'); }} className="text-primary-400 hover:underline">Terms & Conditions</a> and consent to educational tracking.
            </label>
          </div>

          <p className="text-[10px] text-white/35 italic pt-1">
            Note: A temporary login password will be generated automatically and sent to your email.
          </p>

          <button id="register-submit" type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Registering...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">Sign in</Link>
        </p>
      </motion.div>

      {/* ACCOUNT CREATED MODAL */}
      <AnimatePresence>
        {genCredentials && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 border border-white/15 text-center space-y-5"
            >
              <div className="h-14 w-14 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                ✉️
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Account Created! Check Your Email</h3>
                <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                  Hi <span className="text-white/80 font-semibold">{genCredentials.name}</span>, your{' '}
                  <span className="capitalize text-white/80">{genCredentials.role}</span> account has been created.
                </p>
              </div>

              <div className="p-4 rounded-xl space-y-2 text-left" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📧</span>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Email sent to</div>
                    <div className="text-xs text-white font-mono mt-0.5">{genCredentials.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔑</span>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Temporary password</div>
                    <div className="text-xs text-white/60 mt-0.5">Sent securely to your email address</div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-white/30 leading-relaxed">
                Open your inbox, copy the temporary password, and sign in. You'll be prompted to set a permanent password on first login.
              </p>

              <button
                type="button"
                onClick={() => {
                  setGenCredentials(null);
                  navigate('/login');
                }}
                className="btn-primary w-full py-2.5 text-xs font-bold"
              >
                Go to Sign In →
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
