import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportAnnouncement extends Document {
  title: string;
  content: string;
  targetRole: 'all' | 'student' | 'faculty';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupportAnnouncementSchema = new Schema<ISupportAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    targetRole: {
      type: String,
      enum: ['all', 'student', 'faculty'],
      default: 'all',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISupportAnnouncement>('SupportAnnouncement', SupportAnnouncementSchema);
