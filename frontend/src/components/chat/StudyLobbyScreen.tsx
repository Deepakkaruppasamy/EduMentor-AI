import React, { useState, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Course } from '../../types';

interface Participant {
  socketId: string;
  name: string;
}

interface ChatMessage {
  sender: string;
  text: string;
  timestamp?: string;
}

interface StudyLobbyScreenProps {
  courses: Course[];
  studentName: string;
  onClose: () => void;
}

export const StudyLobbyScreen: React.FC<StudyLobbyScreenProps> = ({ courses, studentName, onClose }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState<'setup' | 'in_lobby'>('setup');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // AI Chat states
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Connect & Join Socket
  const connectSocket = (roomId: string, isHost: boolean, courseId: string) => {
    const socket = io(window.location.origin, {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (isHost) {
        socket.emit('study:create', { courseId, studentName });
      } else {
        socket.emit('study:join', { roomId, studentName });
      }
    });

    socket.on('study:created', (data: { roomId: string }) => {
      setRoomCode(data.roomId);
      setStatus('in_lobby');
      toast.success(`Study Lobby ${data.roomId} created!`);
    });

    socket.on('study:joined', (data: { roomId: string; strokes: any[] }) => {
      setRoomCode(data.roomId);
      setStatus('in_lobby');
      toast.success(`Joined Study Lobby ${data.roomId}!`);
      
      // Draw historical strokes
      setTimeout(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            data.strokes.forEach(stroke => drawLineOnCanvas(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width));
          }
        }
      }, 300);
    });

    socket.on('study:participants', (list: Participant[]) => {
      setParticipants(list);
    });

    socket.on('study:message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('study:draw', (stroke: any) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          drawLineOnCanvas(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width);
        }
      }
    });

    socket.on('study:clear_board', () => {
      clearCanvasLocal();
    });

    // Collaborative AI Stream Listeners
    socket.on('study:ai_start', () => {
      setIsAiLoading(true);
      setAiResponse('');
    });

    socket.on('study:ai_token', (token: string) => {
      setAiResponse(prev => prev + token);
    });

    socket.on('study:ai_end', () => {
      setIsAiLoading(false);
    });

    socket.on('study:error', (errMsg: string) => {
      toast.error(errMsg);
      setIsAiLoading(false);
    });
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const handleCreateLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error('Please select a course to host.');
      return;
    }
    connectSocket('', true, selectedCourse);
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) {
      toast.error('Please enter a 6-digit room PIN.');
      return;
    }
    connectSocket(joinCode, false, '');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('study:message', { roomId: roomCode, sender: studentName, text: chatInput });
    setChatInput('');
  };

  const handleQueryAI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || !socketRef.current || isAiLoading) return;
    socketRef.current.emit('study:query_ai', { roomId: roomCode, query: aiQuery });
    setAiQuery('');
  };

  const drawLineOnCanvas = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width: number
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    isDrawingRef.current = true;
    lastPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current || !socketRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const stroke = {
      x1: lastPosRef.current.x,
      y1: lastPosRef.current.y,
      x2: currentX,
      y2: currentY,
      color: '#4f63ff',
      width: 3,
    };

    drawLineOnCanvas(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width);
    socketRef.current.emit('study:draw', { roomId: roomCode, stroke });

    lastPosRef.current = { x: currentX, y: currentY };
  };

  const handleMouseUpOrLeave = () => {
    isDrawingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    isDrawingRef.current = true;
    lastPosRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    if (e.cancelable) e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current || !socketRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    const stroke = {
      x1: lastPosRef.current.x,
      y1: lastPosRef.current.y,
      x2: currentX,
      y2: currentY,
      color: '#4f63ff',
      width: 3,
    };

    drawLineOnCanvas(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.width);
    socketRef.current.emit('study:draw', { roomId: roomCode, stroke });

    lastPosRef.current = { x: currentX, y: currentY };
    if (e.cancelable) e.preventDefault();
  };

  const clearCanvasLocal = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleClearBoard = () => {
    if (socketRef.current) {
      socketRef.current.emit('study:clear_board', { roomId: roomCode });
    }
  };

  const handleLeaveLobby = () => {
    if (socketRef.current) {
      socketRef.current.emit('study:leave', { roomId: roomCode, studentName });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('setup');
    setRoomCode('');
    setParticipants([]);
    setMessages([]);
    setAiResponse('');
  };

  return (
    <div className="space-y-6">
      {status === 'setup' ? (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <h1 className="text-2xl font-bold text-white">👥 Collaborative Peer Study Lobbies</h1>
              <p className="mt-1 text-sm text-white/40">Host or join synchronous rooms with real-time shared drawing canvases and collaborative AI tutoring</p>
            </div>
            <button onClick={onClose} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
              ✕ Close
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Host Section */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  🏫
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Host a New Study Lobby</h2>
                  <p className="text-xs text-white/45 mt-1">Generate a 6-digit room PIN, invite classmates, and lead a live collaborative session.</p>
                </div>

                <form onSubmit={handleCreateLobby} className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-white/60">Choose Subject</label>
                    <select
                      value={selectedCourse}
                      onChange={e => setSelectedCourse(e.target.value)}
                      className="input-field text-white"
                      required
                    >
                      <option value="" className="bg-[#1a1d27]">Select course...</option>
                      {courses.map(course => (
                        <option key={course._id} value={course._id} className="bg-[#1a1d27]">
                          {course.code} - {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-2 text-xs font-semibold mt-2">
                    🌐 Initialize Study Room
                  </button>
                </form>
              </div>
            </div>

            {/* Join Section */}
            <div className="glass-card p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  🔑
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Join via Room PIN</h2>
                  <p className="text-xs text-white/45 mt-1">Enter a classmate's active 6-digit room PIN to join their live group study workspace.</p>
                </div>

                <form onSubmit={handleJoinLobby} className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-white/60">6-Digit Room Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 583920"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      className="input-field text-white font-mono text-center tracking-widest text-lg font-bold"
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full py-2 text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-500 border border-purple-500/20 shadow-lg mt-2">
                    🔓 Join Workspace Room
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Lobby UI */
        <div className="h-auto md:h-[80vh] flex flex-col md:flex-row gap-4 animate-fadeIn">
          
          {/* Left / Center Panel: Whiteboard & Collaborative AI */}
          <div className="flex-1 flex flex-col gap-4">
            
            {/* Whiteboard Header */}
            <div className="glass-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-primary-400 font-mono">Active Workspace Room Code</span>
                <h2 className="text-lg font-black text-white font-mono tracking-wider">{roomCode}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearBoard}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 py-1.5 px-4 text-xs font-semibold rounded-xl text-white/95"
                >
                  🧹 Clear Board
                </button>
                <button
                  type="button"
                  onClick={handleLeaveLobby}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 py-1.5 px-4 text-xs font-semibold rounded-xl text-red-400"
                >
                  🚪 Leave Room
                </button>
              </div>
            </div>
 
            {/* Drawing Canvas */}
            <div className="flex-1 glass-card p-2 relative overflow-hidden bg-[#111319] min-h-[300px]">
              <span className="absolute top-3 left-3 text-[9px] uppercase font-semibold text-white/20 select-none">
                Shared Scratch Whiteboard
              </span>
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
                className="w-full h-full bg-[#111319] cursor-crosshair rounded-xl block"
              />
            </div>

            {/* Collaborative AI Chat panel */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs">🤖</span>
                <h3 className="text-xs font-bold text-white">Co-Query AI Tutor</h3>
                <span className="text-[9px] text-white/30">(Answers are streamed live to everyone in the room)</span>
              </div>
              
              {aiResponse && (
                <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] max-h-40 overflow-y-auto">
                  <p className="text-xs text-white/80 leading-relaxed font-light whitespace-pre-line font-mono">
                    {aiResponse}
                  </p>
                </div>
              )}

              <form onSubmit={handleQueryAI} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask the AI Tutor a question about the course materials..."
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  className="input-field py-2 text-xs flex-1"
                  disabled={isAiLoading}
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiQuery.trim()}
                  className="btn-primary py-2 px-5 text-xs font-semibold flex-shrink-0"
                >
                  {isAiLoading ? 'AI Typing...' : 'Ask Group AI'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Classmates list & Peer Chat */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            
            {/* Classmates Active list */}
            <div className="glass-card p-5 flex flex-col">
              <h3 className="text-xs font-bold text-white mb-3">👥 Active Classmates ({participants.length})</h3>
              <div className="space-y-2 overflow-y-auto max-h-36 pr-1">
                {participants.map(p => (
                  <div key={p.socketId} className="flex items-center gap-2 text-xs p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <div className="h-5 w-5 rounded bg-primary-500/20 text-primary-400 font-mono font-black flex items-center justify-center text-[10px]">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white/80 font-medium truncate">{p.name} {p.socketId === socketRef.current?.id && '(You)'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Box Feed */}
            <div className="glass-card p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-white border-b border-white/5 pb-2 mb-3">💬 Room Chat</h3>
                <div className="space-y-3 overflow-y-auto h-[25vh] md:h-[35vh] pr-1 flex flex-col">
                  {messages.map((m, idx) => {
                    const isSys = m.sender === 'System';
                    return (
                      <div key={idx} className={`text-xs ${isSys ? 'text-white/20 text-center italic py-1' : 'text-left'}`}>
                        {!isSys && (
                          <strong className="text-primary-400 block font-semibold text-[10px] mb-0.5">{m.sender}</strong>
                        )}
                        <span className={`inline-block py-1.5 px-3 rounded-xl max-w-full font-light ${
                          isSys ? 'text-[9px]' : 'bg-white/5 text-white/95 border border-white/[0.04]'
                        }`}>
                          {m.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 pt-3 mt-2">
                <input
                  type="text"
                  placeholder="Type message to room..."
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  className="input-field py-1.5 text-[11px] flex-1 bg-transparent border-white/10"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="btn-secondary py-1 px-3 text-xs flex-shrink-0"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
