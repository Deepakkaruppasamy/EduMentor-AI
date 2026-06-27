import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Load Remember Me email
  useEffect(() => {
    const savedRemember = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRemember);
    if (savedRemember) {
      const savedEmail = localStorage.getItem('rememberMeEmail');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { user, token } = await authService.login({ email, password });
      setAuth(user, token);
      
      // Save Remember Me details
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
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', 
            backgroundSize: '24px 24px' 
          }} 
        />
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4f63ff, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #9f7aea, transparent)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-sm p-8">

        {/* Logo */}
        <div className="mb-8 text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">EduMentor AI</h1>
          <p className="mt-1 text-sm text-white/40 font-mono">Your intelligent learning companion</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Email</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="your@university.edu" className="input-field" autoComplete="email" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium text-white/60">Password</label>
              <Link 
                to="/forgot-password"
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors focus:outline-none"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••" className="input-field pr-10" autoComplete="current-password" />
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

          <div className="flex items-center">
            <input 
              id="remember-me" 
              type="checkbox" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-white/10 bg-white/5 text-primary-600 focus:ring-primary-500 focus:ring-offset-0" 
            />
            <label htmlFor="remember-me" className="ml-2 block text-xs font-medium text-white/60 select-none cursor-pointer">
              Remember Me
            </label>
          </div>

          <button id="login-submit" type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40 font-medium">
          Access is restricted to pre-approved university accounts. Please contact the system administrator to request access.
        </p>
      </motion.div>
    </div>
  );
};
