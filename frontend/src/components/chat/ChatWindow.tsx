import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useChatStore } from '../../store/chat.store';
import { useAuthStore } from '../../store/auth.store';
import { chatService } from '../../services/chat.service';
import { MessageBubble } from './MessageBubble';
import { Course } from '../../types';
import { uuidv4 } from '../../utils/uuid';

interface ChatWindowProps {
  course: Course;
  onRefreshHistory?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ course, onRefreshHistory }) => {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, addMessage, updateMessage, currentChatId, setCurrentChatId, isLoading, setLoading } = useChatStore();

  // Voice Query Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech Voice Mode States
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const speakResponse = useCallback((text: string) => {
    if (!synthRef.current || !voiceMode) return;

    // stop any current speaking
    synthRef.current.cancel();

    // clean markdown, citations (e.g. [1], [Source 1], etc.)
    let cleanText = text
      .replace(/\[\d+\]/g, '') // remove citations like [1]
      .replace(/\*\*+/g, '')   // remove **
      .replace(/\*+/g, '')     // remove *
      .replace(/#+/g, '')      // remove headers
      .replace(/`+[^`]*`+/g, '') // remove code blocks/inline code
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      console.warn('TTS utterance error:', e);
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  }, [voiceMode]);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!voiceMode) {
      stopSpeaking();
    }
  }, [voiceMode, stopSpeaking]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        toast.success('Voice transcribed');
      };
      rec.onerror = (e: any) => {
        console.warn('Speech recognition error:', e.error);
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          toast.error('Voice input error: ' + e.error);
        }
        setIsListening(false);
      };
      recognitionRef.current = rec;
    }
  }, []);

  const toggleSpeech = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported in this browser. Please use Chrome/Edge.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleRename = async () => {
    if (!currentChatId) {
      toast.error('Start a chat before renaming');
      return;
    }
    const newTitle = prompt('Enter a new name for this session:', course.title);
    if (!newTitle || !newTitle.trim()) return;
    try {
      await chatService.rename(currentChatId, newTitle.trim());
      toast.success('Session renamed');
      if (onRefreshHistory) onRefreshHistory();
    } catch (err) {
      toast.error('Failed to rename session');
    }
  };

  const handleExport = () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    const formattedMarkdown = messages.map(m => {
      const role = m.role === 'user' ? '### Student' : '### EduMentor AI';
      const timestamp = m.timestamp.toLocaleString();
      let content = `**[${timestamp}]**\n\n${m.content}\n\n`;
      if (m.trustScore !== undefined) {
        content += `*Confidence Score: ${m.confidenceScore || 0}% | Hallucination Trust Score: ${m.trustScore}%*\n\n`;
      }
      return `${role}\n${content}---\n\n`;
    }).join('');

    const title = messages[0]?.content.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'Chat_Session';
    const blob = new Blob([formattedMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}_export.md`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Conversation exported to Markdown!');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    setInput('');

    // Add user message
    addMessage({ role: 'user', content: question, timestamp: new Date() });

    // Add loading assistant message
    const loadingId = addMessage({ role: 'assistant', content: '', timestamp: new Date(), isLoading: true });

    setLoading(true);
    setIsStreaming(true);

    try {
      const response = await chatService.query(question, course._id, currentChatId || undefined);

      if (!currentChatId) {
        setCurrentChatId(response.chatId);
      }

      updateMessage(loadingId, {
        content: response.answer,
        isLoading: false,
        trustScore: response.hallucination.trustScore,
        confidenceScore: response.explainability.overallConfidence,
        hallucination: response.hallucination as any,
        explainability: response.explainability as any,
      });

      if (voiceMode) {
        speakResponse(response.answer);
      }
    } catch (err: any) {
      updateMessage(loadingId, {
        content: '⚠️ Failed to get a response. Please check your connection and try again.',
        isLoading: false,
      });
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [input, isLoading, course._id, currentChatId, addMessage, updateMessage, setCurrentChatId, setLoading, voiceMode, speakResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QUICK_QUESTIONS = [
    'Explain the concept of normalization in databases',
    'What are the different process states in OS?',
    'How does TCP differ from UDP?',
    'Explain binary search trees',
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Course Header */}
      <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm"
          style={{ background: 'linear-gradient(135deg, rgba(79,99,255,0.2) 0%, rgba(159,122,234,0.2) 100%)', border: '1px solid rgba(79,99,255,0.3)' }}>
          📚
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{course.title}</div>
          <div className="text-[11px] text-white/40">{course.code} · Hybrid RAG + Llama 3</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {currentChatId && (
            <div className="flex items-center gap-1.5 mr-2">
              <button onClick={handleRename} className="btn-secondary py-1 px-2.5 text-[10px] rounded-lg hover:border-primary-500 transition-colors" title="Rename Session">
                ✏️ Rename
              </button>
              <button onClick={handleExport} className="btn-secondary py-1 px-2.5 text-[10px] rounded-lg hover:border-primary-500 transition-colors" title="Export to Markdown">
                📥 Export
              </button>
            </div>
          )}
          
          {/* TTS Voice Mode Toggle */}
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className="flex items-center gap-1.5 py-1 px-2.5 text-[10px] rounded-lg transition-all"
            style={{
              background: voiceMode
                ? 'linear-gradient(135deg, rgba(79,99,255,0.2) 0%, rgba(159,122,234,0.2) 100%)'
                : 'rgba(255,255,255,0.05)',
              border: voiceMode ? '1px solid rgba(79,99,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: voiceMode ? '#7c8fff' : 'rgba(255,255,255,0.6)',
            }}
          >
            {voiceMode ? '🔊 TTS Active' : '🔇 TTS Off'}
          </button>

          <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ background: 'rgba(72,187,120,0.1)', border: '1px solid rgba(72,187,120,0.2)', color: '#48bb78' }}>
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            AI Ready
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="mb-4 text-5xl">🎓</div>
            <h3 className="mb-2 text-lg font-semibold text-white">Ask Anything About {course.title}</h3>
            <p className="mb-8 text-sm text-white/40 max-w-sm">
              I'll retrieve answers from your course materials with source citations and trust scores.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-md sm:grid-cols-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => setInput(q)}
                  className="rounded-xl p-3 text-left text-xs transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(79,99,255,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,99,255,0.3)';
                    (e.currentTarget as HTMLElement).style.color = '#7c8fff';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-4">
        <div className="relative rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${course.title}...`}
            rows={1}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-5 py-4 pr-24 text-sm text-white outline-none placeholder-white/30 disabled:opacity-50"
            style={{ maxHeight: '120px', scrollbarWidth: 'none' }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={toggleSpeech}
            disabled={isLoading}
            className="absolute bottom-3 right-14 flex h-9 w-9 items-center justify-center rounded-xl transition-all text-white/60 hover:text-white"
            style={{ 
              background: isListening ? 'rgba(252,129,129,0.2)' : 'transparent',
              border: isListening ? '1px solid rgba(252,129,129,0.4)' : 'none',
              color: isListening ? '#fc8181' : 'rgba(255,255,255,0.6)'
            }}
            title="Voice input"
          >
            {isListening ? '🎙️' : '🎤'}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #4f63ff 0%, #7c3aed 100%)' }}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>

          {/* Animated Waveform Overlay when speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-between px-5 rounded-2xl backdrop-blur-md"
              style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(79,99,255,0.2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#7c8fff] animate-pulse flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Voice Tutor speaking...
                </span>
                
                {/* SVG Sound Waveform Indicator */}
                <div className="flex items-end gap-[3px] h-6">
                  {[0.6, 1.2, 0.8, 1.5, 0.5, 1.1, 0.7, 1.3, 0.4].map((delay, index) => (
                    <motion.div
                      key={index}
                      className="w-[3px] rounded-full"
                      style={{ background: 'linear-gradient(to top, #4f63ff, #9f7aea)' }}
                      animate={{
                        height: ['4px', '20px', '4px'],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: delay * 0.3,
                        ease: 'easeInOut',
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white transition-all hover:scale-105"
                style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)' }}
              >
                ⏹️ Stop Audio
              </button>
            </div>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-white/25">
          Press Enter to send · Shift+Enter for new line · Sources cited from course materials
        </p>
      </div>
    </div>
  );
};
