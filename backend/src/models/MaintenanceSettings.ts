import mongoose, { Document, Schema } from 'mongoose';

export interface IMaintenanceSettings extends Document {
  isEnabled: boolean;
  message: string;
  startTime?: Date;
  endTime?: Date;
  scheduledBy?: string;   // email of admin who set it
  bannerUrl?: string;
  updatedAt: Date;
}

const MaintenanceSettingsSchema = new Schema<IMaintenanceSettings>(
  {
    isEnabled: { type: Boolean, default: false },
    message: {
      type: String,
      default: 'EduMentor AI is currently undergoing scheduled maintenance. We will be back shortly.',
    },
    startTime: { type: Date },
    endTime: { type: Date },
    scheduledBy: { type: String },
    bannerUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IMaintenanceSettings>('MaintenanceSettings', MaintenanceSettingsSchema);
