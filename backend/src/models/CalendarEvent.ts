import mongoose, { Document, Schema } from 'mongoose';

export type EventType =
  | 'Holiday'
  | 'Exam'
  | 'Assignment'
  | 'Workshop'
  | 'Lecture'
  | 'Event'
  | 'Placement'
  | 'Announcement'
  | 'ClassCancellation'
  | 'Lab';

export interface ICalendarEvent extends Document {
  title: string;
  description?: string;
  type: EventType;
  startDate: Date;
  endDate: Date;
  course?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  targetRoles: string[]; // ['student', 'faculty', 'admin']
  color?: string; // hex color for display
  reminderDays: number[]; // [7, 3, 1, 0]
  isAllDay: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['Holiday', 'Exam', 'Assignment', 'Workshop', 'Lecture', 'Event', 'Placement', 'Announcement', 'ClassCancellation', 'Lab'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetRoles: { type: [String], default: ['student', 'faculty', 'admin'] },
    color: { type: String, default: '#4f63ff' },
    reminderDays: { type: [Number], default: [7, 3, 1, 0] },
    isAllDay: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CalendarEventSchema.index({ startDate: 1, endDate: 1 });
CalendarEventSchema.index({ type: 1 });
CalendarEventSchema.index({ createdBy: 1 });

export default mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema);
