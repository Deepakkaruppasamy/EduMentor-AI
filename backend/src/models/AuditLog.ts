import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;      // e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_STATUS_CHANGE', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'CREDENTIALS_DOWNLOADED'
  performedBy: string; // email of the user who performed the action, or 'SYSTEM'
  targetUser?: string; // email of the user affected
  details: string;     // description of the action
  ipAddress?: string;
  device?: string;
  location?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    performedBy: { type: String, required: true },
    targetUser: { type: String },
    details: { type: String, required: true },
    ipAddress: { type: String },
    device: { type: String },
    location: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
