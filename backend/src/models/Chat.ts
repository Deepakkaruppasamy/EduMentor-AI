import mongoose, { Document, Schema } from 'mongoose';

export interface ISource {
  documentId: mongoose.Types.ObjectId;
  documentName: string;
  chunkText: string;
  pageNumber?: number;
  score: number;
}

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ISource[];
  trustScore?: number;
  confidenceScore?: number;
  hallucinationFlags?: string[];
  timestamp: Date;
}

export interface IChat extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  messages: IChatMessage[];
  totalMessages: number;
  createdAt: Date;
  updatedAt: Date;
}

const SourceSchema = new Schema<ISource>({
  documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
  documentName: { type: String },
  chunkText: { type: String },
  pageNumber: { type: Number },
  score: { type: Number },
});

const ChatMessageSchema = new Schema<IChatMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  sources: [SourceSchema],
  trustScore: { type: Number },
  confidenceScore: { type: Number },
  hallucinationFlags: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new Schema<IChat>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, default: 'New Conversation' },
    messages: [ChatMessageSchema],
    totalMessages: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IChat>('Chat', ChatSchema);
