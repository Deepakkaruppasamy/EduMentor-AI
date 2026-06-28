import mongoose, { Document, Schema } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'private_message',
  'public_reply',
  'faculty_replied',
  'student_replied',
  'mention',
  'discussion_resolved',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface IMessagingNotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  relatedConversation?: mongoose.Types.ObjectId;
  relatedDiscussion?: mongoose.Types.ObjectId;
  relatedMessage?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessagingNotificationSchema = new Schema<IMessagingNotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    relatedConversation: { type: Schema.Types.ObjectId, ref: 'MsgConversation' },
    relatedDiscussion: { type: Schema.Types.ObjectId, ref: 'MsgDiscussionBoard' },
    relatedMessage: { type: Schema.Types.ObjectId, ref: 'MsgMessage' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessagingNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<IMessagingNotification>('MsgNotification', MessagingNotificationSchema);
