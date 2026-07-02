import mongoose, { Document, Schema } from 'mongoose';

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId;
  itemType:
    | 'chat'
    | 'note'
    | 'research'
    | 'summary'
    | 'assignment'
    | 'quiz'
    | 'announcement'
    | 'calendar'
    | 'meeting'
    | 'post'
    | 'thread'
    | 'ticket';
  itemId: string;
  title: string;
  category: string;
  isFavorite: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BookmarkSchema = new Schema<IBookmark>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    itemType: {
      type: String,
      enum: [
        'chat',
        'note',
        'research',
        'summary',
        'assignment',
        'quiz',
        'announcement',
        'calendar',
        'meeting',
        'post',
        'thread',
        'ticket',
      ],
      required: true,
    },
    itemId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    isFavorite: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

BookmarkSchema.index({ userId: 1, itemType: 1 });
BookmarkSchema.index({ userId: 1, isFavorite: -1 });

export default mongoose.model<IBookmark>('Bookmark', BookmarkSchema);
