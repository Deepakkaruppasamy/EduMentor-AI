import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';
import { Course } from '../types';

// ── Validation helpers ────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateNameField(value: string): string {
  if (!value.trim()) return 'Full name is required.';
  if (value.trim().length < 2) return 'Name must be at least 2 characters.';
  if (!/^[a-zA-Z\s'\-]+$/.test(value.trim())) return "Name may only contain letters, spaces, hyphens, and apostrophes.";
  return '';
}

function validateEmailField(value: string): string {
  if (!value.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address.';
  return '';
}

function validateDepartmentField(value: string): string {
  if (!value.trim()) return 'Department is required.';
  if (value.trim().length < 2) return 'Department must be at least 2 characters.';
  return '';
}

function validatePhoneField(value: string): string {
  if (!value.trim()) return ''; // optional
  const cleaned = value.replace(/[\s\-().]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(cleaned)) return 'Enter a valid phone number (7–15 digits).';
  return '';
}

function validateSemesterField(value: string): string {
  if (!value) return ''; // optional
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 8) return 'Semester must be 1–8.';
  return '';
}

// ── Password strength indicator ───────────────────────────────────────────────
type StrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

function getPasswordStrength(_pwd: string): StrengthLevel {
  return 'empty'; // Not used in registration (no password — auto-generated)
}

// ── Field Error component ─────────────────────────────────────────────────────
const FieldError: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  ) : null;

// ── Valid Tick ────────────────────────────────────────────────────────────────
const ValidTick: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ) : null;

// ── Form field type ───────────────────────────────────────────────────────────
type FormErrors = {
  name: string; email: string; department: string; phone: string; semester: string;
};
type FormTouched = { name: boolean; email: boolean; department: boolean; phone: boolean; semester: boolean };

export const RegisterPage: React.FC = () => {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<'student' | 'faculty'>('student');
  const [department, setDepartment] = useState('');
  const [phone, setPhone]         = useState('');
  const [semester, setSemester]   = useState('');
  const [courseName, setCourseName] = useState('');
  const [courses, setCourses]     = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [genCredentials, setGenCredentials] = useState<{ name: string; email: string; role: string } | null>(null);

  const [errors, setErrors] = useState<FormErrors>({ name: '', email: '', department: '', phone: '', semester: '' });
  const [touched, setTouched] = useState<FormTouched>({ name: false, email: false, department: false, phone: false, semester: false });

  const navigate = useNavigate();

  // Load courses on mount
  useEffect(() => {
    courseService.getAll()
      .then(fetched => setCourses(fetched || []))
      .catch(err => console.error('Failed to load courses:', err));
  }, []);

  // Live validation when values change (only for touched fields)
  useEffect(() => { if (touched.name)       setErrors(p => ({ ...p, name:       validateNameField(name) })); },       [name, touched.name]);
  useEffect(() => { if (touched.email)      setErrors(p => ({ ...p, email:      validateEmailField(email) })); },     [email, touched.email]);
  useEffect(() => { if (touched.department) setErrors(p => ({ ...p, department: validateDepartmentField(department) })); }, [department, touched.department]);
  useEffect(() => { if (touched.phone)      setErrors(p => ({ ...p, phone:      validatePhoneField(phone) })); },     [phone, touched.phone]);
  useEffect(() => { if (touched.semester)   setErrors(p => ({ ...p, semester:   validateSemesterField(semester) })); }, [semester, touched.semester]);

  const handleBlur = (field: keyof FormTouched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const validators: Record<keyof FormTouched, () => string> = {
      name:       () => validateNameField(name),
      email:      () => validateEmailField(email),
      department: () => validateDepartmentField(department),
      phone:      () => validatePhoneField(phone),
      semester:   () => validateSemesterField(semester),
    };
    setErrors(prev => ({ ...prev, [field]: validators[field]() }));
  };

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]);
  };

  const validateAll = (): boolean => {
    const newErrors: FormErrors = {
      name:       validateNameField(name),
      email:      validateEmailField(email),
      department: validateDepartmentField(department),
      phone:      validatePhoneField(phone),
      semester:   validateSemesterField(semester),
    };
    setErrors(newErrors);
    setTouched({ name: true, email: true, department: true, phone: true, semester: true });
    if (!acceptTerms) { setTermsError('You must accept the Terms and Conditions.'); }
    return !Object.values(newErrors).some(Boolean) && acceptTerms;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    setIsLoading(true);
    try {
      const res = await authService.register({
        name, email, role, department,
        semester: semester ? Number(semester) : undefined,
        phone: phone || undefined,
        courseName: courseName || undefined,
        courses: selectedCourses,
      });

      setGenCredentials({ name: res.user.name, email: res.user.email, role: res.user.role });
      toast.success('Registration complete!');
    } catch (err: any) {
      // Map server-side field errors
      const serverErrors: { field: string; message: string }[] = err.response?.data?.errors || [];
      if (serverErrors.length > 0) {
        const fieldMap: Partial<FormErrors> = {};
        serverErrors.forEach((e: { field: string; message: string }) => {
          if (e.field in errors) (fieldMap as any)[e.field] = e.message;
        });
        setErrors(prev => ({ ...prev, ...fieldMap }));
        setTouched({ name: true, email: true, department: true, phone: true, semester: true });
      } else {
        toast.error(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: keyof FormTouched) =>
    `input-field pr-9 transition-all ${touched[field] && errors[field] ? 'border-red-500/60 bg-red-500/5 focus:border-red-400' : touched[field] && !errors[field] ? 'border-green-500/40 bg-green-500/5' : ''}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
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

        <form onSubmit={handleRegister} className="space-y-4" noValidate>

          {/* Name + Email row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label htmlFor="register-name" className="mb-1.5 block text-xs font-medium text-white/60">Full Name *</label>
              <div className="relative">
                <input id="register-name" type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="John Doe" className={inputClass('name')} />
                <ValidTick show={touched.name && !errors.name} />
              </div>
              <FieldError message={errors.name} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="mb-1.5 block text-xs font-medium text-white/60">Email *</label>
              <div className="relative">
                <input id="register-email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="your@university.edu" className={inputClass('email')} />
                <ValidTick show={touched.email && !errors.email} />
              </div>
              <FieldError message={errors.email} />
            </div>
          </div>

          {/* Role + Department row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role */}
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

            {/* Department */}
            <div>
              <label htmlFor="register-department" className="mb-1.5 block text-xs font-medium text-white/60">Department *</label>
              <div className="relative">
                <input id="register-department" type="text" value={department}
                  onChange={e => setDepartment(e.target.value)}
                  onBlur={() => handleBlur('department')}
                  placeholder="Computer Science, Physics…" className={inputClass('department')} />
                <ValidTick show={touched.department && !errors.department} />
              </div>
              <FieldError message={errors.department} />
            </div>
          </div>

          {/* Student-specific fields */}
          {role === 'student' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="register-course-name" className="mb-1.5 block text-xs font-medium text-white/60">Course Code (Optional)</label>
                <input id="register-course-name" type="text" value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="CS101" className="input-field font-mono" />
              </div>
              <div>
                <label htmlFor="register-semester" className="mb-1.5 block text-xs font-medium text-white/60">Semester (Optional)</label>
                <div className="relative">
                  <input id="register-semester" type="number" value={semester}
                    onChange={e => setSemester(e.target.value)}
                    onBlur={() => handleBlur('semester')}
                    placeholder="1" min="1" max="8" className={inputClass('semester')} />
                  <ValidTick show={touched.semester && !errors.semester && !!semester} />
                </div>
                <FieldError message={errors.semester} />
              </div>
            </div>
          )}

          {/* Phone */}
          <div>
            <label htmlFor="register-phone" className="mb-1.5 block text-xs font-medium text-white/60">Phone Number (Optional)</label>
            <div className="relative">
              <input id="register-phone" type="text" value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="+1234567890" className={inputClass('phone')} />
              <ValidTick show={touched.phone && !errors.phone && !!phone} />
            </div>
            <FieldError message={errors.phone} />
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

          {/* Terms & Conditions */}
          <div>
            <div className="flex items-start">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={e => { setAcceptTerms(e.target.checked); if (e.target.checked) setTermsError(''); }}
                className="mt-0.5 h-4 w-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
              />
              <label htmlFor="accept-terms" className="ml-2 block text-xs text-white/60 select-none cursor-pointer leading-normal">
                I accept the{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); toast('Standard academic usage terms apply.'); }}
                  className="text-primary-400 hover:underline">Terms &amp; Conditions</a>{' '}
                and consent to educational tracking.
              </label>
            </div>
            {termsError && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {termsError}
              </p>
            )}
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
              className="glass-card w-full max-w-md p-6 border border-white/15 text-center space-y-5">
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
                onClick={() => { setGenCredentials(null); navigate('/login'); }}
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
