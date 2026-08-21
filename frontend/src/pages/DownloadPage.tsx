import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';

// Always point to the live deployed site so the QR works from any device/environment
const SITE_URL = 'https://edumentor-ai-argl.onrender.com';

const steps = [
  { icon: '📷', title: 'Open Camera', desc: 'Open your Android or iPhone camera app' },
  { icon: '🔲', title: 'Scan QR Code', desc: 'Point the camera at the QR code on screen' },
  { icon: '🌐', title: 'Open Link', desc: 'Tap the notification to open EduMentor AI' },
  { icon: '📌', title: 'Add to Home', desc: 'Tap "Add to Home Screen" to install as an app' },
];

const features = [
  { icon: '🤖', label: 'AI Chat Tutor' },
  { icon: '📝', label: 'Smart Quizzes' },
  { icon: '🃏', label: 'Flashcards' },
  { icon: '📅', label: 'Study Planner' },
  { icon: '📊', label: 'Analytics' },
  { icon: '🔍', label: 'Plagiarism Check' },
];

export const DownloadPage: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(220);

  useEffect(() => {
    const update = () => setQrSize(window.innerWidth < 640 ? 170 : 220);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }} />
        <div className="absolute -right-48 -bottom-24 h-[500px] w-[500px] rounded-full blur-3xl opacity-[0.14]"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Link to="/login" className="flex items-center gap-2.5">
            <Logo size="sm" />
            <span className="font-semibold text-white text-sm tracking-tight">EduMentor AI</span>
          </Link>
          <Link
            to="/login"
            className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            ← Back to Login
          </Link>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-4xl"
          >

            {/* Header */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: 'linear-gradient(135deg, rgba(79,93,200,0.2), rgba(107,94,168,0.15))',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#a5b4fc',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Works on iOS &amp; Android
              </motion.div>

              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight leading-tight">
                Use EduMentor AI
                <span className="block" style={{
                  background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  on Your Phone
                </span>
              </h1>
              <p className="text-sm sm:text-base max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Scan the QR code with your phone camera to instantly open EduMentor AI in your mobile browser — no app store needed.
              </p>
            </div>

            {/* Main layout: QR card + Info card */}
            <div className="grid md:grid-cols-2 gap-6 mb-10">

              {/* QR Code Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="rounded-2xl p-8 flex flex-col items-center text-center"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                {/* Label */}
                <p className="text-xs font-semibold mb-5" style={{ color: 'var(--text-secondary)' }}>
                  📷 Point your camera here
                </p>

                {/* QR code on white background */}
                <div className="p-4 rounded-2xl mb-5 shadow-2xl" style={{ background: '#ffffff' }}>
                  <QRCodeSVG
                    id="site-qr-code"
                    value={SITE_URL}
                    size={qrSize}
                    bgColor="#ffffff"
                    fgColor="#1a1c25"
                    level="H"
                    imageSettings={{
                      src: '/favicon.svg',
                      height: 38,
                      width: 38,
                      excavate: true,
                    }}
                  />
                </div>

                {/* URL chip */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg w-full mb-4"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)' }}
                >
                  <span className="flex-1 text-xs text-left truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                    {SITE_URL}
                  </span>
                  <button
                    id="copy-site-url-btn"
                    onClick={handleCopy}
                    className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-md transition-all"
                    style={{
                      background: copied ? 'rgba(52,168,122,0.15)' : 'rgba(255,255,255,0.07)',
                      color: copied ? '#34a87a' : 'var(--text-secondary)',
                      border: `1px solid ${copied ? 'rgba(52,168,122,0.3)' : 'var(--border-subtle)'}`,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Copied</motion.span>
                      ) : (
                        <motion.span key="copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Copy</motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </div>

                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Or type this URL directly in your mobile browser
                </p>
              </motion.div>

              {/* Right: Info + Steps */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="rounded-2xl p-8 flex flex-col justify-between"
                style={{
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(14px)',
                }}
              >
                {/* App icon + name */}
                <div>
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                      style={{ background: 'linear-gradient(135deg, #4f5dc8, #7c6fc2)' }}>
                      🎓
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">EduMentor AI</h2>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Mobile Web App · No install required</p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3 mb-7">
                    {steps.map((s, i) => (
                      <motion.div
                        key={s.title}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.07 }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{
                            background: 'linear-gradient(135deg, rgba(79,93,200,0.25), rgba(107,94,168,0.15))',
                            border: '1px solid rgba(99,102,241,0.25)',
                            color: '#a5b4fc',
                          }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{s.icon} {s.title}</p>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* PWA tip */}
                  <div
                    className="rounded-xl p-4 text-xs"
                    style={{ background: 'rgba(79,93,200,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <p className="font-semibold mb-1" style={{ color: '#a5b4fc' }}>💡 Pro tip — Add to Home Screen</p>
                    <p style={{ color: 'var(--text-muted)' }}>
                      After opening, tap the browser menu and select <strong className="text-white/70">"Add to Home Screen"</strong> to get a full app-like experience with an icon on your phone.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Features strip */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="rounded-2xl p-6"
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="text-xs font-semibold text-center mb-5" style={{ color: 'var(--text-secondary)' }}>
                Everything available on mobile
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 + i * 0.06 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span className="text-xs text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Footer */}
            <p className="text-center text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
              No download required. EduMentor AI runs entirely in your mobile browser.
              <br />
              <Link to="/login" className="underline mt-1 inline-block hover:text-white/60 transition-colors">
                Back to web version →
              </Link>
            </p>

          </motion.div>
        </main>
      </div>
    </div>
  );
};
