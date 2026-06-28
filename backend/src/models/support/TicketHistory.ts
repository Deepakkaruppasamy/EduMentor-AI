import mongoose, { Document, Schema } from 'mongoose';

export interface ITicketHistory extends Document {
  ticket: mongoose.Types.ObjectId;
  changedBy: mongoose.Types.ObjectId;
  changedByName: string;
  field: 'status' | 'priority' | 'assignedTo';
  oldValue: string;
  newValue: string;
  createdAt: Date;
}

const TicketHistorySchema = new Schema<ITicketHistory>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByName: { type: String, required: true },
    field: { type: String, enum: ['status', 'priority', 'assignedTo'], required: true },
    oldValue: { type: String, required: true },
    newValue: { type: String, required: true },
  },
  { timestamps: true }
);

TicketHistorySchema.index({ ticket: 1, createdAt: -1 });

export default mongoose.model<ITicketHistory>('TicketHistory', TicketHistorySchema);
