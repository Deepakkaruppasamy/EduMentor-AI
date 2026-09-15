import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';
import { Course } from '../types';

// ── Inline Validation Helpers ──────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateNameField(value: string): string {
  if (!value.trim()) return 'Full name is required.';
  if (value.trim().length < 2) return 'Name must be at least 2 characters.';
  if (!/^[a-zA-Z\s'\-]+$/.test(value.trim())) return "Name may only contain letters, spaces, hyphens, and apostrophes.";
  return '';
}

function validateEmailField(value: string): string {
  if (!value.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address (e.g. user@domain.com).';
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

// ── Field Error Component ──────────────────────────────────────────────────────
const FieldError: React.FC<{ message: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1 animate-fadeIn">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  ) : null;

// ── Valid Tick Component ───────────────────────────────────────────────────────
const ValidTick: React.FC<{ show: boolean }> = ({ show }) =>
  show ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ) : null;

type FormErrors = {
  name: string; email: string; department: string; phone: string; semester: string;
};
type FormTouched = { name: boolean; email: boolean; department: boolean; phone: boolean; semester: boolean };

export const RegisterPage: React.FC = () => {
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [role, setRole]                   = useState<'student' | 'faculty'>('student');
  const [department, setDepartment]       = useState('');
  const [phone, setPhone]                 = useState('');
  const [semester, setSemester]           = useState('');
  const [courseName, setCourseName]       = useState('');
  const [courses, setCourses]             = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [acceptTerms, setAcceptTerms]     = useState(false);
  const [termsError, setTermsError]       = useState('');

  const [isLoading, setIsLoading]         = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [genCredentials, setGenCredentials] = useState<{ name: string; email: string; role: string } | null>(null);

  const [errors, setErrors]   = useState<FormErrors>({ name: '', email: '', department: '', phone: '', semester: '' });
  const [touched, setTouched] = useState<FormTouched>({ name: false, email: false, department: false, phone: false, semester: false });

  const navigate = useNavigate();

  // Load available courses on mount
  useEffect(() => {
    courseService.getAll()
      .then(fetched => setCourses(fetched || []))
      .catch(err => console.error('Failed to load courses:', err));
  }, []);

  // Sync validation on input change (only if touched)
  useEffect(() => { if (touched.name)       setErrors(p => ({ ...p, name:       validateNameField(name) })); },       [name, touched.name]);
  useEffect(() => { if (touched.email)      setErrors(p => ({ ...p, email:      validateEmailField(email) })); },     [email, touched.email]);
  useEffect(() => { if (touched.department) setErrors(p => ({ ...p, department: validateDepartmentField(department) })); }, [department, touched.department]);
  useEffect(() => { if (touched.phone)      setErrors(p => ({ ...p, phone:      validatePhoneField(phone) })); },     [phone, touched.phone]);
  useEffect(() => { if (touched.semester)   setErrors(p => ({ ...p, semester:   validateSemesterField(semester) })); }, [semester, touched.semester]);

  const handleBlur = async (field: keyof FormTouched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const validators: Record<keyof FormTouched, () => string> = {
      name:       () => validateNameField(name),
      email:      () => validateEmailField(email),
      department: () => validateDepartmentField(department),
      phone:      () => validatePhoneField(phone),
      semester:   () => validateSemesterField(semester),
    };
    const syncErr = validators[field]();
    setErrors(prev => ({ ...prev, [field]: syncErr }));

    // Real-time live email lookup on blur
    if (field === 'email' && !syncErr && email.trim()) {
      setIsVerifyingEmail(true);
      const liveCheck = await authService.checkEmailStatus(email.trim(), 'register');
      setIsVerifyingEmail(false);
      if (!liveCheck.isLive) {
        setErrors(prev => ({ ...prev, email: liveCheck.message }));
      }
    }
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
      const serverErrors: { field: string; message: string }[] = err.response?.data?.errors || [];
      if (serverErrors.length > 0) {
        const fieldMap: Partial<FormErrors> = {};
        serverErrors.forEach((e: { field: string; message: string }) => {
          if (e.field in errors) (fieldMap as any)[e.field] = e.message;
        });
        setErrors(prev => ({ ...prev, ...fieldMap }));
        setTouched({ name: true, email: true, department: true, phone: true, semester: true });
      } else {
        toast.error(err.response?.data?.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: keyof FormTouched) =>
    `input-field pr-9 transition-all ${touched[field] && errors[field] ? 'border-red-500/60 bg-red-500/5 focus:border-red-400' : touched[field] && !errors[field] ? 'border-green-500/40 bg-green-500/5' : ''}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }} />
        <div className="absolute -right-40 bottom-20 h-80 w-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-lg p-8 relative z-10">

        <div className="mb-6 text-center">
          <Logo size="lg" className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="mt-1 text-sm text-white/40 font-mono">Join EduMentor AI today</p>
        </div>

        <AnimatePresence mode="wait">
          {genCredentials ? (
            /* Success screen showing account created */
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">Account Created Successfully!</h2>
                <p className="mt-2 text-xs text-white/60 max-w-sm mx-auto">
                  A temporary password has been sent to your live email address (<span className="text-white font-semibold">{genCredentials.email}</span>).
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Full Name:</span>
                  <span className="text-white font-medium">{genCredentials.name}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Email:</span>
                  <span className="text-white font-medium">{genCredentials.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Role:</span>
                  <span className="text-primary-300 font-medium capitalize">{genCredentials.role}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  Proceed to Sign In
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">I am registering as</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      role === 'student'
                        ? 'border-primary-500 bg-primary-500/10 text-white shadow-lg shadow-primary-500/10'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('faculty')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      role === 'faculty'
                        ? 'border-primary-500 bg-primary-500/10 text-white shadow-lg shadow-primary-500/10'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                    }`}
                  >
                    👨‍🏫 Faculty / Professor
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-white/60 mb-1">Full Name *</label>
                <div className="relative">
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    placeholder="e.g. Dr. Jane Smith"
                    className={inputClass('name')}
                    aria-invalid={!!errors.name}
                  />
                  <ValidTick show={touched.name && !errors.name} />
                </div>
                <FieldError message={errors.name} />
              </div>

              {/* Live Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-email" className="block text-xs font-medium text-white/60">Live Email Address *</label>
                  {isVerifyingEmail ? (
                    <span className="text-amber-400 flex items-center gap-1 text-[10px] animate-pulse">
                      <svg className="animate-spin h-3 w-3 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying DNS MX Record...
                    </span>
                  ) : touched.email && !errors.email ? (
                    <span className="text-green-400 flex items-center gap-1 text-[10px]">
                      Live Email Verified ✓
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="yourname@gmail.com or @university.edu"
                    className={inputClass('email')}
                    aria-invalid={!!errors.email}
                  />
                  <ValidTick show={touched.email && !errors.email} />
                </div>
                <FieldError message={errors.email} />
              </div>

              {/* Department */}
              <div>
                <label htmlFor="reg-department" className="block text-xs font-medium text-white/60 mb-1">Department *</label>
                <div className="relative">
                  <input
                    id="reg-department"
                    type="text"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    onBlur={() => handleBlur('department')}
                    placeholder="e.g. Computer Science & Engineering"
                    className={inputClass('department')}
                    aria-invalid={!!errors.department}
                  />
                  <ValidTick show={touched.department && !errors.department} />
                </div>
                <FieldError message={errors.department} />
              </div>

              {/* Phone & Semester Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Phone (Optional) */}
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-medium text-white/60 mb-1">Phone Number</label>
                  <div className="relative">
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      placeholder="+1 (555) 000-0000"
                      className={inputClass('phone')}
                      aria-invalid={!!errors.phone}
                    />
                    <ValidTick show={touched.phone && !errors.phone && phone.length > 0} />
                  </div>
                  <FieldError message={errors.phone} />
                </div>

                {/* Semester (Optional for Student) */}
                <div>
                  <label htmlFor="reg-semester" className="block text-xs font-medium text-white/60 mb-1">Semester (1–8)</label>
                  <div className="relative">
                    <input
                      id="reg-semester"
                      type="number"
                      min={1}
                      max={8}
                      value={semester}
                      onChange={e => setSemester(e.target.value)}
                      onBlur={() => handleBlur('semester')}
                      placeholder="e.g. 5"
                      className={inputClass('semester')}
                      aria-invalid={!!errors.semester}
                    />
                    <ValidTick show={touched.semester && !errors.semester && semester.length > 0} />
                  </div>
                  <FieldError message={errors.semester} />
                </div>
              </div>

              {/* Course Selection */}
              {courses.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Select Enrolled / Teaching Courses</label>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 bg-white/5 border border-white/10 rounded-lg text-xs">
                    {courses.map(course => (
                      <label key={course._id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(course._id)}
                          onChange={() => handleCourseToggle(course._id)}
                          className="rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-white/80 font-mono text-[11px]">{course.code}</span>
                        <span className="text-white/50 truncate flex-1">{course.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={e => {
                      setAcceptTerms(e.target.checked);
                      if (e.target.checked) setTermsError('');
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors leading-tight">
                    I agree to the <span className="text-primary-400 underline">Terms of Service</span> and <span className="text-primary-400 underline">Privacy Policy</span>.
                  </span>
                </label>
                <FieldError message={termsError} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || isVerifyingEmail}
                className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </AnimatePresence>

        {/* Footer link */}
        {!genCredentials && (
          <div className="mt-6 text-center text-xs text-white/40">
            Already registered?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
              Sign in
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};
