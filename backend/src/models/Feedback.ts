import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback extends Document {
  student: mongoose.Types.ObjectId;
  studentName: string;
  targetType: 'platform' | 'faculty' | 'course';
  targetFaculty?: mongoose.Types.ObjectId;
  targetFacultyName?: string;
  targetCourse?: mongoose.Types.ObjectId;
  targetCourseName?: string;
  category: 'Teaching Quality' | 'Course Content' | 'Platform Experience' | 'AI Tutor' | 'Support' | 'General';
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  message: string;
  isAnonymous: boolean;
  status: 'pending' | 'reviewed' | 'acknowledged';
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    targetType: { type: String, enum: ['platform', 'faculty', 'course'], required: true },
    targetFaculty: { type: Schema.Types.ObjectId, ref: 'User' },
    targetFacultyName: { type: String },
    targetCourse: { type: Schema.Types.ObjectId, ref: 'Course' },
    targetCourseName: { type: String },
    category: {
      type: String,
      enum: ['Teaching Quality', 'Course Content', 'Platform Experience', 'AI Tutor', 'Support', 'General'],
      required: true,
    },
    rating: { type: Number, enum: [1, 2, 3, 4, 5], required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    isAnonymous: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'reviewed', 'acknowledged'], default: 'pending' },
    adminNote: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IFeedback>('Feedback', FeedbackSchema);
