import mongoose, { Schema, Document } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// SpacedRepetition MongoDB Model
//
// Persists the Ebbinghaus memory model state per student per course.
// Stores per-concept memory strength (S_k), last review date, review count,
// and computed next review date for the spaced repetition schedule.
// ─────────────────────────────────────────────────────────────────────────────

export interface IConceptMemory {
  concept: string;
  memoryStrength: number;        // S_k — Ebbinghaus strength parameter (days)
  lastReviewedAt: Date;
  reviewCount: number;
  lastAccuracy: number;          // A_k ∈ [0,1] — accuracy at last review
  retentionAtLastReview: number; // R(t) at time of last review
  nextReviewDate: Date;          // Scheduled next review date
}

export interface ISpacedRepetition extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  concepts: IConceptMemory[];
  lastUpdated: Date;
}

const ConceptMemorySchema = new Schema<IConceptMemory>(
  {
    concept: { type: String, required: true, index: true },
    memoryStrength: { type: Number, required: true, default: 1.5 },
    lastReviewedAt: { type: Date, required: true, default: Date.now },
    reviewCount: { type: Number, default: 1 },
    lastAccuracy: { type: Number, default: 0.5, min: 0, max: 1 },
    retentionAtLastReview: { type: Number, default: 1.0, min: 0, max: 1 },
    nextReviewDate: { type: Date, required: true },
  },
  { _id: false }
);

const SpacedRepetitionSchema = new Schema<ISpacedRepetition>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    concepts: [ConceptMemorySchema],
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'spacedrepetitions',
  }
);

// Compound index for efficient per-student-per-course lookups
SpacedRepetitionSchema.index({ student: 1, course: 1 }, { unique: true });

const SpacedRepetition = mongoose.model<ISpacedRepetition>('SpacedRepetition', SpacedRepetitionSchema);

export default SpacedRepetition;
