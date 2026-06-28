import mongoose, { Document, Schema } from 'mongoose';

export type AppointmentStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Rescheduled'
  | 'Completed'
  | 'Cancelled';

export type MeetingMode = 'Online' | 'Offline';

export interface IAppointment extends Document {
  student: mongoose.Types.ObjectId;
  faculty: mongoose.Types.ObjectId;
  mode: MeetingMode;
  date: Date;
  timeSlot: string; // e.g. "09:00 - 09:30"
  purpose: string;
  status: AppointmentStatus;
  facultyNotes?: string;
  rescheduledDate?: Date;
  rescheduledSlot?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, enum: ['Online', 'Offline'], required: true },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    purpose: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Rescheduled', 'Completed', 'Cancelled'],
      default: 'Pending',
    },
    facultyNotes: { type: String, default: '' },
    rescheduledDate: { type: Date },
    rescheduledSlot: { type: String },
  },
  { timestamps: true }
);

AppointmentSchema.index({ student: 1, date: -1 });
AppointmentSchema.index({ faculty: 1, date: -1 });
AppointmentSchema.index({ status: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
