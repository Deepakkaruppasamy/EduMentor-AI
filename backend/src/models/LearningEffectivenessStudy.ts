import mongoose, { Schema, Document } from 'mongoose';

export interface ILearningEffectivenessStudy extends Document {
  participantId: string;
  experimentRunId?: string;
  course: mongoose.Types.ObjectId;
  courseName?: string;
  preTestScore: number;
  preTestTotal: number;
  preTestPercent: number;
  postTestScore: number;
  postTestTotal: number;
  postTestPercent: number;
  learningGain: number;
  normalizedGain: number;
  interventionDurationMinutes?: number;
  queryCountDuringIntervention?: number;
  configuration: string;
  submittedAt: Date;
}

const LearningEffectivenessStudySchema = new Schema<ILearningEffectivenessStudy>(
  {
    participantId: { type: String, required: true, index: true },
    experimentRunId: { type: String, default: 'Run-Default' },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, default: 'Course' },
    preTestScore: { type: Number, required: true },
    preTestTotal: { type: Number, required: true },
    preTestPercent: { type: Number, required: true },
    postTestScore: { type: Number, required: true },
    postTestTotal: { type: Number, required: true },
    postTestPercent: { type: Number, required: true },
    learningGain: { type: Number, required: true },
    normalizedGain: { type: Number, required: true },
    interventionDurationMinutes: { type: Number, default: 15 },
    queryCountDuringIntervention: { type: Number, default: 3 },
    configuration: { type: String, default: 'HYBRID_RRF', index: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ILearningEffectivenessStudy>(
  'LearningEffectivenessStudy',
  LearningEffectivenessStudySchema
);
