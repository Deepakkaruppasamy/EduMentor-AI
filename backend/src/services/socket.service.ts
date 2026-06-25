import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import mongoose from 'mongoose';
import { config } from '../config/env';
import LiveQuizSession from '../models/LiveQuizSession';
import Course from '../models/Course';
import { generateQuizQuestions } from './quiz/quiz.service';
import { hybridRetrieve } from './rag/hybrid-rag.service';

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

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
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
