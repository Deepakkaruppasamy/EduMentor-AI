import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../store/auth.store';
import { Course } from '../../types';
import { getGradeColor } from '../../utils/uuid';
import toast from 'react-hot-toast';

interface LiveParticipant {
  studentId: string;
  name: string;
  score: number;
  streak: number;
  lastCorrect?: boolean;
}

interface LiveQuestion {
  question: string;
  options: { label: string; text: string }[];
  topic?: string;
}

interface LiveBattleScreenProps {
  courses: Course[];
  onClose: () => void;
}

export const LiveBattleScreen: React.FC<LiveBattleScreenProps> = ({ courses, onClose }) => {
  const { user } = useAuthStore();
  const isFaculty = user?.role === 'faculty' || user?.role === 'admin';

  // Lobby Configuration States
  const [selectedCourse, setSelectedCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(5);

  // Engine States
  const [session, setSession] = useState<any | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [gameState, setGameState] = useState<'config' | 'lobby' | 'question' | 'leaderboard' | 'finished'>('config');
  const [currentQuestion, setCurrentQuestion] = useState<LiveQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(20);
  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitProgress, setSubmitProgress] = useState({ totalSubmitted: 0, totalParticipants: 0 });
  
  // Results details for current question
  const [questionResults, setQuestionResults] = useState<{
    correctAnswerLabel: string;
    correctAnswerText: string;
    explanation?: string;
    leaderboard: LiveParticipant[];
  } | null>(null);

  const [podium, setPodium] = useState<any[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    // Initialize WebSockets Connection
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      query: { userId: user?.id },
      withCredentials: true,
    });
    socketRef.current = socket;

    // Listeners
    socket.on('quiz:lobby_created', (data: any) => {
      setSession(data);
      setParticipants(data.participants || []);
      setTotalQuestions(data.questions.length);
      setGameState('lobby');
      toast.success('Live Quiz Lobby created! Waiting for students...');
    });

    socket.on('quiz:lobby_update', (data: LiveParticipant[]) => {
      setParticipants(data);
    });

    socket.on('quiz:question_active', (data: { question: LiveQuestion; index: number; total: number; timerSeconds: number }) => {
      setCurrentQuestion(data.question);
      setQuestionIndex(data.index);
      setTotalQuestions(data.total);
      setTimerSeconds(data.timerSeconds);
      setTimeLeft(data.timerSeconds);
      setSelectedAnswer(null);
      setIsSubmitted(false);
      setQuestionResults(null);
      setSubmitProgress({ totalSubmitted: 0, totalParticipants: participants.length });
      setGameState('question');

      startTimeRef.current = Date.now();

      // Start Countdown Timer locally
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            // If faculty, tell server to show results when time is up
            if (isFaculty) {
              socket.emit('quiz:show_results', { sessionId: session?._id || data.question });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    });

    socket.on('quiz:submitted', (data: { studentId: string; name: string; totalSubmitted: number; totalParticipants: number }) => {
      setSubmitProgress({ totalSubmitted: data.totalSubmitted, totalParticipants: data.totalParticipants });
    });

    socket.on('quiz:leaderboard_active', (data: any) => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setQuestionResults(data);
      setParticipants(data.leaderboard);
      setGameState('leaderboard');
    });

    socket.on('quiz:game_over', (data: { podium: any[]; allScores: any[] }) => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setPodium(data.podium);
      setGameState('finished');
    });

    socket.on('quiz:error', (msg: string) => {
      toast.error(msg);
    });

    // Handle course-wide socket announcement to auto-join lobby for online students
    socket.on('quiz:live_announced', (data: { sessionId: string; topic: string; courseCode: string }) => {
      if (!isFaculty) {
        toast((t) => (
          <div className="flex flex-col gap-1 text-xs">
            <p className="font-bold text-white">🔥 Live Quiz Battle Starting!</p>
            <p className="text-white/70">Join battle in <strong>{data.courseCode}</strong> on <strong>{data.topic}</strong></p>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                handleJoinLobbyDirectly(data.sessionId);
              }}
              className="btn-primary py-1 px-3 mt-1.5 text-[10px]"
            >
              Join Battle
            </button>
          </div>
        ), { duration: 12000, icon: '⚔️' });
      }
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      socket.disconnect();
    };
  }, [user]);

  const handleJoinLobbyDirectly = (sessionId: string) => {
    setSession({ _id: sessionId });
    socketRef.current?.emit('quiz:join', {
      sessionId,
      studentId: user?.id,
      name: user?.name,
    });
    setGameState('lobby');
  };

  const handleCreateLobby = () => {
    if (!selectedCourse || !topic) {
      toast.error('Please select course and topic');
      return;
    }
    socketRef.current?.emit('quiz:host', {
      courseId: selectedCourse,
      topic,
      difficulty,
      count,
    });
  };

  const handleStartGame = () => {
    if (participants.length === 0) {
      toast.error('Need at least 1 student to start the battle!');
      return;
    }
    socketRef.current?.emit('quiz:start', { sessionId: session?._id });
  };

  const handleSubmitAnswer = (label: string) => {
    if (isSubmitted || timeLeft <= 0) return;
    const timeTaken = Date.now() - startTimeRef.current;
    setSelectedAnswer(label);
    setIsSubmitted(true);
    socketRef.current?.emit('quiz:submit', {
      sessionId: session?._id,
      studentId: user?.id,
      selectedLabel: label,
      timeTakenMs: timeTaken,
    });
  };

  const handleNext = () => {
    socketRef.current?.emit('quiz:next_question', { sessionId: session?._id });
  };

  const handleEndQuiz = () => {
    socketRef.current?.emit('quiz:end_game', { sessionId: session?._id });
  };

  return (
    <div className="glass-card p-6 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
      {/* Configuration View */}
      {gameState === 'config' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              ⚔️ Real-Time Live Quiz Battle
            </h2>
            <button onClick={onClose} className="text-white/40 hover:text-white text-xs">
              ✕ Close
            </button>
          </div>

          {isFaculty ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="input-field text-white"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.code} - {c.title}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 mb-1.5">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g., Concurrency Control, SQL Joins..."
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="input-field text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-1.5">Question Count</label>
                  <input
                    type="number"
                    min={3}
                    max={15}
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    className="input-field"
                  />
                </div>
              </div>

              <button onClick={handleCreateLobby} className="btn-primary w-full py-3 mt-4">
                ✨ Open Quiz Lobby & Announce Class
              </button>
            </div>
          ) : (
            <div className="text-center py-16 space-y-4">
              <span className="text-4xl block">⚔️</span>
              <h3 className="font-bold text-white">Join Live Quiz Battle Lobby</h3>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                Wait for your instructor to host a live quiz battle. When started, a join prompt will appear here in real-time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lobby View */}
      {gameState === 'lobby' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-2 text-center">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-primary-500/10 border border-primary-500/20 text-primary-400">
              CLASSROOM LOBBY OPEN
            </span>
            <h2 className="text-2xl font-black text-white">{session?.topic}</h2>
            <p className="text-xs text-white/40">Waiting for players to join the battle arena...</p>
          </div>

          <div className="my-6 flex-1 bg-white/[0.01] border border-white/[0.04] rounded-2xl p-4 max-h-[250px] overflow-y-auto">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">
              🎯 Joined Players ({participants.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {participants.map((player) => (
                <motion.div
                  key={player.studentId}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="glass-card px-3 py-2 rounded-xl flex items-center gap-2 border-white/5"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-white truncate font-medium">{player.name}</span>
                </motion.div>
              ))}
              {participants.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-white/20">Lobby is empty</div>
              )}
            </div>
          </div>

          {isFaculty ? (
            <div className="flex gap-3">
              <button onClick={handleStartGame} className="btn-primary flex-1 py-3">
                ⚔️ Start Live Battle
              </button>
              <button onClick={handleEndQuiz} className="btn-secondary py-3">
                Abort
              </button>
            </div>
          ) : (
            <div className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="h-4 w-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-white/50">Your instructor will start the game shortly. Stand by!</p>
            </div>
          )}
        </div>
      )}

      {/* Active Question View */}
      {gameState === 'question' && currentQuestion && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-white/50">
              Question {questionIndex + 1} of {totalQuestions}
            </span>

            {/* Circular Countdown Timer */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white/60">Timer:</span>
              <div className="relative h-9 w-9 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="transparent"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="transparent"
                    stroke={timeLeft > 5 ? '#4f63ff' : '#fc8181'}
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 14}`}
                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - timeLeft / timerSeconds)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-white">{timeLeft}</span>
              </div>
            </div>
          </div>

          <div className="text-center py-4">
            <h2 className="text-lg font-bold text-white max-w-xl mx-auto leading-relaxed">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Options Grid */}
          <div className="grid gap-3 sm:grid-cols-2 my-4">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswer === opt.label;
              return (
                <button
                  key={opt.label}
                  disabled={isFaculty || isSubmitted || timeLeft <= 0}
                  onClick={() => handleSubmitAnswer(opt.label)}
                  className="glass-card p-4 rounded-2xl text-left border-white/5 hover:border-white/20 transition-all text-xs font-medium flex items-center gap-3 w-full"
                  style={{
                    background: isSelected ? 'rgba(79,99,255,0.18)' : 'rgba(255,255,255,0.03)',
                    borderColor: isSelected ? 'rgba(79,99,255,0.5)' : 'rgba(255,255,255,0.06)',
                    cursor: isFaculty || isSubmitted || timeLeft <= 0 ? 'default' : 'pointer',
                  }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg font-bold bg-white/5 text-white/60">
                    {opt.label}
                  </span>
                  <span className="text-white/80">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {/* Submission Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-white/40">
              <span>Answers Received: {submitProgress.totalSubmitted} / {submitProgress.totalParticipants}</span>
              {isSubmitted && !isFaculty && <span className="text-green-400 font-bold">Answer Lock ✅</span>}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${submitProgress.totalParticipants > 0 ? (submitProgress.totalSubmitted / submitProgress.totalParticipants) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {isFaculty && (
            <button
              onClick={() => socketRef.current?.emit('quiz:show_results', { sessionId: session?._id })}
              className="btn-secondary py-2 text-xs w-full mt-4"
            >
              Skip / Show Leaderboard
            </button>
          )}
        </div>
      )}

      {/* Leaderboard/Question Review View */}
      {gameState === 'leaderboard' && questionResults && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="text-center border-b border-white/5 pb-4">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Correct Answer</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-6 w-6 rounded bg-green-500/20 border border-green-500/30 text-green-400 flex items-center justify-center font-bold text-xs">
                {questionResults.correctAnswerLabel}
              </span>
              <span className="text-sm font-semibold text-white">{questionResults.correctAnswerText}</span>
            </div>
            {questionResults.explanation && (
              <p className="text-[10px] text-white/50 max-w-lg mx-auto mt-2 italic">
                💡 {questionResults.explanation}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1 my-2">
            {questionResults.leaderboard.map((player, idx) => (
              <motion.div
                key={player.studentId}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-2.5 rounded-xl border text-xs"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: player.lastCorrect ? 'rgba(72,187,120,0.2)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white/40 w-4">{idx + 1}</span>
                  <span className="font-semibold text-white">{player.name}</span>
                  {player.streak > 1 && (
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded text-amber-400 font-bold">
                      🔥 {player.streak} Streak
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {player.lastCorrect ? (
                    <span className="text-green-400 font-bold text-[10px]">+Points</span>
                  ) : (
                    <span className="text-red-400/50 text-[10px]">Missed</span>
                  )}
                  <span className="font-bold text-white">{player.score} pts</span>
                </div>
              </motion.div>
            ))}
          </div>

          {isFaculty && (
            <button onClick={handleNext} className="btn-primary py-3 w-full">
              {questionIndex + 1 >= totalQuestions ? '🏁 Show Final Podium' : '➡️ Next Question'}
            </button>
          )}
        </div>
      )}

      {/* Finished / Podium View */}
      {gameState === 'finished' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="text-center space-y-2">
            <span className="text-4xl">🏆</span>
            <h2 className="text-2xl font-black text-white">Live Battle Finished!</h2>
            <p className="text-xs text-white/40">Congratulations to all participants!</p>
          </div>

          {/* Podium Grid */}
          <div className="flex items-end justify-center gap-4 my-6">
            {podium.length > 1 && podium[1] && (
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 rounded-full bg-slate-500 flex items-center justify-center font-bold text-white text-xs border-2 border-slate-400">2</div>
                <div className="text-xs font-bold text-white/70 mt-1 max-w-[80px] truncate">{podium[1].name}</div>
                <div className="text-[10px] text-white/40">{podium[1].score} pts</div>
                <div className="h-16 w-16 bg-white/5 border border-white/10 rounded-t-xl mt-2 flex items-center justify-center text-white/30 text-[10px]">Silver</div>
              </div>
            )}

            {podium.length > 0 && podium[0] && (
              <div className="flex flex-col items-center">
                <span className="text-xl">👑</span>
                <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-white text-sm border-2 border-yellow-400">1</div>
                <div className="text-xs font-bold text-white mt-1 max-w-[90px] truncate">{podium[0].name}</div>
                <div className="text-[10px] text-white/40">{podium[0].score} pts</div>
                <div className="h-24 w-20 bg-yellow-500/10 border border-yellow-500/20 rounded-t-xl mt-2 flex items-center justify-center text-yellow-400 text-xs font-black">Gold</div>
              </div>
            )}

            {podium.length > 2 && podium[2] && (
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-amber-700 flex items-center justify-center font-bold text-white text-xs border-2 border-amber-600">3</div>
                <div className="text-xs font-bold text-white/70 mt-1 max-w-[80px] truncate">{podium[2].name}</div>
                <div className="text-[10px] text-white/40">{podium[2].score} pts</div>
                <div className="h-12 w-16 bg-white/5 border border-white/10 rounded-t-xl mt-2 flex items-center justify-center text-white/30 text-[10px]">Bronze</div>
              </div>
            )}
          </div>

          <button onClick={onClose} className="btn-secondary py-3 w-full">
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
