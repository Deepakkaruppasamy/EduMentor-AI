import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { config } from '../config/env';
import LiveQuizSession from '../models/LiveQuizSession';
import Course from '../models/Course';
import { generateQuizQuestions } from './quiz/quiz.service';
import { hybridRetrieve } from './rag/hybrid-rag.service';
import { generateResponseStream } from './ai/groq.service';

interface PeerLobby {
  roomId: string;
  courseId: string;
  participants: { socketId: string; name: string }[];
  drawingStrokes: any[];
}

const activeLobbies = new Map<string, PeerLobby>();

let io: SocketServer | null = null;

/**
 * Initialize Socket.io Server
 */
export function initSocketServer(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: [config.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room for a course
    socket.on('join_course', (courseId: string) => {
      const roomName = `course_${courseId}`;
      socket.join(roomName);
      console.log(`👤 Client ${socket.id} joined course room: ${roomName}`);
    });

    // Leave room for a course
    socket.on('leave_course', (courseId: string) => {
      const roomName = `course_${courseId}`;
      socket.leave(roomName);
      console.log(`👤 Client ${socket.id} left course room: ${roomName}`);
    });

    // --- MULTIPLAYER LIVE QUIZ LOBBY EVENTS ---

    // Host live quiz session
    socket.on('quiz:host', async (data: { courseId: string; topic: string; difficulty?: string; count?: number }) => {
      try {
        const { courseId, topic, difficulty = 'medium', count = 5 } = data;
        const course = await Course.findById(courseId);
        if (!course) {
          socket.emit('quiz:error', 'Course not found');
          return;
        }

        // Retrieve context
        const ragResult = await hybridRetrieve(topic, course.chromaCollection, 5);

        // Generate questions
        const questions = await generateQuizQuestions({
          topic,
          courseName: course.title,
          context: ragResult.context || `Topic: ${topic} for ${course.title}`,
          questionType: 'mcq', // live battle is strictly MCQ
          difficulty: difficulty as any,
          count: Math.min(count, 15),
        });

        if (questions.length === 0) {
          socket.emit('quiz:error', 'Failed to generate questions. Try a different topic.');
          return;
        }

        // Create live session
        const session = await LiveQuizSession.create({
          course: courseId,
          faculty: socket.handshake.query.userId || course.faculty,
          topic,
          questions,
          timerSeconds: 20,
          currentQuestionIndex: -1,
          status: 'lobby',
          participants: [],
        });

        const roomId = `live_quiz_${session._id}`;
        socket.join(roomId);

        // Notify host
        socket.emit('quiz:lobby_created', session);

        // Broadcast to main course room that a live quiz has been hosted
        io?.to(`course_${courseId}`).emit('quiz:live_announced', {
          sessionId: session._id,
          topic,
          courseCode: course.code,
        });

      } catch (err: any) {
        console.error('Socket host quiz error:', err);
        socket.emit('quiz:error', err.message || 'Error hosting quiz lobby');
      }
    });

    // Join live quiz session as a student
    socket.on('quiz:join', async (data: { sessionId: string; studentId: string; name: string }) => {
      try {
        const { sessionId, studentId, name } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session) {
          socket.emit('quiz:error', 'Lobby not found');
          return;
        }

        if (session.status !== 'lobby') {
          socket.emit('quiz:error', 'Quiz has already started or finished');
          return;
        }

        // Add to participants if not already joined
        const exists = session.participants.some(p => p.studentId.toString() === studentId);
        if (!exists) {
          session.participants.push({
            studentId: new mongoose.Types.ObjectId(studentId) as any,
            name,
            score: 0,
            answers: {},
            streak: 0,
          });
          await session.save();
        }

        const roomId = `live_quiz_${sessionId}`;
        socket.join(roomId);

        // Broadcast updated participants list to everyone in lobby
        const updatedSession = await LiveQuizSession.findById(sessionId);
        io?.to(roomId).emit('quiz:lobby_update', updatedSession?.participants || []);

      } catch (err: any) {
        console.error('Socket join quiz error:', err);
        socket.emit('quiz:error', err.message || 'Error joining lobby');
      }
    });

    // Start live quiz
    socket.on('quiz:start', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session) return;

        session.status = 'active';
        session.currentQuestionIndex = 0;
        await session.save();

        const roomId = `live_quiz_${sessionId}`;
        
        // Strip out correct answers before broadcasting questions to students
        const firstQuestion = session.questions[0];
        const studentQuestion = {
          question: firstQuestion.question,
          type: firstQuestion.type,
          difficulty: firstQuestion.difficulty,
          options: firstQuestion.options?.map(o => ({ label: o.label, text: o.text })),
          topic: firstQuestion.topic,
        };

        io?.to(roomId).emit('quiz:question_active', {
          question: studentQuestion,
          index: 0,
          total: session.questions.length,
          timerSeconds: session.timerSeconds,
        });

      } catch (err: any) {
        socket.emit('quiz:error', 'Failed to start quiz');
      }
    });

    // Submit answer
    socket.on('quiz:submit', async (data: { sessionId: string; studentId: string; selectedLabel: string; timeTakenMs: number }) => {
      try {
        const { sessionId, studentId, selectedLabel, timeTakenMs } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session || session.status !== 'active') return;

        const qIdx = session.currentQuestionIndex;
        const question = session.questions[qIdx];
        
        const participant = session.participants.find(p => p.studentId.toString() === studentId);
        if (!participant) return;

        // Save student answer
        participant.answers[qIdx] = selectedLabel;

        // Check if correct
        const correctOpt = question.options?.find(o => o.isCorrect);
        const isCorrect = correctOpt ? correctOpt.label === selectedLabel : false;

        if (isCorrect) {
          const maxTime = session.timerSeconds * 1000;
          const speedFactor = Math.max(0, 1 - (timeTakenMs / maxTime));
          const bonus = Math.round(speedFactor * 100);
          participant.score += (100 + bonus);
          participant.streak += 1;
        } else {
          participant.streak = 0;
        }

        participant.lastResponseTime = timeTakenMs;
        session.markModified('participants');
        await session.save();

        const roomId = `live_quiz_${sessionId}`;
        
        io?.to(roomId).emit('quiz:submitted', {
          studentId,
          name: participant.name,
          totalSubmitted: session.participants.filter(p => p.answers[qIdx] !== undefined).length,
          totalParticipants: session.participants.length,
        });

      } catch (err: any) {
        console.error('Socket quiz submission error:', err);
      }
    });

    // Move to Leaderboard/Results screen for current question
    socket.on('quiz:show_results', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session || session.status !== 'active') return;

        session.status = 'leaderboard';
        await session.save();

        const roomId = `live_quiz_${sessionId}`;
        const question = session.questions[session.currentQuestionIndex];

        const correctOpt = question.options?.find(o => o.isCorrect);
        const leaderboard = session.participants
          .map(p => ({
            studentId: p.studentId,
            name: p.name,
            score: p.score,
            streak: p.streak,
            lastCorrect: p.answers[session.currentQuestionIndex] === correctOpt?.label,
          }))
          .sort((a, b) => b.score - a.score);

        io?.to(roomId).emit('quiz:leaderboard_active', {
          correctAnswerLabel: correctOpt?.label,
          correctAnswerText: correctOpt?.text,
          explanation: question.explanation,
          leaderboard,
        });

      } catch (err: any) {
        socket.emit('quiz:error', 'Failed to show leaderboard');
      }
    });

    // Move to next question
    socket.on('quiz:next_question', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session) return;

        const nextIdx = session.currentQuestionIndex + 1;
        if (nextIdx >= session.questions.length) {
          session.status = 'finished';
          await session.save();

          const finalScores = session.participants
            .map(p => ({ studentId: p.studentId, name: p.name, score: p.score }))
            .sort((a, b) => b.score - a.score);

          io?.to(`live_quiz_${sessionId}`).emit('quiz:game_over', {
            podium: finalScores.slice(0, 3),
            allScores: finalScores,
          });
        } else {
          session.status = 'active';
          session.currentQuestionIndex = nextIdx;
          await session.save();

          const nextQ = session.questions[nextIdx];
          const studentQuestion = {
            question: nextQ.question,
            type: nextQ.type,
            difficulty: nextQ.difficulty,
            options: nextQ.options?.map(o => ({ label: o.label, text: o.text })),
            topic: nextQ.topic,
          };

          io?.to(`live_quiz_${sessionId}`).emit('quiz:question_active', {
            question: studentQuestion,
            index: nextIdx,
            total: session.questions.length,
            timerSeconds: session.timerSeconds,
          });
        }

      } catch (err: any) {
        socket.emit('quiz:error', 'Failed to load next question');
      }
    });

    // End Live Quiz early
    socket.on('quiz:end_game', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data;
        const session = await LiveQuizSession.findById(sessionId);
        if (!session) return;

        session.status = 'finished';
        await session.save();

        const finalScores = session.participants
          .map(p => ({ studentId: p.studentId, name: p.name, score: p.score }))
          .sort((a, b) => b.score - a.score);

        io?.to(`live_quiz_${sessionId}`).emit('quiz:game_over', {
          podium: finalScores.slice(0, 3),
          allScores: finalScores,
        });

      } catch (err: any) {
        socket.emit('quiz:error', 'Failed to end quiz battle');
      }
    });

    // --- COLLABORATIVE STUDY LOBBY EVENTS ---

    // Create a new study lobby
    socket.on('study:create', (data: { courseId: string; studentName: string }) => {
      const { courseId, studentName } = data;
      const roomId = Math.floor(100000 + Math.random() * 900000).toString();

      activeLobbies.set(roomId, {
        roomId,
        courseId,
        participants: [{ socketId: socket.id, name: studentName }],
        drawingStrokes: [],
      });

      socket.join(roomId);
      socket.emit('study:created', { roomId, courseId });
      io?.to(roomId).emit('study:participants', [{ socketId: socket.id, name: studentName }]);
      console.log(`🏫 Study Lobby ${roomId} created for course ${courseId} by ${studentName}`);
    });

    // Join an existing study lobby
    socket.on('study:join', (data: { roomId: string; studentName: string }) => {
      const { roomId, studentName } = data;
      const lobby = activeLobbies.get(roomId);
      if (!lobby) {
        socket.emit('study:error', 'Study lobby room not found');
        return;
      }

      if (!lobby.participants.some(p => p.socketId === socket.id)) {
        lobby.participants.push({ socketId: socket.id, name: studentName });
      }

      socket.join(roomId);
      socket.emit('study:joined', { roomId, courseId: lobby.courseId, strokes: lobby.drawingStrokes });
      io?.to(roomId).emit('study:participants', lobby.participants);
      io?.to(roomId).emit('study:message', { sender: 'System', text: `${studentName} has joined the study room.` });
      console.log(`🏫 Student ${studentName} joined Study Lobby ${roomId}`);
    });

    // Peer-to-peer message broadcast
    socket.on('study:message', (data: { roomId: string; sender: string; text: string }) => {
      const { roomId, sender, text } = data;
      io?.to(roomId).emit('study:message', { sender, text, timestamp: new Date() });
    });

    // Whiteboard drawing stroke broadcast
    socket.on('study:draw', (data: { roomId: string; stroke: any }) => {
      const { roomId, stroke } = data;
      const lobby = activeLobbies.get(roomId);
      if (lobby) {
        lobby.drawingStrokes.push(stroke);
        if (lobby.drawingStrokes.length > 2000) {
          lobby.drawingStrokes.shift();
        }
        socket.to(roomId).emit('study:draw', stroke);
      }
    });

    // Clear board broadcast
    socket.on('study:clear_board', (data: { roomId: string }) => {
      const { roomId } = data;
      const lobby = activeLobbies.get(roomId);
      if (lobby) {
        lobby.drawingStrokes = [];
        io?.to(roomId).emit('study:clear_board');
      }
    });

    // AI Collaborative Chat Query with real-time stream broadcast
    socket.on('study:query_ai', async (data: { roomId: string; query: string }) => {
      const { roomId, query } = data;
      const lobby = activeLobbies.get(roomId);
      if (!lobby) return;

      try {
        const course = await Course.findById(lobby.courseId);
        let context = '';
        if (course) {
          const ragResult = await hybridRetrieve(query, course.chromaCollection, 5);
          context = ragResult.context || '';
        }

        io?.to(roomId).emit('study:ai_start');

        await generateResponseStream(
          [{ role: 'user', content: query }],
          context || 'Review materials',
          (token) => {
            io?.to(roomId).emit('study:ai_token', token);
          }
        );

        io?.to(roomId).emit('study:ai_end');
      } catch (error: any) {
        io?.to(roomId).emit('study:error', 'AI Query failed to process: ' + error.message);
      }
    });

    // Explicit leave
    socket.on('study:leave', (data: { roomId: string; studentName: string }) => {
      const { roomId, studentName } = data;
      const lobby = activeLobbies.get(roomId);
      if (lobby) {
        lobby.participants = lobby.participants.filter(p => p.socketId !== socket.id);
        socket.leave(roomId);

        if (lobby.participants.length === 0) {
          activeLobbies.delete(roomId);
          console.log(`🏫 Study Lobby ${roomId} closed because it is empty.`);
        } else {
          io?.to(roomId).emit('study:participants', lobby.participants);
          io?.to(roomId).emit('study:message', { sender: 'System', text: `${studentName} has left the study room.` });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      for (const [roomId, lobby] of activeLobbies.entries()) {
        const participantIndex = lobby.participants.findIndex(p => p.socketId === socket.id);
        if (participantIndex !== -1) {
          const pName = lobby.participants[participantIndex].name;
          lobby.participants.splice(participantIndex, 1);
          
          if (lobby.participants.length === 0) {
            activeLobbies.delete(roomId);
            console.log(`🏫 Study Lobby ${roomId} closed because it is empty.`);
          } else {
            io?.to(roomId).emit('study:participants', lobby.participants);
            io?.to(roomId).emit('study:message', { sender: 'System', text: `${pName} has left the study room.` });
          }
        }
      }
    });
  });

  return io;
}

/**
 * Get Socket.io instance
 */
export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server has not been initialized!');
  }
  return io;
}

/**
 * Broadcast document processing status to a course room
 */
export function notifyDocumentStatus(
  courseId: string,
  docId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  data?: {
    totalChunks?: number;
    summary?: string;
    conceptMap?: string;
    processingError?: string;
    document?: any;
    transcript?: string;
  }
): void {
  try {
    const socketIO = getIO();
    const roomName = `course_${courseId}`;
    socketIO.to(roomName).emit('document:status', {
      docId,
      status,
      ...data,
    });
    console.log(`📢 Broadcasted document:status (${status}) to room: ${roomName}`);
  } catch (err: any) {
    console.warn('Failed to broadcast socket event:', err.message);
  }
}

/**
 * Broadcast assigned quiz notification to a course room
 */
export function notifyNewQuizAssigned(
  courseId: string,
  topic: string,
  dueDate?: Date | string
): void {
  try {
    const socketIO = getIO();
    const roomName = `course_${courseId}`;
    socketIO.to(roomName).emit('quiz:assigned', {
      courseId,
      topic,
      dueDate,
    });
    console.log(`📢 Broadcasted quiz:assigned (${topic}) to room: ${roomName}`);
  } catch (err: any) {
    console.warn('Failed to broadcast socket event:', err.message);
  }
}
