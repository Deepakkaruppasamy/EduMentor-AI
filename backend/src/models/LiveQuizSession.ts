import mongoose, { Document, Schema } from 'mongoose';
import { IQuizQuestion, QuizQuestionSchema } from './Quiz';

export interface ILiveParticipant {
  studentId: mongoose.Types.ObjectId;
  name: string;
  score: number;
  answers: { [key: number]: string };
  streak: number;
  lastResponseTime?: number; // millisecond difference for tiebreakers
}

export interface ILiveQuizSession extends Document {
  course: mongoose.Types.ObjectId;
  faculty: mongoose.Types.ObjectId;
  topic: string;
  questions: IQuizQuestion[];
  currentQuestionIndex: number; // -1 for lobby, questions.length for finished
  status: 'lobby' | 'active' | 'leaderboard' | 'finished';
  participants: ILiveParticipant[];
  timerSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const LiveParticipantSchema = new Schema<ILiveParticipant>({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  answers: { type: Schema.Types.Mixed, default: {} },
  streak: { type: Number, default: 0 },
  lastResponseTime: Number,
});

const LiveQuizSessionSchema = new Schema<ILiveQuizSession>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    questions: [QuizQuestionSchema],
    currentQuestionIndex: { type: Number, default: -1 },
    status: { type: String, enum: ['lobby', 'active', 'leaderboard', 'finished'], default: 'lobby' },
    participants: [LiveParticipantSchema],
    timerSeconds: { type: Number, default: 20 },
  },
  { timestamps: true }
);

export default mongoose.model<ILiveQuizSession>('LiveQuizSession', LiveQuizSessionSchema);
