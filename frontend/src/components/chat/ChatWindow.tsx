import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useChatStore } from '../../store/chat.store';
import { useAuthStore } from '../../store/auth.store';
import { chatService } from '../../services/chat.service';
import { MessageBubble } from './MessageBubble';
import { Course } from '../../types';
import { uuidv4 } from '../../utils/uuid';
import { AIBuddyAvatar } from './AIBuddyAvatar';

interface ChatWindowProps {
  course: Course;
  onRefreshHistory?: () => void;
  onToggleLeftPanel?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ course, onRefreshHistory, onToggleLeftPanel }) => {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { messages, addMessage, updateMessage, currentChatId, setCurrentChatId, isLoading, setLoading } = useChatStore();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Voice Query Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-to-Speech Voice Mode States
  const [voiceMode, setVoiceMode] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [avatarMood, setAvatarMood] = useState<'idle' | 'happy' | 'encouraging'>('idle');

  const getAvatarState = useCallback((): 'idle' | 'thinking' | 'speaking' | 'happy' | 'encouraging' => {
    if (isSpeaking || isStreaming) return 'speaking';
    if (isLoading) return 'thinking';
    return avatarMood;
  }, [isSpeaking, isStreaming, isLoading, avatarMood]);
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
        if (e.error === 'not-allowed') {
          toast.error('Microphone access denied. Please enable microphone permission in your browser settings.');
        } else if (e.error === 'no-speech') {
          toast.error('No speech detected. Please try speaking again.');
        } else if (e.error !== 'aborted') {
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
    try {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        recognitionRef.current.start();
      }
    } catch (err: any) {
      console.error('Speech recognition start error:', err);
      toast.error('Failed to start speech recognition: ' + err.message);
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

    // Unlock speech synthesis context if voice mode is on
    if (voiceMode && synthRef.current) {
      try {
        const unlockUtterance = new SpeechSynthesisUtterance(' ');
        unlockUtterance.volume = 0;
        synthRef.current.speak(unlockUtterance);
      } catch (e) {
        console.warn('Failed to pre-unlock TTS:', e);
      }
    }

    // Add user message
    addMessage({ role: 'user', content: question, timestamp: new Date() });
 
    // Add loading assistant message
    const loadingId = addMessage({ role: 'assistant', content: '', timestamp: new Date(), isLoading: true });
 
    setLoading(true);
    setIsStreaming(true);
 
    let accumulatedContent = '';
 
    const onToken = (token: string) => {
      accumulatedContent += token;
      updateMessage(loadingId, {
        content: accumulatedContent,
        isLoading: true,
      });
    };
 
    const onDone = (doneData: any) => {
      if (!currentChatId && doneData.chatId) {
        setCurrentChatId(doneData.chatId);
      }
 
      updateMessage(loadingId, {
        content: accumulatedContent,
        isLoading: false,
        trustScore: doneData.hallucination.trustScore,
        confidenceScore: doneData.explainability.overallConfidence,
        hallucination: doneData.hallucination,
        explainability: doneData.explainability,
      });
 
      if (voiceMode) {
        speakResponse(accumulatedContent);
      }
      
      // Trigger avatar mood based on answer trust score
      const trust = doneData.hallucination?.trustScore ?? 100;
      if (trust >= 75) {
        setAvatarMood('happy');
        setTimeout(() => setAvatarMood('idle'), 4000);
      } else if (trust >= 45) {
        setAvatarMood('encouraging');
        setTimeout(() => setAvatarMood('idle'), 4000);
      }

      setLoading(false);
      setIsStreaming(false);
    };
 
    const onError = (err: any) => {
      updateMessage(loadingId, {
        content: accumulatedContent || '⚠️ Failed to get a response. Please check your connection and try again.',
        isLoading: false,
      });
      toast.error(err.message || 'Failed to send message');
      setLoading(false);
      setIsStreaming(false);
    };
 
    await chatService.queryStream(
      question,
      course._id,
      onToken,
      onDone,
      onError,
      currentChatId || undefined
    );
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
      <div className="flex items-center gap-2 px-3 py-3 md:gap-3 md:px-6 md:py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,11,15,0.4)', backdropFilter: 'blur(10px)' }}>
        {onToggleLeftPanel && (
          <button
            onClick={onToggleLeftPanel}
            className="lg:hidden p-1.5 rounded-xl text-white/60 hover:bg-white/5 hover:text-white transition-all mr-0.5"
            title="Chat History"
          >
            💬
          </button>
        )}
        <AIBuddyAvatar state={getAvatarState()} size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-xs md:text-sm font-semibold text-white truncate max-w-[120px] xs:max-w-[180px] sm:max-w-[300px] md:max-w-none">{course.title}</div>
          <div className="text-[10px] md:text-[11px] text-white/40 truncate">{course.code} · AI Tutor</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {currentChatId && (
            <div className="flex items-center gap-1 mr-1">
              <button onClick={handleRename} className="btn-secondary py-1 px-2 text-[10px] rounded-lg hover:border-primary-500 transition-colors" title="Rename Session">
                <span className="hidden sm:inline">✏️ Rename</span>
                <span className="sm:hidden">✏️</span>
              </button>
              <button onClick={handleExport} className="btn-secondary py-1 px-2 text-[10px] rounded-lg hover:border-primary-500 transition-colors" title="Export to Markdown">
                <span className="hidden sm:inline">📥 Export</span>
                <span className="sm:hidden">📥</span>
              </button>
            </div>
          )}
          
          {/* TTS Voice Mode Toggle */}
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className="flex items-center gap-1 py-1 px-2 text-[10px] rounded-lg transition-all"
            style={{
              background: voiceMode
                ? 'linear-gradient(135deg, rgba(79,99,255,0.2) 0%, rgba(159,122,234,0.2) 100%)'
                : 'rgba(255,255,255,0.05)',
              border: voiceMode ? '1px solid rgba(79,99,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
              color: voiceMode ? '#7c8fff' : 'rgba(255,255,255,0.6)',
            }}
          >
            <span>{voiceMode ? '🔊' : '🔇'}</span>
            <span className="hidden sm:inline"> {voiceMode ? 'TTS Active' : 'TTS Off'}</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
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
            <div className="mb-6">
              <AIBuddyAvatar state={getAvatarState()} size={100} />
            </div>
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
            placeholder={isOnline ? `Ask about ${course.title}...` : 'You are currently offline. Live query is disabled.'}
            rows={1}
            disabled={isLoading || !isOnline}
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
            disabled={isLoading || !isOnline}
            className="absolute bottom-3 right-14 flex h-9 w-9 items-center justify-center rounded-xl transition-all text-white/60 hover:text-white disabled:opacity-30"
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
            disabled={!input.trim() || isLoading || !isOnline}
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
