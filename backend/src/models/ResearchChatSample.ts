import mongoose, { Document, Schema } from 'mongoose';
import { IManualCorrectnessReview, ICourseCongruencyReview } from './ExpertReview';

export type SampleSourceType = 'CONTROLLED_BENCHMARK' | 'REAL_AI_CHAT';
export type SamplingMethodType = 'MANUAL_SELECTION' | 'RANDOM_STRATIFIED' | 'TARGETED_ERROR_SAMPLE';

export interface IRetrievedSourceSnapshot {
  documentId?: mongoose.Types.ObjectId;
  documentName: string;
  pageNumber?: number;
  chunkId?: string | null;         // null for historical AI Chat
  chunkText: string;
  vectorScore?: number | null;     // null for historical AI Chat
  bm25Score?: number | null;       // null for historical AI Chat
  rrfScore?: number | null;        // maps from source.score
  rank: number;
}

export interface IResearchChatSample extends Document {
  sampleSource: SampleSourceType;           // Always 'REAL_AI_CHAT' for chat samples
  sourceChatId: mongoose.Types.ObjectId;   // Reference to Chat
  sourceMessageId: string;                 // Reference to Message subdocument _id or index

  // Privacy & Blinding
  anonymizedStudentId: string;             // Salted Hash of student ObjectId (e.g. 'anon_std_9a8f...')
  anonymousId: string;                     // UUID for blinded expert review (e.g. 'blind_chat_4k2l...')

  // Context & Content
  course: mongoose.Types.ObjectId;
  courseName: string;
  question: string;
  generatedAnswer: string;
  timestamp: Date;

  // Metadata Instrumentation
  llmModel: string | null;                    // 'llama-3.3-70b-versatile' or null if unrecorded
  language: string | null;                 // User preferredLanguage or null
  explanationMode: string | null;          // 'standard', 'simply', 'detail', etc.

  // Retrieved Sources Snapshot
  retrievedSources: IRetrievedSourceSnapshot[];

  // Baseline EduMentor Predictions
  originalTrustScore: number | null;       // 0–100
  sourceAlignmentScore: number | null;     // 0.0–1.0 (originalTrustScore / 100)
  confidenceScore: number | null;
  hallucinationFlags: string[];
  sentenceAnalysis: any[] | null;          // null for historical chat

  // Latency Instrumentation (null for historical chat)
  retrievalLatencyMs: number | null;
  generationLatencyMs: number | null;
  totalLatencyMs: number | null;

  // Token Instrumentation (null for historical chat)
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;

  // Quality & Filtering
  eligibleForResearch: boolean;            // false for greetings, empty, test messages
  exclusionReason: string | null;          // e.g. 'Off-topic refusal', 'Greeting / non-academic'

  // Sampling Strategy
  samplingMethod: SamplingMethodType;
  randomSeed: number | null;
  samplingDate: Date;

  // Expert Ground Truth (Reusing existing sub-schemas from ExpertReview.ts)
  correctnessReviews: IManualCorrectnessReview[];
  congruencyReviews: ICourseCongruencyReview[];

  // Review Status
  status: 'imported' | 'under_review' | 'completed';

  createdAt: Date;
  updatedAt: Date;
}

const RetrievedSourceSnapshotSchema = new Schema<IRetrievedSourceSnapshot>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String, required: true },
    pageNumber: { type: Number },
    chunkId: { type: String, default: null },
    chunkText: { type: String, required: true },
    vectorScore: { type: Number, default: null },
    bm25Score: { type: Number, default: null },
    rrfScore: { type: Number, default: null },
    rank: { type: Number, required: true },
  },
  { _id: false }
);

const ManualCorrectnessReviewSchema = new Schema<IManualCorrectnessReview>(
  {
    expertId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedAt: { type: Date },
    correctnessRating: { type: Number, enum: [1, 2, 3, 4, 5] },
    factuallyCorrect: { type: Boolean },
    containsMajorError: { type: Boolean },
    errorCategories: [{ type: String }],
    comments: { type: String, trim: true },
  },
  { _id: false }
);

const CourseCongruencyReviewSchema = new Schema<ICourseCongruencyReview>(
  {
    expertId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedAt: { type: Date },
    courseCongruencyRating: { type: Number, enum: [1, 2, 3, 4, 5] },
    supportedByCourseMaterial: { type: Boolean },
    containsUnsupportedClaims: { type: Boolean },
    citationSupportsClaim: { type: Schema.Types.Mixed }, // bool | 'not_applicable'
    comments: { type: String, trim: true },
  },
  { _id: false }
);

const ResearchChatSampleSchema = new Schema<IResearchChatSample>(
  {
    sampleSource: {
      type: String,
      enum: ['CONTROLLED_BENCHMARK', 'REAL_AI_CHAT'],
      default: 'REAL_AI_CHAT',
      required: true,
    },
    sourceChatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    sourceMessageId: { type: String, required: true },
    anonymizedStudentId: { type: String, required: true },
    anonymousId: { type: String, required: true, unique: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    question: { type: String, required: true },
    generatedAnswer: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },

    llmModel: { type: String, default: null },
    language: { type: String, default: null },
    explanationMode: { type: String, default: null },

    retrievedSources: { type: [RetrievedSourceSnapshotSchema], default: [] },

    originalTrustScore: { type: Number, default: null },
    sourceAlignmentScore: { type: Number, default: null },
    confidenceScore: { type: Number, default: null },
    hallucinationFlags: [{ type: String }],
    sentenceAnalysis: { type: Schema.Types.Mixed, default: null },

    retrievalLatencyMs: { type: Number, default: null },
    generationLatencyMs: { type: Number, default: null },
    totalLatencyMs: { type: Number, default: null },

    promptTokens: { type: Number, default: null },
    completionTokens: { type: Number, default: null },
    totalTokens: { type: Number, default: null },

    eligibleForResearch: { type: Boolean, default: true },
    exclusionReason: { type: String, default: null },

    samplingMethod: {
      type: String,
      enum: ['MANUAL_SELECTION', 'RANDOM_STRATIFIED', 'TARGETED_ERROR_SAMPLE'],
      default: 'MANUAL_SELECTION',
    },
    randomSeed: { type: Number, default: null },
    samplingDate: { type: Date, default: Date.now },

    correctnessReviews: { type: [ManualCorrectnessReviewSchema], default: [] },
    congruencyReviews: { type: [CourseCongruencyReviewSchema], default: [] },

    status: {
      type: String,
      enum: ['imported', 'under_review', 'completed'],
      default: 'imported',
    },
  },
  { timestamps: true }
);

ResearchChatSampleSchema.index({ sourceChatId: 1, sourceMessageId: 1 }, { unique: true });
ResearchChatSampleSchema.index({ anonymousId: 1 }, { unique: true });
ResearchChatSampleSchema.index({ sampleSource: 1, course: 1 });
ResearchChatSampleSchema.index({ eligibleForResearch: 1 });
ResearchChatSampleSchema.index({ status: 1 });

export default mongoose.model<IResearchChatSample>('ResearchChatSample', ResearchChatSampleSchema);
