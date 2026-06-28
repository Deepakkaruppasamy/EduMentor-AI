import mongoose, { Document, Schema } from 'mongoose';

export type NoteType =
  | 'Revision'
  | 'Short'
  | 'Detailed'
  | 'CheatSheet'
  | 'Formula'
  | 'KeyPoints'
  | 'MindMap'
  | 'ExamTips';

export interface IGeneratedNote extends Document {
  user: mongoose.Types.ObjectId;
  course?: mongoose.Types.ObjectId;
  courseName: string;
  topic: string;
  noteType: NoteType;
  content: string; // markdown
  createdAt: Date;
}

const GeneratedNoteSchema = new Schema<IGeneratedNote>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    courseName: { type: String, required: true },
    topic: { type: String, required: true },
    noteType: {
      type: String,
      enum: ['Revision', 'Short', 'Detailed', 'CheatSheet', 'Formula', 'KeyPoints', 'MindMap', 'ExamTips'],
      required: true,
    },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

GeneratedNoteSchema.index({ user: 1, createdAt: -1 });
GeneratedNoteSchema.index({ topic: 'text' });

export default mongoose.model<IGeneratedNote>('GeneratedNote', GeneratedNoteSchema);
