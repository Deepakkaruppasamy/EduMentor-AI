import mongoose, { Document, Schema } from 'mongoose';

export type FacultyStatus = 'Available' | 'Busy' | 'Offline' | 'OnLeave';

export interface ITimeSlot {
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  breakStart?: string;
  breakEnd?: string;
  maxAppointments: number;
  durationMinutes: number; // e.g. 30
}

export interface IOfficeHours extends Document {
  faculty: mongoose.Types.ObjectId;
  workingDays: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  slots: ITimeSlot[];
  status: FacultyStatus;
  statusMessage?: string;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakStart: { type: String },
    breakEnd: { type: String },
    maxAppointments: { type: Number, default: 1 },
    durationMinutes: { type: Number, default: 30 },
  },
  { _id: false }
);

const OfficeHoursSchema = new Schema<IOfficeHours>(
  {
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
    slots: { type: [TimeSlotSchema], default: [] },
    status: {
      type: String,
      enum: ['Available', 'Busy', 'Offline', 'OnLeave'],
      default: 'Offline',
    },
    statusMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IOfficeHours>('OfficeHours', OfficeHoursSchema);
