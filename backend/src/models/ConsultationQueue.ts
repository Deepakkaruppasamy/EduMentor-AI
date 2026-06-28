import mongoose, { Document, Schema } from 'mongoose';

export interface IConsultationQueue extends Document {
  faculty: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  position: number;
  status: 'Waiting' | 'Called' | 'Done' | 'Left';
  joinedAt: Date;
}

const ConsultationQueueSchema = new Schema<IConsultationQueue>(
  {
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    position: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Waiting', 'Called', 'Done', 'Left'],
      default: 'Waiting',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConsultationQueueSchema.index({ faculty: 1, status: 1, position: 1 });

export default mongoose.model<IConsultationQueue>('ConsultationQueue', ConsultationQueueSchema);
