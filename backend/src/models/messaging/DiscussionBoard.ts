import mongoose, { Document, Schema } from 'mongoose';

export const DISCUSSION_CATEGORIES = [
  'General Questions',
  'Assignments',
  'Exams',
  'Lab',
  'Course Materials',
  'Announcements',
] as const;

export type DiscussionCategory = typeof DISCUSSION_CATEGORIES[number];

export interface IDiscussionBoard extends Document {
  course: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: DiscussionCategory;
  isResolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  replyCount: number;
  lastReplyAt?: Date;
  mentions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionBoardSchema = new Schema<IDiscussionBoard>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: DISCUSSION_CATEGORIES,
      default: 'General Questions',
    },
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    replyCount: { type: Number, default: 0 },
    lastReplyAt: { type: Date },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

DiscussionBoardSchema.index({ course: 1, category: 1 });
DiscussionBoardSchema.index({ course: 1, createdAt: -1 });
DiscussionBoardSchema.index({ title: 'text', content: 'text' });

export default mongoose.model<IDiscussionBoard>('MsgDiscussionBoard', DiscussionBoardSchema);
