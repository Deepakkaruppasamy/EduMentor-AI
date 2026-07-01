import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  tokenHash: string;      // SHA-256 hash of the JWT — never store raw tokens
  deviceName: string;
  browser: string;
  os: string;
  ipAddress: string;
  isActive: boolean;
  loginTime: Date;
  lastActive: Date;
  logoutTime?: Date;
  isCurrent?: boolean;   // virtual, not stored
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userEmail: { type: String, required: true },
    tokenHash: { type: String, required: true, index: true },
    deviceName: { type: String, default: 'Unknown Device' },
    browser: { type: String, default: 'Unknown Browser' },
    os: { type: String, default: 'Unknown OS' },
    ipAddress: { type: String, default: '' },
    isActive: { type: Boolean, default: true, index: true },
    loginTime: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    logoutTime: { type: Date },
  },
  { timestamps: false }
);

// TTL: auto-delete inactive sessions after 30 days
UserSessionSchema.index(
  { logoutTime: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { isActive: false } }
);
UserSessionSchema.index({ userId: 1, isActive: 1 });

export default mongoose.model<IUserSession>('UserSession', UserSessionSchema);
