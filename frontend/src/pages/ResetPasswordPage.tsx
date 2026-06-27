import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { Logo } from '../components/common/Logo';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';

  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Resend Timer States (60 seconds)
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email) {
      toast.error('Email parameter missing. Please request a new OTP.');
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Enforce password strength: min 10 characters, uppercase, lowercase, number, special character
  const hasMinLength = newPassword.length >= 10;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isStrong) {
      toast.error('Password does not meet the safety requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.resetPassword({
        email,
        otpCode,
        newPassword,
        confirmPassword
      });
      toast.success(response.message || 'Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Password reset failed. Check OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      const response = await authService.resendOtp(email);
      toast.success(response.message || 'Verification code resent!');
      setResendCooldown(60); // set 60s cooldown
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background Gradients */}
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

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="glass-card w-full max-w-md p-8"
      >
        <div className="mb-6 text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-white">Reset Account Password</h1>
          <p className="mt-1 text-xs md:text-sm text-white/40 font-medium">Verify code and set your permanent password</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] uppercase font-bold text-white/40 tracking-wider">Registered Email</label>
            <input 
              type="text" 
              value={email} 
              readOnly 
              className="input-field bg-white/5 border-white/5 opacity-65 cursor-not-allowed select-none" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-white/60">6-Digit Verification Code *</label>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-[10px] font-bold text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
            <input 
              type="text" 
              maxLength={6}
              value={otpCode} 
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="e.g. 123456" 
              className="input-field text-center tracking-widest font-bold text-base" 
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">New Password *</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)} 
                required
                placeholder="••••••••" 
                className="input-field pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors focus:outline-none"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Password constraints checklist */}
            <div className="mt-3 p-3 bg-white/5 rounded-xl space-y-1.5 border border-white/5 text-left">
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-wide">Strength Requirements:</p>
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
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Confirm New Password *</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              required
              placeholder="••••••••" 
              className="input-field" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !isStrong || newPassword !== confirmPassword || otpCode.length !== 6} 
            className="btn-primary w-full text-sm py-2.5 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-primary-400 hover:text-primary-300 font-bold transition-colors">
              Cancel & Sign In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
