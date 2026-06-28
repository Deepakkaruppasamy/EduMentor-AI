import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportMessage extends Document {
  ticket: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId; // null if sent by AI Support Bot
  senderName: string;
  role: 'student' | 'faculty' | 'admin' | 'system' | 'ai';
  content: string;
  createdAt: Date;
}

const SupportMessageSchema = new Schema<ISupportMessage>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, required: true },
    role: { type: String, enum: ['student', 'faculty', 'admin', 'system', 'ai'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

SupportMessageSchema.index({ ticket: 1, createdAt: 1 });

export default mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);
