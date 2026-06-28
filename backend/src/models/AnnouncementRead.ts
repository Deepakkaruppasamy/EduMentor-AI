import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncementRead extends Document {
  announcement: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  isBookmarked: boolean;
  readAt: Date;
}

const AnnouncementReadSchema = new Schema<IAnnouncementRead>(
  {
    announcement: { type: Schema.Types.ObjectId, ref: 'Announcement', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isBookmarked: { type: Boolean, default: false },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AnnouncementReadSchema.index({ announcement: 1, user: 1 }, { unique: true });
AnnouncementReadSchema.index({ user: 1, isBookmarked: 1 });

export default mongoose.model<IAnnouncementRead>('AnnouncementRead', AnnouncementReadSchema);
