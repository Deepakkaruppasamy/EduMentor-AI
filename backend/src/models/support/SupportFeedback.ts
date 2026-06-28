import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportFeedback extends Document {
  ticket: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Not Resolved';
  comments?: string;
  createdAt: Date;
}

const SupportFeedbackSchema = new Schema<ISupportFeedback>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: String,
      enum: ['Excellent', 'Good', 'Average', 'Poor', 'Not Resolved'],
      required: true,
    },
    comments: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<ISupportFeedback>('SupportFeedback', SupportFeedbackSchema);
