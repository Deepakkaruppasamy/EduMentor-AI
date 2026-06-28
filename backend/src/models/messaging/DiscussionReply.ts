import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscussionReply extends Document {
  discussion: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'emoji';
  attachments: { url: string; filename: string; fileType: string; fileSize: number }[];
  parentReply?: mongoose.Types.ObjectId;
  depth: number;
  mentions: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionReplySchema = new Schema<IDiscussionReply>(
  {
    discussion: { type: Schema.Types.ObjectId, ref: 'MsgDiscussionBoard', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['text', 'image', 'audio', 'file', 'emoji'],
      default: 'text',
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          filename: { type: String, required: true },
          fileType: { type: String, required: true },
          fileSize: { type: Number, required: true },
        },
      ],
      default: [],
    },
    parentReply: { type: Schema.Types.ObjectId, ref: 'MsgDiscussionReply' },
    depth: { type: Number, default: 0 },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

DiscussionReplySchema.index({ discussion: 1, createdAt: 1 });
DiscussionReplySchema.index({ parentReply: 1 });

export default mongoose.model<IDiscussionReply>('MsgDiscussionReply', DiscussionReplySchema);
