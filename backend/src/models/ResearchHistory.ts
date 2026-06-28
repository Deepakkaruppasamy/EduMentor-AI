import mongoose, { Document, Schema } from 'mongoose';

export type ResearchFeature =
  | 'Summarize'
  | 'Explain'
  | 'Compare'
  | 'LiteratureReview'
  | 'IEEECitation'
  | 'APACitation'
  | 'MLACitation'
  | 'ExplainFigures'
  | 'ExplainTables'
  | 'Contributions'
  | 'FutureScope'
  | 'PresentationPoints';

export interface IResearchPaper {
  filename: string;
  originalName: string;
  filePath: string;
  extractedText: string;
  uploadedAt: Date;
}

export interface IResearchHistory extends Document {
  user: mongoose.Types.ObjectId;
  papers: IResearchPaper[];
  feature: ResearchFeature;
  result: string; // markdown
  createdAt: Date;
}

const ResearchPaperSchema = new Schema<IResearchPaper>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    extractedText: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ResearchHistorySchema = new Schema<IResearchHistory>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    papers: { type: [ResearchPaperSchema], default: [] },
    feature: {
      type: String,
      enum: [
        'Summarize', 'Explain', 'Compare', 'LiteratureReview',
        'IEEECitation', 'APACitation', 'MLACitation',
        'ExplainFigures', 'ExplainTables', 'Contributions',
        'FutureScope', 'PresentationPoints',
      ],
      required: true,
    },
    result: { type: String, required: true },
  },
  { timestamps: true }
);

ResearchHistorySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model<IResearchHistory>('ResearchHistory', ResearchHistorySchema);
