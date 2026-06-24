import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicCount {
  topic: string;
  count: number;
}

export interface IAnalytics extends Document {
  date: Date;
  course?: mongoose.Types.ObjectId;
  totalQueries: number;
  uniqueUsers: number;
  hallucinationCount: number;
  hallucinationRate: number;
  avgTrustScore: number;
  avgResponseTime: number;
  topTopics: ITopicCount[];
  totalDocumentsUploaded: number;
  totalQuizzesGenerated: number;
  avgQuizScore: number;
  retrievalAccuracy: number;
  createdAt: Date;
  updatedAt: Date;
}

const TopicCountSchema = new Schema<ITopicCount>({
  topic: String,
  count: { type: Number, default: 0 },
});

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    date: { type: Date, required: true, default: Date.now },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    totalQueries: { type: Number, default: 0 },
    uniqueUsers: { type: Number, default: 0 },
    hallucinationCount: { type: Number, default: 0 },
    hallucinationRate: { type: Number, default: 0 },
    avgTrustScore: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    topTopics: [TopicCountSchema],
    totalDocumentsUploaded: { type: Number, default: 0 },
    totalQuizzesGenerated: { type: Number, default: 0 },
    avgQuizScore: { type: Number, default: 0 },
    retrievalAccuracy: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);
