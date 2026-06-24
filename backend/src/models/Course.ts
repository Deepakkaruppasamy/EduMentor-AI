import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  code: string;
  description: string;
  faculty: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  documents: mongoose.Types.ObjectId[];
  isActive: boolean;
  chromaCollection: string;
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, required: true },
    faculty: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
    isActive: { type: Boolean, default: true },
    chromaCollection: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICourse>('Course', CourseSchema);
