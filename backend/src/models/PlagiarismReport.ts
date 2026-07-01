import mongoose, { Schema, Document } from 'mongoose';

export interface IHighlightedSection {
  text: string;
  startIndex: number;
  endIndex: number;
  similarityPercent: number;
  reason?: string;
}

export interface ICitationAnalysis {
  missingCitations: string[];
  incorrectReferences: string[];
  duplicateReferences: string[];
  formattingIssues: string[];
}

export interface IPlagiarismReport extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentText: string;
  similarityScore: number;
  originalityScore: number;
  riskLevel: 'low' | 'moderate' | 'high';
  highlightedSections: IHighlightedSection[];
  aiSuggestions: string[];
  citationAnalysis: ICitationAnalysis;
  wordCount: number;
  pageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const HighlightedSectionSchema = new Schema<IHighlightedSection>({
  text: { type: String, required: true },
  startIndex: { type: Number, default: 0 },
  endIndex: { type: Number, default: 0 },
  similarityPercent: { type: Number, required: true },
  reason: { type: String },
});

const CitationAnalysisSchema = new Schema<ICitationAnalysis>({
  missingCitations: [{ type: String }],
  incorrectReferences: [{ type: String }],
  duplicateReferences: [{ type: String }],
  formattingIssues: [{ type: String }],
});

const PlagiarismReportSchema = new Schema<IPlagiarismReport>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    documentText: { type: String, required: true },
    similarityScore: { type: Number, required: true, min: 0, max: 100 },
    originalityScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      required: true,
    },
    highlightedSections: [HighlightedSectionSchema],
    aiSuggestions: [{ type: String }],
    citationAnalysis: { type: CitationAnalysisSchema, default: () => ({}) },
    wordCount: { type: Number, default: 0 },
    pageCount: { type: Number },
  },
  { timestamps: true }
);

// Index for fast user-specific queries and analytics
PlagiarismReportSchema.index({ userId: 1, createdAt: -1 });
PlagiarismReportSchema.index({ riskLevel: 1 });
PlagiarismReportSchema.index({ createdAt: -1 });

export default mongoose.model<IPlagiarismReport>('PlagiarismReport', PlagiarismReportSchema);
