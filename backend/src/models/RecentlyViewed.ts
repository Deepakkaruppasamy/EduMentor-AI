import mongoose, { Document, Schema } from 'mongoose';

export interface IRecentlyViewed extends Document {
  userId: mongoose.Types.ObjectId;
  itemType:
    | 'course'
    | 'lecture'
    | 'chat'
    | 'note'
    | 'research'
    | 'assignment'
    | 'quiz'
    | 'announcement'
    | 'calendar'
    | 'faculty'
    | 'ticket';
  itemId: string;
  title: string;
  url: string;
  isPinned: boolean;
  viewedAt: Date;
}

const RecentlyViewedSchema = new Schema<IRecentlyViewed>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: {
      type: String,
      enum: [
        'course',
        'lecture',
        'chat',
        'note',
        'research',
        'assignment',
        'quiz',
        'announcement',
        'calendar',
        'faculty',
        'ticket',
      ],
      required: true,
    },
    itemId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

RecentlyViewedSchema.index({ userId: 1, viewedAt: -1 });
RecentlyViewedSchema.index({ userId: 1, itemType: 1 });

export default mongoose.model<IRecentlyViewed>('RecentlyViewed', RecentlyViewedSchema);
