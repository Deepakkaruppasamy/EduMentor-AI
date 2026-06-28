import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportNotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: 'ticket_created' | 'ticket_updated' | 'ticket_assigned' | 'ticket_resolved' | 'admin_reply' | 'feedback_requested';
  title: string;
  body: string;
  relatedTicket?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const SupportNotificationSchema = new Schema<ISupportNotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_resolved', 'admin_reply', 'feedback_requested'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    relatedTicket: { type: Schema.Types.ObjectId, ref: 'SupportTicket' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SupportNotificationSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model<ISupportNotification>('SupportNotification', SupportNotificationSchema);
