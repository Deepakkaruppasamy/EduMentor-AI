import mongoose, { Document, Schema } from 'mongoose';

export interface ITAMSurvey extends Document {
  user: mongoose.Types.ObjectId;
  role: 'student' | 'faculty';
  perceivedUsefulness: number;       // 1-5
  perceivedEaseOfUse: number;        // 1-5
  attitudeTowardUse: number;         // 1-5
  behavioralIntention: number;       // 1-5
  selfEfficacy: number;              // 1-5
  systemAccessibility: number;       // 1-5
  overallSatisfaction: number;       // 1-5
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TAMSurveySchema = new Schema<ITAMSurvey>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    role: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    perceivedUsefulness: { type: Number, min: 1, max: 5, required: true },
    perceivedEaseOfUse: { type: Number, min: 1, max: 5, required: true },
    attitudeTowardUse: { type: Number, min: 1, max: 5, required: true },
    behavioralIntention: { type: Number, min: 1, max: 5, required: true },
    selfEfficacy: { type: Number, min: 1, max: 5, required: true },
    systemAccessibility: { type: Number, min: 1, max: 5, required: true },
    overallSatisfaction: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, default: '' },
  },
  { timestamps: true }
);

TAMSurveySchema.index({ user: 1 }, { unique: true });

export default mongoose.model<ITAMSurvey>('TAMSurvey', TAMSurveySchema);
