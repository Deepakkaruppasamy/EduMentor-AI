import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicProgress {
  topic: string;
  queryCount: number;
  avgScore: number;
  strength: 'weak' | 'moderate' | 'strong';
}

export interface IRecommendation extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  weakTopics: string[];
  strongTopics: string[];
  topicProgress: ITopicProgress[];
  suggestedTopics: string[];
  revisionPlan: string;
  personalizedQuizTopics: string[];
  totalQueries: number;
  avgQuizScore: number;
  learningStreak: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TopicProgressSchema = new Schema<ITopicProgress>({
  topic: String,
  queryCount: { type: Number, default: 0 },
  avgScore: { type: Number, default: 0 },
  strength: { type: String, enum: ['weak', 'moderate', 'strong'], default: 'moderate' },
});

const RecommendationSchema = new Schema<IRecommendation>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    weakTopics: [String],
    strongTopics: [String],
    topicProgress: [TopicProgressSchema],
    suggestedTopics: [String],
    revisionPlan: { type: String, default: '' },
    personalizedQuizTopics: [String],
    totalQueries: { type: Number, default: 0 },
    avgQuizScore: { type: Number, default: 0 },
    learningStreak: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
