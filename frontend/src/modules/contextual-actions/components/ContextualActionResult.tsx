import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextualAction } from '../context/ContextualActionContext';
import { actionsService } from '../services/actions.service';
import { bookmarkService } from '../../../services/bookmark.service';
import { calendarService } from '../../../services/calendar.service';
import toast from 'react-hot-toast';

export const ContextualActionResult: React.FC = () => {
  const {
    selection,
    metadata,
    activeAction,
    isResultOpen,
    closeResult,
    isLoading,
    startLoading,
    stopLoading,
    resultData,
    setResultData,
    error,
    setError,
  } = useContextualAction();

  const navigate = useNavigate();


  // Mode state for AI Explain
  const [explainMode, setExplainMode] = useState<'simple' | 'detailed' | 'step-by-step' | 'example'>('simple');
  // Translation state
  const [targetLang, setTargetLang] = useState('Spanish');
  // Listen Aloud Speech state
  const [speechRate, setSpeechRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);


  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Study Planner task form
  const [studyTask, setStudyTask] = useState({
    topic: '',
    description: '',
    priority: 'Medium',
    duration: 60,
    targetDate: '',
  });

  // Citation style
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'IEEE'>('APA');

  // Trigger action processing when activeAction changes
  useEffect(() => {
    if (!isResultOpen || !activeAction || !selection) return;

    // Reset view states
    setQuizAnswers({});
    setQuizSubmitted(false);
    setCardIndex(0);
    setCardFlipped(false);
    cleanupSpeech();

    // Populate study task default fields
    setStudyTask({
      topic: selection.text.split(' ').slice(0, 5).join(' ') + '...',
      description: `Study notes regarding selection:\n"${selection.text}"`,
      priority: 'Medium',
      duration: 60,
      targetDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
    });

    handleActionExecution();
  }, [activeAction, explainMode, targetLang, citationStyle]);

  // Clean up speech synthesis on component unmount or navigation
  useEffect(() => {
    return () => {
      cleanupSpeech();
    };
  }, []);

  const cleanupSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleActionExecution = async () => {
    if (!selection) return;
    startLoading();
    try {
      let data: any = null;
      const payload = {
        selectedText: selection.text,
        metadata,
      };

      switch (activeAction) {
        case 'explain':
          data = await actionsService.explain({ ...payload, options: { mode: explainMode } });
          break;
        case 'generate-quiz':
          data = await actionsService.generateQuiz({ ...payload, options: { count: 3 } });
          break;
        case 'create-flashcards':
          data = await actionsService.generateFlashcards({ ...payload, options: { count: 5 } });
          break;
        case 'translate':
          data = await actionsService.translate({ ...payload, options: { targetLanguage: targetLang } });
          break;
        case 'cite-source':
          data = await actionsService.citation({ ...payload, options: { style: citationStyle } });
          break;
        case 'assignment-feedback':
          data = await actionsService.assignmentFeedback(payload);
          break;
        case 'explain-mistakes':
          data = await actionsService.explainMistakes(payload);
          break;
        case 'copy':
          await navigator.clipboard.writeText(selection.text);
          toast.success('Text copied to clipboard!');
          closeResult();
          return;
        case 'share':
          const shareText = `"${selection.text}"\n\nShared from EduMentor AI: ${window.location.href}`;
          await navigator.clipboard.writeText(shareText);
          toast.success('Share description copied to clipboard!');
          closeResult();
          return;
        case 'ask-ai':
          closeResult();
          navigate(`/chat?q=${encodeURIComponent(`Regarding this context: "${selection.text}"\n\nExplain this concept:`)}`);
          return;
        case 'bookmark':
          // Reuses standard bookmarks service
          await bookmarkService.create({
            itemType: metadata?.module || 'general',
            itemId: metadata?.contentId || 'contextual',
            title: `Clip: ${selection.text.slice(0, 30)}...`,
            category: 'Context Clips',
            metadata: { text: selection.text, url: window.location.href },
          });
          toast.success('Saved to bookmarks!');
          closeResult();
          return;
        case 'listen-aloud':
          // Handled locally
          stopLoading();
          handleSpeak();
          return;
        default:
          break;
      }

      setResultData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'AI action execution failed. Please retry.');
    } finally {
      stopLoading();
    }
  };

  // ── Speech Synthesis handlers ──────────────────────────────────────────────
  const handleSpeak = () => {
    if (!window.speechSynthesis || !selection) {
      toast.error('Speech synthesis not supported in this browser.');
      return;
    }

    cleanupSpeech();

    const utterance = new SpeechSynthesisUtterance(selection.text);
    utterance.rate = speechRate;
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePauseResume = () => {
    if (!window.speechSynthesis) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  // ── Save Study Task handler ─────────────────────────────────────────────────
  const handleSaveStudyTask = async () => {
    if (!studyTask.topic.trim()) {
      toast.error('Please specify task topic.');
      return;
    }

    try {
      startLoading();
      // Add standard calendar study event
      await calendarService.createEvent({
        title: `Study: ${studyTask.topic}`,
        description: `${studyTask.description}\n\nEstimated duration: ${studyTask.duration} minutes\nPriority: ${studyTask.priority}`,
        type: 'Lecture',
        startDate: new Date(studyTask.targetDate),
        endDate: new Date(new Date(studyTask.targetDate).getTime() + 3600000), // 1 hour duration
        targetRoles: ['student'],
      });
      toast.success('Study task scheduled in calendar!');
      closeResult();
    } catch {
      toast.error('Failed to schedule study task.');
    } finally {
      stopLoading();
    }
  };

  if (!isResultOpen || !activeAction) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9990] bg-black/60 backdrop-blur-sm"
        onClick={closeResult}
      />

      {/* Drawer Panel Container */}
      <div
        id="contextual-action-result"
        className="fixed z-[9991] flex flex-col shadow-2xl transition-all duration-300
          right-0 top-0 h-full w-[420px] max-w-[95vw] border-l"
        style={{
          background: 'linear-gradient(180deg, #13151e 0%, #0f1119 100%)',
          borderColor: 'rgba(255,255,255,0.08)',
          animation: 'resultIn 0.3s cubic-bezier(0.34,1.1,0.64,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎯</span>
            <div>
              <h3 className="text-sm font-black text-white capitalize">{activeAction.replace('-', ' ')}</h3>
              <p className="text-[10px] text-white/30 truncate max-w-[240px]">Source context: {metadata?.title || 'page'}</p>
            </div>
          </div>
          <button
            onClick={closeResult}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selected Text Preview banner */}
        {selection && (
          <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/5 flex-shrink-0">
            <p className="text-[9px] uppercase font-black text-white/30 tracking-wider">Your Selection</p>
            <p className="text-[10.5px] italic text-white/60 line-clamp-2 mt-0.5">"{selection.text}"</p>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-5/6 animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
              <div className="h-3 bg-white/5 rounded w-4/5 animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-red-500/15 bg-red-500/5 text-center space-y-3">
              <p className="text-xs text-red-400 font-semibold">{error}</p>
              <button
                onClick={handleActionExecution}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                ↺ Retry Action
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-white/80 leading-relaxed">
              {/* ── Action Explains ───────────────────────────────────────── */}
              {activeAction === 'explain' && resultData && (
                <div className="space-y-4">
                  {/* Explanation Modes tabs */}
                  <div className="flex gap-1 border-b border-white/5 pb-2 overflow-x-auto">
                    {(['simple', 'detailed', 'step-by-step', 'example'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setExplainMode(mode)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wide border transition-all ${
                          explainMode === mode
                            ? 'bg-indigo-500/25 border-indigo-500/40 text-indigo-400'
                            : 'bg-white/5 border-white/5 text-white/40'
                        }`}
                      >
                        {mode.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                  <div className="prose prose-invert max-w-none text-[11.5px] leading-relaxed whitespace-pre-wrap">
                    {resultData.explanation}
                  </div>
                </div>
              )}

              {/* ── Translation Action ───────────────────────────────────── */}
              {activeAction === 'translate' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 font-bold uppercase">To Language:</span>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="bg-[#151722] border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                    >
                      {[
                        // Indian Languages (22 Scheduled Languages)
                        'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil',
                        'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Odia',
                        'Punjabi', 'Assamese', 'Maithili', 'Sanskrit', 'Santali',
                        'Kashmiri', 'Nepali', 'Sindhi', 'Konkani', 'Manipuri',
                        'Bodo', 'Dogri',
                        // Other Popular Languages
                        'English', 'Spanish', 'French', 'German', 'Chinese',
                        'Arabic', 'Portuguese', 'Japanese', 'Korean', 'Russian',
                      ].map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                  {resultData?.translation && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 whitespace-pre-wrap text-[11.5px]">
                      {resultData.translation}
                    </div>
                  )}
                </div>
              )}

              {/* ── Audio Speech ─────────────────────────────────────────── */}
              {activeAction === 'listen-aloud' && (
                <div className="flex flex-col items-center justify-center py-12 gap-5 text-center">
                  <div className="text-4xl">🔊</div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSpeak}
                      className="btn-primary py-2 px-6 font-bold text-xs"
                    >
                      ↺ Restart
                    </button>
                    <button
                      onClick={handlePauseResume}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all"
                    >
                      {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>
                    <button
                      onClick={cleanupSpeech}
                      className="text-red-400 hover:text-red-300 font-bold text-xs px-3 py-1"
                    >
                      Stop
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-white/35 font-bold uppercase">Speed:</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setSpeechRate(val);
                      }}
                      className="w-24"
                    />
                    <span className="text-[10px] font-mono font-bold text-white/50">{speechRate}x</span>
                  </div>
                </div>
              )}

              {/* ── Citations ────────────────────────────────────────────── */}
              {activeAction === 'cite-source' && resultData && (
                <div className="space-y-4">
                  <div className="flex gap-1 border-b border-white/5 pb-2">
                    {(['APA', 'MLA', 'IEEE'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setCitationStyle(style)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase border transition-all ${
                          citationStyle === style
                            ? 'bg-indigo-500/25 border-indigo-500/40 text-indigo-400'
                            : 'bg-white/5 border-white/5 text-white/40'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-[10px] select-all">
                    {resultData.citation}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resultData.citation);
                      toast.success('Citation copied to clipboard!');
                    }}
                    className="btn-primary py-2 px-4 text-xs font-bold w-full"
                  >
                    📋 Copy Citation style
                  </button>
                </div>
              )}

              {/* ── Quiz Questions ───────────────────────────────────────── */}
              {activeAction === 'generate-quiz' && resultData?.questions && (
                <div className="space-y-6">
                  {resultData.questions.map((q: any, qIdx: number) => (
                    <div key={qIdx} className="space-y-2 p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                      <p className="font-bold text-white text-[11.5px]">{qIdx + 1}. {q.question}</p>
                      {q.options ? (
                        <div className="grid gap-2 mt-2">
                          {q.options.map((opt: any, optIdx: number) => {
                            const isSelected = quizAnswers[qIdx] === optIdx;
                            return (
                              <button
                                key={optIdx}
                                disabled={quizSubmitted}
                                onClick={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                className={`text-left px-3.5 py-2.5 rounded-lg border text-[11px] transition-all ${
                                  isSelected
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                                    : 'bg-[#151722] border-white/5 hover:bg-[#1a1d2c] text-white/70'
                                }`}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <input
                          type="text"
                          disabled={quizSubmitted}
                          placeholder="Your answer here..."
                          className="input-field mt-2 text-xs py-2"
                        />
                      )}
                      {quizSubmitted && q.explanation && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] text-white/50 whitespace-pre-wrap">
                          💡 <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  ))}

                  {!quizSubmitted ? (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      className="btn-primary py-2 px-4 text-xs font-bold w-full"
                    >
                      Submit Quiz answers
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                        handleActionExecution();
                      }}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-4 text-xs font-bold text-white w-full transition-all"
                    >
                      ↺ Generate New Quiz
                    </button>
                  )}
                </div>
              )}

              {/* ── Flashcard Cards ──────────────────────────────────────── */}
              {activeAction === 'create-flashcards' && resultData?.cards && (
                <div className="space-y-5">
                  {resultData.cards.length === 0 ? (
                    <p className="text-center text-white/30 py-8">No flashcards generated.</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Active Flashcard container */}
                      <div
                        onClick={() => setCardFlipped(prev => !prev)}
                        className="h-[200px] w-full rounded-2xl border cursor-pointer select-none flex items-center justify-center p-6 text-center shadow-xl transition-all"
                        style={{
                          background: cardFlipped ? 'rgba(79,99,255,0.05)' : 'rgba(255,255,255,0.01)',
                          borderColor: cardFlipped ? 'rgba(79,99,255,0.2)' : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        <p className="text-white text-xs leading-relaxed">
                          {cardFlipped ? resultData.cards[cardIndex].back : resultData.cards[cardIndex].front}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <button
                          disabled={cardIndex === 0}
                          onClick={() => {
                            setCardIndex(prev => prev - 1);
                            setCardFlipped(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 text-[11px] font-bold text-white transition-all"
                        >
                          ◀ Prev
                        </button>
                        <span className="text-[10px] text-white/40 font-bold">
                          {cardIndex + 1} of {resultData.cards.length}
                        </span>
                        <button
                          disabled={cardIndex === resultData.cards.length - 1}
                          onClick={() => {
                            setCardIndex(prev => prev + 1);
                            setCardFlipped(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 text-[11px] font-bold text-white transition-all"
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Add to Study Plan ────────────────────────────────────── */}
              {activeAction === 'add-study-plan' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase">Topic Title</span>
                    <input
                      type="text"
                      value={studyTask.topic}
                      onChange={(e) => setStudyTask(prev => ({ ...prev, topic: e.target.value }))}
                      className="input-field text-xs py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase">Notes/Description</span>
                    <textarea
                      value={studyTask.description}
                      onChange={(e) => setStudyTask(prev => ({ ...prev, description: e.target.value }))}
                      className="input-field text-xs py-2 min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase">Estimated Mins</span>
                      <input
                        type="number"
                        value={studyTask.duration}
                        onChange={(e) => setStudyTask(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                        className="input-field text-xs py-2"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-white/40 font-bold uppercase">Target Date</span>
                      <input
                        type="date"
                        value={studyTask.targetDate}
                        onChange={(e) => setStudyTask(prev => ({ ...prev, targetDate: e.target.value }))}
                        className="input-field text-xs py-2"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSaveStudyTask}
                    className="btn-primary py-2 px-4 text-xs font-bold w-full"
                  >
                    🗓️ Add Study Event
                  </button>
                </div>
              )}

              {/* ── Assignment-specific critiques ───────────────────────── */}
              {['assignment-feedback', 'explain-mistakes'].includes(activeAction) && resultData && (
                <div className="prose prose-invert max-w-none text-[11.5px] leading-relaxed whitespace-pre-wrap">
                  {resultData.feedback || resultData.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes resultIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

