import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/common/Logo';

const SITE_URL = 'https://edumentor-ai-argl.onrender.com';

const steps = [
  { num: '1', icon: '📷', title: 'Open Camera', desc: 'Open your phone camera app' },
  { num: '2', icon: '🔲', title: 'Scan QR Code', desc: 'Point it at the QR code above' },
  { num: '3', icon: '🌐', title: 'Tap the Link', desc: 'Tap the banner that appears' },
  { num: '4', icon: '📌', title: 'Add to Home', desc: 'Tap "Add to Home Screen" to install' },
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

  const handleCopy = () => {
    navigator.clipboard.writeText(SITE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-32 -top-32 h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #4f5dc8, transparent)' }}
        />
        <div
          className="absolute -right-32 bottom-0 h-72 w-72 sm:h-96 sm:w-96 rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, #7c6fc2, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── Nav ── */}
        <nav
          className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <Link to="/login" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-semibold text-white text-sm tracking-tight">EduMentor AI</span>
          </Link>
          <Link
            to="/login"
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            ← Login
          </Link>
        </nav>

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full max-w-sm sm:max-w-md flex flex-col items-center"
          >

            {/* Badge */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'linear-gradient(135deg, rgba(79,93,200,0.2), rgba(107,94,168,0.15))',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#a5b4fc',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Works on iOS &amp; Android · Free
            </motion.div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-2 tracking-tight leading-tight">
              Open on Your Phone
            </h1>
            <p
              className="text-sm text-center mb-8 leading-relaxed max-w-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Scan the QR code below with your phone camera — no app store needed.
            </p>

            {/* ── QR Hero Card (centered) ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.18, duration: 0.45 }}
              className="w-full rounded-3xl p-6 sm:p-8 flex flex-col items-center mb-6"
              style={{
                background: 'rgba(255,255,255,0.038)',
                border: '1px solid var(--border-medium)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              }}
            >
              {/* Camera hint */}
              <p className="text-xs font-semibold mb-5" style={{ color: 'var(--text-secondary)' }}>
                📷 &nbsp;Point your camera here
              </p>

              {/* QR code — white card, centered */}
              <div
                className="p-4 rounded-2xl mb-6"
                style={{
                  background: '#ffffff',
                  boxShadow: '0 4px 32px rgba(79,93,200,0.25)',
                }}
              >
                <QRCodeSVG
                  id="site-qr-code"
                  value={SITE_URL}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#0e0f14"
                  level="H"
                  imageSettings={{
                    src: '/favicon.svg',
                    height: 42,
                    width: 42,
                    excavate: true,
                  }}
                />
              </div>

              {/* URL pill + copy */}
              <div
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl mb-3"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                <span
                  className="flex-1 text-xs truncate font-mono"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {SITE_URL.replace('https://', '')}
                </span>
                <button
                  id="copy-site-url-btn"
                  onClick={handleCopy}
                  className="shrink-0 text-xs font-semibold px-3 py-1 rounded-lg transition-all"
                  style={{
                    background: copied ? 'rgba(52,168,122,0.18)' : 'rgba(99,102,241,0.15)',
                    color: copied ? '#34a87a' : '#a5b4fc',
                    border: `1px solid ${copied ? 'rgba(52,168,122,0.3)' : 'rgba(99,102,241,0.25)'}`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span key="done" initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }}>
                        ✓ Copied
                      </motion.span>
                    ) : (
                      <motion.span key="copy" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                        Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Or type the URL directly in your mobile browser
              </p>
            </motion.div>

            {/* ── How to install steps ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45 }}
              className="w-full rounded-2xl p-5 mb-5"
              style={{
                background: 'rgba(255,255,255,0.028)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p className="text-xs font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
                How to install
              </p>
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <motion.div
                    key={s.num}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, rgba(79,93,200,0.28), rgba(107,94,168,0.18))',
                        border: '1px solid rgba(99,102,241,0.28)',
                        color: '#a5b4fc',
                      }}
                    >
                      {s.num}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-white">{s.icon} {s.title}</span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>
                        — {s.desc}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* PWA tip */}
              <div
                className="mt-4 rounded-xl p-3.5 text-xs"
                style={{
                  background: 'rgba(79,93,200,0.09)',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                <p className="font-semibold mb-1" style={{ color: '#a5b4fc' }}>
                  💡 Pro tip
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  After opening, tap your browser's{' '}
                  <strong className="text-white/70">Share → Add to Home Screen</strong>{' '}
                  for a full app-like experience with your own icon.
                </p>
              </div>
            </motion.div>

            {/* ── Features strip ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.45 }}
              className="w-full rounded-2xl p-5 mb-8"
              style={{
                background: 'rgba(255,255,255,0.022)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p className="text-xs font-semibold text-center mb-4" style={{ color: 'var(--text-secondary)' }}>
                Everything included on mobile
              </p>
              <div className="grid grid-cols-3 gap-3">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className="text-xl">{f.icon}</span>
                    <span
                      className="text-xs text-center leading-tight px-1"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {f.label}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Footer */}
            <p className="text-xs text-center pb-8" style={{ color: 'var(--text-muted)' }}>
              No download required — runs in your mobile browser.
              <br />
              <Link
                to="/login"
                className="underline mt-1 inline-block transition-colors hover:text-white/50"
              >
                Back to web version →
              </Link>
            </p>

          </motion.div>
        </main>
      </div>
    </div>
  );
};
