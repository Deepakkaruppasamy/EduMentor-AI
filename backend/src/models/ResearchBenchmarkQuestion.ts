import mongoose, { Document, Schema } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Ground Truth Source
// Used in Evaluation 6 (Hybrid RAG) — each chunk the expert identifies as
// containing the correct answer to the benchmark question.
// ─────────────────────────────────────────────────────────────────────────────
export interface IGroundTruthSource {
  documentId?: mongoose.Types.ObjectId;
  documentName: string;
  pageNumber?: number;
  chunkId?: string;         // ChromaDB chunk ID if known
  supportingText: string;   // Excerpt that directly answers the question
  relevanceGrade: 1 | 2 | 3; // 1=marginally relevant, 2=relevant, 3=highly relevant
}

// ─────────────────────────────────────────────────────────────────────────────
// Research Benchmark Question
// Expert-verified questions used as ground truth for all 6 evaluations.
// ─────────────────────────────────────────────────────────────────────────────
export interface IResearchBenchmarkQuestion extends Document {
  question: string;
  referenceAnswer: string;      // Gold-standard answer written by expert
  course: mongoose.Types.ObjectId;
  courseName: string;           // Denormalized for display
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'factual' | 'conceptual' | 'applied' | 'evaluative';
  groundTruthSources: IGroundTruthSource[];
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  notes?: string;               // Expert's private notes about this question
  createdAt: Date;
  updatedAt: Date;
}

const GroundTruthSourceSchema = new Schema<IGroundTruthSource>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    documentName: { type: String, required: true },
    pageNumber: { type: Number },
    chunkId: { type: String },
    supportingText: { type: String, required: true, trim: true },
    relevanceGrade: { type: Number, enum: [1, 2, 3], default: 3 },
  },
  { _id: false }
);

const ResearchBenchmarkQuestionSchema = new Schema<IResearchBenchmarkQuestion>(
  {
    question: { type: String, required: true, trim: true },
    referenceAnswer: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    courseName: { type: String, required: true },
    topic: { type: String, required: true, trim: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true,
    },
    questionType: {
      type: String,
      enum: ['factual', 'conceptual', 'applied', 'evaluative'],
      required: true,
    },
    groundTruthSources: {
      type: [GroundTruthSourceSchema],
      default: [],
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

ResearchBenchmarkQuestionSchema.index({ course: 1, isActive: 1 });
ResearchBenchmarkQuestionSchema.index({ topic: 1 });
ResearchBenchmarkQuestionSchema.index({ difficulty: 1, questionType: 1 });

export default mongoose.model<IResearchBenchmarkQuestion>(
  'ResearchBenchmarkQuestion',
  ResearchBenchmarkQuestionSchema
);
