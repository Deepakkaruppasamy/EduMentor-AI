import mongoose, { Document, Schema } from 'mongoose';

export interface IPrivacySettings extends Document {
  userId: mongoose.Types.ObjectId;
  cookiePreferences: {
    analytics: boolean;
    marketing: boolean;
    functional: boolean;
  };
  notificationPreferences: {
    emailNotifications: boolean;
    browserNotifications: boolean;
    loginAlerts: boolean;
    maintenanceAlerts: boolean;
    securityAlerts: boolean;
  };
  twoFactorEnabled: boolean;       // Future-ready
  dataDownloadRequested: boolean;
  dataDownloadRequestedAt?: Date;
  deletionRequested: boolean;
  deletionRequestedAt?: Date;
  language: string;
  timezone: string;
  updatedAt: Date;
}

const PrivacySettingsSchema = new Schema<IPrivacySettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    cookiePreferences: {
      analytics: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false },
      functional: { type: Boolean, default: true },
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      browserNotifications: { type: Boolean, default: true },
      loginAlerts: { type: Boolean, default: true },
      maintenanceAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
    },
    twoFactorEnabled: { type: Boolean, default: false },
    dataDownloadRequested: { type: Boolean, default: false },
    dataDownloadRequestedAt: { type: Date },
    deletionRequested: { type: Boolean, default: false },
    deletionRequestedAt: { type: Date },
    language: { type: String, default: 'English' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  { timestamps: true }
);

export default mongoose.model<IPrivacySettings>('PrivacySettings', PrivacySettingsSchema);
