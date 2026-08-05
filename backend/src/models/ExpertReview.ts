import mongoose, { Document, Schema } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval Result (for Evaluation 6 — stored per experiment run)
// ─────────────────────────────────────────────────────────────────────────────
export interface IRetrievedEvidenceRecord {
  chunkId: string;
  documentName: string;
  pageNumber?: number;
  chunkText: string;
  vectorScore: number;    // cosine similarity (0–1), 0 if BM25-only mode
  bm25Score: number;      // TF-IDF score, 0 if vector-only mode
  finalScore: number;     // RRF score or raw score depending on mode
  rank: number;           // final rank in retrieved list
}

// ─────────────────────────────────────────────────────────────────────────────
// Expert Review — Evaluation 2 (Manual Correctness)
// ─────────────────────────────────────────────────────────────────────────────
export interface IManualCorrectnessReview {
  expertId: mongoose.Types.ObjectId;
  reviewedAt?: Date;

  // Correctness scale: 1 = Completely Incorrect ... 5 = Completely Correct
  correctnessRating?: 1 | 2 | 3 | 4 | 5;
  factuallyCorrect?: boolean;       // Binary for confusion matrix
  containsMajorError?: boolean;
  errorCategories?: string[];       // e.g. ["factual_error", "omission", "hallucination"]
  comments?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Expert Review — Evaluation 4 (Course-Content Congruency)
// ─────────────────────────────────────────────────────────────────────────────
export interface ICourseCongruencyReview {
  expertId: mongoose.Types.ObjectId;
  reviewedAt?: Date;

  // Congruency scale: 1 = Contradicts course material ... 5 = Fully aligned
  courseCongruencyRating?: 1 | 2 | 3 | 4 | 5;
  supportedByCourseMaterial?: boolean;
  containsUnsupportedClaims?: boolean;
  citationSupportsClaim?: boolean | 'not_applicable';
  comments?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval Ground Truth Match — Evaluation 6
// Expert judges whether each retrieved chunk matches the ground truth.
// ─────────────────────────────────────────────────────────────────────────────
export interface IRetrievalGroundTruthMatch {
  chunkId: string;
  documentName: string;
  rank: number;
  isRelevant: boolean;  // Expert confirms if this chunk is relevant to the question
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed IR Metrics — Evaluation 6
// Computed automatically from retrieved results vs ground truth sources.
// ─────────────────────────────────────────────────────────────────────────────
export interface IIRMetrics {
  precisionAt1: number;
  precisionAt3: number;
  precisionAt5: number;
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  hitRateAt1: number;
  hitRateAt3: number;
  hitRateAt5: number;
  mrr: number;         // Mean Reciprocal Rank (first relevant result)
  ndcgAt1: number;
  ndcgAt3: number;
  ndcgAt5: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Computed Performance Metrics — Evaluation 5
// Instrumented during the experiment run.
// ─────────────────────────────────────────────────────────────────────────────
export interface IPerformanceMetrics {
  retrievalLatencyMs: number;   // Time for hybridRetrieve / vectorSearch / bm25Search
  generationLatencyMs: number;  // Time for generateResponse()
  totalLatencyMs: number;       // retrievalLatencyMs + generationLatencyMs
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  embeddingCallCount: number;   // How many HF embedding API calls were made
  llmCallCount: number;         // 1 for normal, 0 for LLM_ONLY if retrieval skipped
  // Cost fields (null if provider pricing unavailable)
  estimatedCostUSD?: number;
  costProvider?: string;
  costModel?: string;
  costPricingVersion?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hallucination Detection Record — Evaluation 3
// Auto-computed by detectHallucination() during experiment run.
// Must be validated against human labels (ManualCorrectnessReview).
// ─────────────────────────────────────────────────────────────────────────────
export interface IHallucinationDetectionRecord {
  trustScore: number;                      // 0–100
  status: 'verified' | 'partially_verified' | 'hallucinated';
  hallucinatedSentences: string[];
  supportedSentences: string[];
  threshold: number;                       // HALLUCINATION_THRESHOLD used at run time
  // Confusion matrix values (populated after human labels are collected):
  // Positive class = UNSUPPORTED
  tp?: number;  // auto says unsupported AND expert says unsupported
  fp?: number;  // auto says unsupported BUT expert says supported
  tn?: number;  // auto says supported AND expert says supported
  fn?: number;  // auto says supported BUT expert says unsupported
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Expert Review Document
// One record per (benchmarkQuestion × retrievalConfiguration × expertRole).
// ─────────────────────────────────────────────────────────────────────────────
export type RetrievalConfiguration =
  | 'HYBRID_RRF'
  | 'VECTOR_ONLY'
  | 'BM25_ONLY'
  | 'LLM_ONLY';

export interface IExpertReview extends Document {
  benchmarkQuestion: mongoose.Types.ObjectId;

  // Blinding: experts see only the anonymousId, not the configuration
  anonymousId: string;
  configuration: RetrievalConfiguration;

  // Generated answer for this question under this configuration
  generatedAnswer?: string;

  // Retrieved evidence (empty for LLM_ONLY)
  retrievedEvidence?: IRetrievedEvidenceRecord[];

  // Computed IR metrics (populated automatically, Evaluation 6)
  irMetrics?: IIRMetrics;

  // Hallucination detection result (populated automatically, Evaluation 3)
  hallucinationDetection?: IHallucinationDetectionRecord;

  // Performance instrumentation (Evaluation 5)
  performance?: IPerformanceMetrics;

  // Expert manual correctness reviews (Evaluation 2)
  // Array supports multiple independent experts
  correctnessReviews?: IManualCorrectnessReview[];

  // Expert course-congruency reviews (Evaluation 4)
  congruencyReviews?: ICourseCongruencyReview[];

  // Status tracking
  status?: 'pending_generation' | 'generated' | 'under_review' | 'completed';
  generatedAt?: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}


// ─────────────────────────────────────────────────────────────────────────────
// Sub-schemas
// ─────────────────────────────────────────────────────────────────────────────
const RetrievedEvidenceSchema = new Schema<IRetrievedEvidenceRecord>(
  {
    chunkId: { type: String },
    documentName: { type: String },
    pageNumber: { type: Number },
    chunkText: { type: String },
    vectorScore: { type: Number, default: 0 },
    bm25Score: { type: Number, default: 0 },
    finalScore: { type: Number, default: 0 },
    rank: { type: Number },
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

const IRMetricsSchema = new Schema<IIRMetrics>(
  {
    precisionAt1: { type: Number, default: 0 },
    precisionAt3: { type: Number, default: 0 },
    precisionAt5: { type: Number, default: 0 },
    recallAt1: { type: Number, default: 0 },
    recallAt3: { type: Number, default: 0 },
    recallAt5: { type: Number, default: 0 },
    hitRateAt1: { type: Number, default: 0 },
    hitRateAt3: { type: Number, default: 0 },
    hitRateAt5: { type: Number, default: 0 },
    mrr: { type: Number, default: 0 },
    ndcgAt1: { type: Number, default: 0 },
    ndcgAt3: { type: Number, default: 0 },
    ndcgAt5: { type: Number, default: 0 },
  },
  { _id: false }
);

const HallucinationDetectionSchema = new Schema<IHallucinationDetectionRecord>(
  {
    trustScore: { type: Number },
    status: { type: String, enum: ['verified', 'partially_verified', 'hallucinated'] },
    hallucinatedSentences: [{ type: String }],
    supportedSentences: [{ type: String }],
    threshold: { type: Number },
    tp: { type: Number },
    fp: { type: Number },
    tn: { type: Number },
    fn: { type: Number },
  },
  { _id: false }
);

const PerformanceMetricsSchema = new Schema<IPerformanceMetrics>(
  {
    retrievalLatencyMs: { type: Number, default: 0 },
    generationLatencyMs: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    embeddingCallCount: { type: Number, default: 0 },
    llmCallCount: { type: Number, default: 0 },
    estimatedCostUSD: { type: Number },
    costProvider: { type: String },
    costModel: { type: String },
    costPricingVersion: { type: String },
  },
  { _id: false }
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Schema
// ─────────────────────────────────────────────────────────────────────────────
const ExpertReviewSchema = new Schema<IExpertReview>(
  {
    benchmarkQuestion: {
      type: Schema.Types.ObjectId,
      ref: 'ResearchBenchmarkQuestion',
      required: true,
    },
    anonymousId: {
      type: String,
      required: true,
      unique: true,
      // e.g. "RVW-0042-A" — random enough to blind but stable for lookup
    },
    configuration: {
      type: String,
      enum: ['HYBRID_RRF', 'VECTOR_ONLY', 'BM25_ONLY', 'LLM_ONLY'],
      required: true,
    },
    generatedAnswer: { type: String, default: '' },
    retrievedEvidence: { type: [RetrievedEvidenceSchema], default: [] },
    irMetrics: { type: IRMetricsSchema },
    hallucinationDetection: { type: HallucinationDetectionSchema },
    performance: { type: PerformanceMetricsSchema },
    correctnessReviews: { type: [ManualCorrectnessReviewSchema], default: [] },
    congruencyReviews: { type: [CourseCongruencyReviewSchema], default: [] },
    status: {
      type: String,
      enum: ['pending_generation', 'generated', 'under_review', 'completed'],
      default: 'pending_generation',
    },
    generatedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index: one record per (question × configuration)
ExpertReviewSchema.index({ benchmarkQuestion: 1, configuration: 1 }, { unique: true });
ExpertReviewSchema.index({ status: 1 });
ExpertReviewSchema.index({ anonymousId: 1 }, { unique: true });

export default mongoose.model<IExpertReview>('ExpertReview', ExpertReviewSchema);
