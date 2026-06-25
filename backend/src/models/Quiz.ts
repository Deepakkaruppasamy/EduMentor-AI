import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface IQuizQuestion {
  question: string;
  type: 'mcq' | 'short' | 'long';
  difficulty: 'easy' | 'medium' | 'hard';
  options?: IQuizOption[];
  correctAnswer?: string;
  explanation?: string;
  topic?: string;
  studentAnswer?: string;
  isCorrect?: boolean;
  score?: number;
  feedback?: string;
}

export interface IQuiz extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  title: string;
  questions: IQuizQuestion[];
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'mcq' | 'short' | 'long' | 'mixed';
  topic?: string;
  totalQuestions: number;
  score?: number;
  maxScore: number;
  status: 'generated' | 'in_progress' | 'completed';
  completedAt?: Date;
  assignedBy?: mongoose.Types.ObjectId;
  dueDate?: Date;
  assignmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuizOptionSchema = new Schema<IQuizOption>({
  label: String,
  text: String,
  isCorrect: Boolean,
});

export const QuizQuestionSchema = new Schema<IQuizQuestion>({
  question: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'short', 'long'], required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  options: [QuizOptionSchema],
  correctAnswer: String,
  explanation: String,
  topic: String,
  studentAnswer: String,
  isCorrect: Boolean,
  score: Number,
  feedback: String,
});

const QuizSchema = new Schema<IQuiz>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    questions: [QuizQuestionSchema],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    type: { type: String, enum: ['mcq', 'short', 'long', 'mixed'], default: 'mcq' },
    topic: String,
    totalQuestions: { type: Number, default: 0 },
    score: Number,
    maxScore: { type: Number, default: 0 },
    status: { type: String, enum: ['generated', 'in_progress', 'completed'], default: 'generated' },
    completedAt: Date,
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    assignmentId: String,
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', QuizSchema);
