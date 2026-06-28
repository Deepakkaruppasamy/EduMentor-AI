import mongoose, { Document, Schema } from 'mongoose';

export type AnnouncementType = 'General' | 'Academic' | 'Placement' | 'Event' | 'Emergency';
export type AnnouncementPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface IAttachment {
  filename: string;
  originalName: string;
  filePath: string;
  mimeType: string;
}

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  targetRoles: string[]; // ['student', 'faculty', 'admin']
  createdBy: mongoose.Types.ObjectId;
  attachments: IAttachment[];
  scheduledAt?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['General', 'Academic', 'Placement', 'Event', 'Emergency'],
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    targetRoles: { type: [String], default: ['student', 'faculty', 'admin'] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: { type: [AttachmentSchema], default: [] },
    scheduledAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ isActive: 1, createdAt: -1 });
AnnouncementSchema.index({ type: 1, priority: 1 });
AnnouncementSchema.index({ title: 'text', content: 'text' });

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
