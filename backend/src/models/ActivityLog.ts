import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: 'student' | 'faculty' | 'admin';
  action: string;           // e.g. 'LOGIN', 'QUIZ_ATTEMPT', 'NOTES_GENERATED'
  module: string;           // e.g. 'Authentication', 'Quiz', 'Notes Generator'
  details: string;
  status: 'success' | 'warning' | 'error';
  device: string;           // raw UA string
  browser: string;          // parsed browser name
  os: string;               // parsed OS name
  ipAddress?: string;
  metadata?: Record<string, any>; // extra context (score, fileName, etc.)
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, enum: ['student', 'faculty', 'admin'], required: true },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true },
    details: { type: String, required: true },
    status: { type: String, enum: ['success', 'warning', 'error'], default: 'success' },
    device: { type: String, default: 'Unknown Device' },
    browser: { type: String, default: 'Unknown Browser' },
    os: { type: String, default: 'Unknown OS' },
    ipAddress: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: keep activity logs for 1 year
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ module: 1, action: 1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
