import mongoose, { Document, Schema } from 'mongoose';

export const SUPPORT_CATEGORIES = [
  'Login Issues',
  'Password Reset',
  'OTP Problems',
  'Course Access',
  'AI Chatbot Issues',
  'Assignment Evaluation',
  'Quiz Problems',
  'Payment Issues',
  'File Upload Issues',
  'Technical Issues',
  'Account Issues',
  'Feature Requests',
  'General Feedback',
  'Other',
] as const;

export type SupportCategory = typeof SUPPORT_CATEGORIES[number];

export const TICKET_STATUSES = [
  'Open',
  'In Progress',
  'Waiting for User',
  'Resolved',
  'Closed',
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical',
] as const;

export type TicketPriority = typeof TICKET_PRIORITIES[number];

export interface ISupportTicket extends Document {
  ticketId: string;
  user: mongoose.Types.ObjectId;
  subject: string;
  description: string;
  category: SupportCategory;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: SUPPORT_CATEGORIES,
      default: 'Technical Issues',
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'Open',
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'Medium',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ user: 1 });
SupportTicketSchema.index({ status: 1 });
SupportTicketSchema.index({ priority: 1 });
SupportTicketSchema.index({ ticketId: 1 });

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
