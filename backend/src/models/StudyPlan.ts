import mongoose, { Document, Schema } from 'mongoose';

export interface IStudySession {
  date: string; // "2026-07-01"
  dayLabel: string; // "Monday"
  topics: { subject: string; topic: string; durationMinutes: number; notes: string }[];
  totalHours: number;
}

export interface IStudyPlan extends Document {
  student: mongoose.Types.ObjectId;
  examDate: Date;
  subjects: string[];
  dailyHours: number;
  preferredTime: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  generatedPlan: IStudySession[];
  weeklyGoals: string[];
  examTips: string[];
  createdAt: Date;
  updatedAt: Date;
}

const StudySessionSchema = new Schema(
  {
    date: String,
    dayLabel: String,
    topics: [
      {
        subject: String,
        topic: String,
        durationMinutes: Number,
        notes: String,
      },
    ],
    totalHours: Number,
  },
  { _id: false }
);

const StudyPlanSchema = new Schema<IStudyPlan>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    examDate: { type: Date, required: true },
    subjects: { type: [String], required: true },
    dailyHours: { type: Number, required: true, min: 1, max: 16 },
    preferredTime: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night'],
      default: 'Morning',
    },
    generatedPlan: { type: [StudySessionSchema], default: [] },
    weeklyGoals: { type: [String], default: [] },
    examTips: { type: [String], default: [] },
  },
  { timestamps: true }
);

StudyPlanSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model<IStudyPlan>('StudyPlan', StudyPlanSchema);
