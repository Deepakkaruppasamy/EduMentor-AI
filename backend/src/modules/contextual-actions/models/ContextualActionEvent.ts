import mongoose, { Schema, Document } from 'mongoose';

export interface IContextualActionEvent extends Document {
  userId: mongoose.Types.ObjectId;
  actionId: string;
  module: string;
  contentType?: string;
  contentId?: string;
  courseId?: string;
  status: 'success' | 'failed';
  latency: number; // millisecond duration
  selectedTextLength: number;
  deviceCategory: 'mobile' | 'tablet' | 'desktop';
  createdAt: Date;
}

const ContextualActionEventSchema = new Schema<IContextualActionEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actionId: { type: String, required: true },
    module: { type: String, required: true },
    contentType: String,
    contentId: String,
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    status: { type: String, enum: ['success', 'failed'], required: true },
    latency: { type: Number, required: true },
    selectedTextLength: { type: Number, required: true },
    deviceCategory: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ContextualActionEventSchema.index({ userId: 1, createdAt: -1 });
ContextualActionEventSchema.index({ actionId: 1 });
ContextualActionEventSchema.index({ module: 1 });

export default mongoose.model<IContextualActionEvent>('ContextualActionEvent', ContextualActionEventSchema);
