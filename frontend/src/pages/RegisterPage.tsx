import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';
import { Course } from '../types';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
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

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isStrong) {
      toast.error('Please satisfy all password strength requirements.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (!acceptTerms) {
      toast.error('You must accept the Terms and Conditions.');
      return;
    }

    setIsLoading(true);
    try {
      const { user, token } = await authService.register({ 
        name, 
        email, 
        password, 
        role,
        department,
        courses: selectedCourses
      });
      setAuth(user, token);
      toast.success(`Welcome to EduMentor AI, ${user.name}!`);
      navigate(user.role === 'student' ? '/dashboard' : '/admin');
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
          style={{ background: 'radial-gradient(circle, #4f63ff, transparent)' }} />
        <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #9f7aea, transparent)' }} />
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
              <label className="mb-1.5 block text-xs font-medium text-white/60">Full Name</label>
              <input id="register-name" type="text" value={name} onChange={e => setName(e.target.value)} required
                placeholder="John Doe" className="input-field" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Email</label>
              <input id="register-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@university.edu" className="input-field" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Password</label>
              <div className="relative">
                <input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="Min. 8 characters" className="input-field pr-10" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Confirm Password</label>
              <input id="register-confirm-password" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                placeholder="Confirm password" className="input-field" />
            </div>
          </div>

          {/* Password strength checks UI */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="col-span-full">
              <p className="text-[11px] font-semibold text-white/70">Password Requirements:</p>
            </div>
            <span className={`text-[10px] ${hasMinLength ? 'text-emerald-400' : 'text-white/30'}`}>
              {hasMinLength ? '✓' : '○'} 8+ characters
            </span>
            <span className={`text-[10px] ${hasUppercase ? 'text-emerald-400' : 'text-white/30'}`}>
              {hasUppercase ? '✓' : '○'} Uppercase
            </span>
            <span className={`text-[10px] ${hasLowercase ? 'text-emerald-400' : 'text-white/30'}`}>
              {hasLowercase ? '✓' : '○'} Lowercase
            </span>
            <span className={`text-[10px] ${hasNumber ? 'text-emerald-400' : 'text-white/30'}`}>
              {hasNumber ? '✓' : '○'} Number
            </span>
            <span className={`text-[10px] ${hasSpecialChar ? 'text-emerald-400' : 'text-white/30'}`}>
              {hasSpecialChar ? '✓' : '○'} Special char
            </span>
            <span className={`text-[10px] ${password && password === confirmPassword ? 'text-emerald-400' : 'text-white/30'}`}>
              {password && password === confirmPassword ? '✓' : '○'} Passwords match
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">I am a...</label>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'faculty'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className="rounded-xl py-2.5 text-xs font-medium transition-all capitalize"
                    style={{
                      background: role === r ? 'rgba(79,99,255,0.25)' : 'rgba(255,255,255,0.04)',
                      border: role === r ? '1px solid rgba(79,99,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: role === r ? '#7c8fff' : 'rgba(255,255,255,0.5)',
                    }}>
                    {r === 'student' ? '🎓 Student' : '👨‍🏫 Faculty'}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Department</label>
              <input id="register-department" type="text" value={department} onChange={e => setDepartment(e.target.value)} required
                placeholder="Computer Science, Physics, etc." className="input-field" />
            </div>
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

          <button id="register-submit" type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 transition-colors font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};
