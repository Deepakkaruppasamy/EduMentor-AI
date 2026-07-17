import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';

export const FirstLoginChangePage: React.FC = () => {
  const { user, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Enforce password strength: min 10 characters, uppercase, lowercase, number, special character
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Session expired. Please log in again.');
      logout();
      navigate('/login');
      return;
    }

    if (!isStrong) {
      toast.error('Password does not meet the safety requirements.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      // Call first-login-change endpoint
      await authService.changePasswordFirstTime(user.email, currentPassword, password);
      
      // Update local state: user is no longer first login
      updateUser({ isFirstLogin: false });
      toast.success('Password updated successfully! Welcome to your dashboard.');
      
      // Redirect to correct dashboard
      navigate(user.role === 'student' ? '/dashboard' : '/admin');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    logout();
    toast.success('Logged out.');
    navigate('/login');
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
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }} />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md p-8"
      >
        {/* Logo */}
        <div className="mb-6 text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-white">First Login Password Change</h1>
          <p className="mt-1 text-xs md:text-sm text-white/40 font-mono">For security, you must customize your password on your first login.</p>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Current Temporary Password</label>
            <input 
              type="password" 
              value={currentPassword} 
              onChange={e => setCurrentPassword(e.target.value)} 
              required
              placeholder="••••••••" 
              className="input-field" 
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required
                placeholder="••••••••" 
                className="input-field pr-10" 
              />
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
            
            {/* Password strength checklist */}
            <div className="mt-3 p-3 bg-white/5 rounded-xl space-y-1.5 border border-white/5 text-left">
              <p className="text-xs font-semibold text-white/70 mb-1">Password Strength Requirements:</p>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasMinLength ? 'text-emerald-400 font-bold' : 'text-white/30'}>
                  {hasMinLength ? '✓' : '○'} At least 10 characters
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasUppercase ? 'text-emerald-400 font-bold' : 'text-white/30'}>
                  {hasUppercase ? '✓' : '○'} One uppercase letter (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasLowercase ? 'text-emerald-400 font-bold' : 'text-white/30'}>
                  {hasLowercase ? '✓' : '○'} One lowercase letter (a-z)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasNumber ? 'text-emerald-400 font-bold' : 'text-white/30'}>
                  {hasNumber ? '✓' : '○'} One number (0-9)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={hasSpecialChar ? 'text-emerald-400 font-bold' : 'text-white/30'}>
                  {hasSpecialChar ? '✓' : '○'} One special character (!@#$ etc)
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required
              placeholder="••••••••" 
              className="input-field" 
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={handleCancel}
              className="btn-secondary w-1/3 text-xs"
            >
              Sign Out
            </button>
            <button 
              type="submit" 
              disabled={isLoading || !isStrong || password !== confirmPassword} 
              className="btn-primary w-2/3 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
