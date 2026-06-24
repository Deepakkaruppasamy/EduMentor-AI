import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { Logo } from '../components/common/Logo';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      const { user, token } = await authService.register({ name, email, password, role });
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
    <div className="flex min-h-screen items-center justify-center p-4">
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
        className="glass-card w-full max-w-sm p-8">

        <div className="mb-8 text-center">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="mt-1 text-sm text-white/40 font-mono">Join EduMentor AI today</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Password</label>
            <input id="register-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="Min. 6 characters" className="input-field" />
          </div>

          {/* Role Selector */}
          <div>
            <label className="mb-2 block text-xs font-medium text-white/60">I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {(['student', 'faculty'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="rounded-xl py-2.5 text-sm font-medium transition-all capitalize"
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
