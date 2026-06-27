import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { Logo } from '../components/common/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email);
      toast.success(response.message || 'Verification code sent!');
      navigate(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-xl md:text-2xl font-bold text-white">Forgot Password?</h1>
          <p className="mt-1 text-xs md:text-sm text-white/40 font-medium">Verify your email to request a reset verification code</p>
        </div>

        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">Registered Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              placeholder="e.g. name@university.edu" 
              className="input-field" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !email.trim()} 
            className="btn-primary w-full text-sm py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </button>

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-primary-400 hover:text-primary-300 font-bold transition-colors">
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
