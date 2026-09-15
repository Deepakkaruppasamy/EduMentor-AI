import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';

// ── Inline Validation Helpers ──────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateEmailField(value: string): string {
  if (!value.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address (e.g. user@domain.com).';
  return '';
}

function validatePasswordField(value: string): string {
  if (!value) return 'Password is required.';
  if (value.length < 6) return 'Password must be at least 6 characters.';
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

export const LoginPage: React.FC = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  // Per-field error & touched state
  const [errors, setErrors]   = useState<{ email: string; password: string }>({ email: '', password: '' });
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>({ email: false, password: false });

  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  // Load Remember Me email on mount
  useEffect(() => {
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRemember);
    if (savedRemember) {
      const savedEmail = localStorage.getItem('rememberMeEmail');
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  // Sync validation on change after field has been touched
  useEffect(() => {
    if (touched.email) setErrors(prev => ({ ...prev, email: validateEmailField(email) }));
  }, [email, touched.email]);

  useEffect(() => {
    if (touched.password) setErrors(prev => ({ ...prev, password: validatePasswordField(password) }));
  }, [password, touched.password]);

  const handleBlur = async (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      const syncErr = validateEmailField(email);
      setErrors(prev => ({ ...prev, email: syncErr }));
      if (!syncErr && email.trim()) {
        setIsVerifyingEmail(true);
        const liveCheck = await authService.checkEmailStatus(email.trim(), 'login');
        setIsVerifyingEmail(false);
        if (!liveCheck.isLive) {
          setErrors(prev => ({ ...prev, email: liveCheck.message }));
        }
      }
    }
    if (field === 'password') {
      setErrors(prev => ({ ...prev, password: validatePasswordField(password) }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const emailErr    = validateEmailField(email);
    const passwordErr = validatePasswordField(password);
    setErrors({ email: emailErr, password: passwordErr });

    if (emailErr || passwordErr) return;

    setIsLoading(true);
    try {
      const { user, token } = await authService.login({ email, password });
      setAuth(user, token);

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberMeEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberMeEmail');
      }

      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'student' ? '/dashboard' : '/admin');
    } catch (err: any) {
      const serverErrors: { field: string; message: string }[] = err.response?.data?.errors || [];
      if (serverErrors.length > 0) {
        const fieldMap: { email?: string; password?: string } = {};
        serverErrors.forEach(e => {
          if (e.field === 'email') fieldMap.email = e.message;
          if (e.field === 'password') fieldMap.password = e.message;
        });
        setErrors(prev => ({ ...prev, ...fieldMap }));
      } else {
        toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (field: 'email' | 'password') =>
    `input-field transition-all ${
      touched[field] && errors[field]
        ? 'border-red-500/60 bg-red-500/5 focus:border-red-400'
        : touched[field] && !errors[field]
        ? 'border-green-500/40 bg-green-500/5'
        : ''
    }`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }}
        />
        <div
          className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card w-full max-w-md p-8 relative z-10"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">EduMentor AI</h1>
          <p className="mt-1 text-sm text-white/40 font-mono">Your intelligent learning companion</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label htmlFor="login-email" className="mb-1.5 flex items-center justify-between text-xs font-medium text-white/60">
              <span>Email Address</span>
              {isVerifyingEmail ? (
                <span className="text-amber-400 flex items-center gap-1 text-[10px] animate-pulse">
                  <svg className="animate-spin h-3 w-3 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying Live Email...
                </span>
              ) : touched.email && !errors.email ? (
                <span className="text-green-400 flex items-center gap-1 text-[10px]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  Live Email Verified
                </span>
              ) : null}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              placeholder="your@university.edu"
              className={inputClass('email')}
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
            <FieldError message={errors.email} />
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-medium text-white/60">Password</label>
              <Link to="/forgot-password" className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors focus:outline-none">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                className={`${inputClass('password')} pr-10`}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.074-4.65 5.253-8 10.222-8 4.97 0 9.148 3.35 10.222 8-1.074 4.65-5.253 8-10.222 8-4.97 0-9.148-3.35-10.222-8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <FieldError message={errors.password} />
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-500 focus:ring-primary-500 focus:ring-offset-0 transition-colors"
              />
              <span className="text-xs text-white/60 group-hover:text-white/80 transition-colors">Remember me</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || isVerifyingEmail}
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-white/40">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Register here
          </Link>
        </div>
      </motion.div>
    </div>
  );
};
