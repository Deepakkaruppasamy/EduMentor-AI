import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useAssistantStore } from '../../store/assistant.store';
import { assistantService } from '../../services/assistant.service';
import { getPageContext, getRandomTip } from './AssistantContext';
import { spring, fadeUpSmallVariants, listContainerVariants, listItemVariants } from '../../utils/motion';


/* ─────────────────────────────────────────────────────────────────────────────
   Markdown-lite renderer for AI responses
───────────────────────────────────────────────────────────────────────────── */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const boldReplaced = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Code inline
    const codeReplaced = boldReplaced.replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 4px;border-radius:4px;font-size:11px">$1</code>');
    // Bullet
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#7b87d4', flexShrink: 0, marginTop: 1 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: codeReplaced.replace(/^[-*]\s/, '') }} />
        </div>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      return (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: '#7b87d4', flexShrink: 0 }}>{line.match(/^\d+/)?.[0]}.</span>
          <span dangerouslySetInnerHTML={{ __html: codeReplaced.replace(/^\d+\.\s/, '') }} />
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} style={{ height: 6 }} />;
    return (
      <div key={i} style={{ marginBottom: 2 }}
        dangerouslySetInnerHTML={{ __html: codeReplaced }} />
    );
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Widget Component
───────────────────────────────────────────────────────────────────────────── */
export const AIAssistantWidget: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    isOpen, isMinimized, messages, hasUnread, isLoading,
    open, close, toggle, minimize, restore, addMessage, clearHistory, setLoading, markRead,
  } = useAssistantStore();

  const [input, setInput] = useState('');
  const [currentTip, setCurrentTip] = useState(() => getRandomTip());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const tipIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const pageCtx = getPageContext(location.pathname, user?.role || 'student');

  // Rotate tips
  useEffect(() => {
    tipIntervalRef.current = setInterval(() => {
      setCurrentTip(getRandomTip());
    }, 12000);
    return () => clearInterval(tipIntervalRef.current);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, isMinimized]);

  // Mark read when opening
  useEffect(() => {
    if (isOpen) markRead();
  }, [isOpen]);

  // Welcome message on first open if no history
  useEffect(() => {
    if (isOpen && messages.length === 0 && user) {
      addMessage({
        role: 'assistant',
        content: `${pageCtx.greeting}\n\n${pageCtx.description}\n\n**How can I help you today?**`,
      });
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    addMessage({ role: 'user', content: trimmed });
    setLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

    try {
      const { reply } = await assistantService.chat(trimmed, location.pathname, history);
      addMessage({ role: 'assistant', content: reply });
    } catch {
      addMessage({
        role: 'assistant',
        content: '⚠️ I encountered an error. Please check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [isLoading, messages, location.pathname, addMessage, setLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickAction = (action: { label: string; emoji: string; prompt?: string; href?: string }) => {
    if (action.href) {
      navigate(action.href);
      close();
    } else if (action.prompt) {
      setInput(action.prompt);
      inputRef.current?.focus();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* ── Floating Trigger Button ────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9998,
            }}
          >
            <motion.button
              id="ai-assistant-trigger"
              onClick={toggle}
              aria-label="Open AI Learning Assistant"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #2d9a8a 100%)',
                boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                animation: 'assistantPulse 2.5s ease-in-out infinite',
                position: 'relative',
              }}
            >
              🤖
              {/* Unread badge */}
              {hasUnread && (
                <span style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid #0a0b0f',
                  animation: 'assistantPulse 1s ease-in-out infinite',
                }} />
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded Widget Panel ──────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-assistant-panel"
            initial={{ opacity: 0, y: 60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 9999,
              width: 380,
              height: isMinimized ? 64 : 580,
              borderRadius: 20,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 16, 22, 0.97)',
              border: '1px solid rgba(99,102,241,0.3)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
              transition: 'height 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {/* ── Header ──────────────────────────────────────── */}
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.08) 100%)',
              borderBottom: isMinimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              cursor: isMinimized ? 'pointer' : 'default',
            }}
              onClick={isMinimized ? restore : undefined}
            >
              {/* Bot avatar */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              }}>🤖</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  EduMentor Assistant
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  Powered by Llama 3
                </div>
              </div>

              {/* Online dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                flexShrink: 0,
              }} />

              {/* Controls */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {/* Clear history */}
                {!isMinimized && (
                  <button
                    id="ai-assistant-clear"
                    onClick={() => setShowClearConfirm(true)}
                    title="Clear conversation"
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                  >🗑</button>
                )}
                {/* Minimize */}
                <button
                  id="ai-assistant-minimize"
                  onClick={() => isMinimized ? restore() : minimize()}
                  title={isMinimized ? 'Restore' : 'Minimize'}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >{isMinimized ? '▲' : '▼'}</button>
                {/* Close */}
                <button
                  id="ai-assistant-close"
                  onClick={close}
                  title="Close"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >✕</button>
              </div>
            </div>

            {/* ── Body (hidden when minimized) ─────────────────── */}
            {!isMinimized && (
              <>
                {/* Learning tip ticker */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTip}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      padding: '8px 14px',
                      background: 'rgba(99,102,241,0.08)',
                      borderBottom: '1px solid rgba(99,102,241,0.12)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 12, flexShrink: 0 }}>💡</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                      {currentTip}
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* Quick Actions */}
                <div style={{
                  padding: '10px 14px 6px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  flexShrink: 0,
                }}>
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    overflowX: 'auto',
                    paddingBottom: 4,
                    scrollbarWidth: 'none',
                  }}>
                    {pageCtx.quickActions.map((action, i) => (
                      <button
                        key={i}
                        id={`ai-quick-action-${i}`}
                        onClick={() => handleQuickAction(action)}
                        style={{
                          flexShrink: 0,
                          padding: '5px 10px',
                          borderRadius: 20,
                          border: '1px solid rgba(99,102,241,0.3)',
                          background: 'rgba(99,102,241,0.08)',
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                          fontWeight: 500,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(99,102,241,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                        }}
                      >
                        <span>{action.emoji}</span>
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <motion.div
                  id="ai-assistant-messages"
                  variants={listContainerVariants}
                  initial="hidden"
                  animate="visible"
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.08) transparent',
                  }}
                >
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        variants={fadeUpSmallVariants}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          gap: 3,
                        }}
                      >
                        <div style={{
                          maxWidth: '88%',
                          padding: '9px 12px',
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.role === 'user'
                            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                            : 'rgba(255,255,255,0.05)',
                          border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                          fontSize: 12.5,
                          lineHeight: 1.55,
                          color: '#f0f2f8',
                          wordBreak: 'break-word',
                          boxShadow: msg.role === 'user'
                            ? '0 4px 12px rgba(99,102,241,0.3)'
                            : '0 2px 8px rgba(0,0,0,0.2)',
                        }}>
                          {msg.role === 'assistant'
                            ? <div style={{ fontSize: 12.5, lineHeight: 1.55 }}>{renderMarkdown(msg.content)}</div>
                            : msg.content
                          }
                        </div>
                        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', paddingLeft: 4, paddingRight: 4 }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}
                      >
                        <div style={{
                          padding: '10px 14px',
                          borderRadius: '16px 16px 16px 4px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          display: 'flex',
                          gap: 5,
                          alignItems: 'center',
                        }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: '#7b87d4',
                              animation: `assistantDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </motion.div>

                {/* Input Area */}
                <div style={{
                  padding: '10px 14px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0,
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-end',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    padding: '8px 10px',
                    transition: 'border-color 0.15s',
                  }}
                    onFocus={() => { }}
                  >
                    <textarea
                      ref={inputRef}
                      id="ai-assistant-input"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask me anything..."
                      rows={1}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#f0f2f8',
                        fontSize: 13,
                        resize: 'none',
                        lineHeight: 1.5,
                        maxHeight: 80,
                        fontFamily: 'inherit',
                        scrollbarWidth: 'none',
                      }}
                    />
                    <button
                      id="ai-assistant-send"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || isLoading}
                      style={{
                        width: 32, height: 32,
                        borderRadius: 10,
                        border: 'none',
                        cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                        background: input.trim() && !isLoading
                          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                          : 'rgba(255,255,255,0.08)',
                        color: input.trim() && !isLoading ? '#fff' : 'rgba(255,255,255,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                        flexShrink: 0,
                        transition: 'all 0.15s',
                        boxShadow: input.trim() && !isLoading ? '0 4px 10px rgba(99,102,241,0.4)' : 'none',
                      }}
                    >➤</button>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    marginTop: 6,
                    fontSize: 9.5,
                    color: 'rgba(255,255,255,0.2)',
                    fontFamily: 'monospace',
                  }}>
                    Press Enter to send · Shift+Enter for new line
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clear History Confirm Modal ────────────────────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#151720',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '24px 28px',
                maxWidth: 320,
                width: '90%',
                boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                Clear Conversation?
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                This will permanently delete all messages in this conversation. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >Cancel</button>
                <button
                  id="ai-assistant-confirm-clear"
                  onClick={() => { clearHistory(); setShowClearConfirm(false); }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(239,68,68,0.3)',
                  }}
                >Clear History</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global Keyframe Styles ─────────────────────────────── */}
      <style>{`
        @keyframes assistantPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          50% { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
        }
        @keyframes assistantDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};
