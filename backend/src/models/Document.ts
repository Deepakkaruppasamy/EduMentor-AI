import mongoose, { Document, Schema } from 'mongoose';

export interface IChunk {
  index: number;
  text: string;
  pageNumber?: number;
  embedding?: number[];
  chromaId?: string;
}

export interface IDocument extends Document {
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'docx' | 'pptx' | 'txt';
  filePath: string;
  fileSize: number;
  course: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  chunks: IChunk[];
  totalChunks: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  summary?: string;
  conceptMap?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChunkSchema = new Schema<IChunk>({
  index: { type: Number, required: true },
  text: { type: String, required: true },
  pageNumber: { type: Number },
  chromaId: { type: String },
});

const DocumentSchema = new Schema<IDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'pptx', 'txt'], required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chunks: [ChunkSchema],
    totalChunks: { type: Number, default: 0 },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    processingError: { type: String },
    summary: { type: String },
    conceptMap: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
