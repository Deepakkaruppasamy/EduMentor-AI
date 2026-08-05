import mongoose, { Document, Schema } from 'mongoose';

export type RetrievalConfigName = 'HYBRID_RRF' | 'VECTOR_ONLY' | 'BM25_ONLY' | 'LLM_ONLY';

export interface IResearchExperimentRun extends Document {
  experimentId: string;           // e.g. "EXP-2025-001"
  name: string;
  description?: string;
  course: mongoose.Types.ObjectId;
  datasetVersion?: string;
  datasetSplit?: 'development' | 'validation' | 'final_test';
  configurations?: string[];
  model?: string;                  // e.g. "llama-3.3-70b-versatile"
  embeddingModel?: string;         // e.g. "all-MiniLM-L6-v2"
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  chunkSize?: number;
  chunkOverlap?: number;
  sourceAlignmentThreshold?: number;
  randomSeed?: number;
  gitCommitHash?: string;
  status?: 'draft' | 'running' | 'completed' | 'failed';
  isImmutable?: boolean;           // True once completed to prevent accidental overwrites
  createdBy: mongoose.Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchExperimentRunSchema = new Schema<IResearchExperimentRun>(
  {
    experimentId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    datasetVersion: { type: String, default: '1.0.0' },
    datasetSplit: {
      type: String,
      enum: ['development', 'validation', 'final_test'],
      default: 'development',
    },
    configurations: [{
      type: String,
      enum: ['HYBRID_RRF', 'VECTOR_ONLY', 'BM25_ONLY', 'LLM_ONLY'],
    }],
    model: { type: String, default: 'llama-3.3-70b-versatile' },
    embeddingModel: { type: String, default: 'all-MiniLM-L6-v2' },
    temperature: { type: Number, default: 0.3 },
    maxTokens: { type: Number, default: 2048 },
    topK: { type: Number, default: 5 },
    chunkSize: { type: Number, default: 512 },
    chunkOverlap: { type: Number, default: 50 },
    sourceAlignmentThreshold: { type: Number, default: 0.4 },
    randomSeed: { type: Number, default: 42 },
    gitCommitHash: { type: String, default: '4a2281a' },
    status: {
      type: String,
      enum: ['draft', 'running', 'completed', 'failed'],
      default: 'draft',
    },
    isImmutable: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

ResearchExperimentRunSchema.index({ experimentId: 1 }, { unique: true });
ResearchExperimentRunSchema.index({ datasetSplit: 1 });
ResearchExperimentRunSchema.index({ status: 1 });

export default mongoose.model<IResearchExperimentRun>(
  'ResearchExperimentRun',
  ResearchExperimentRunSchema
);
