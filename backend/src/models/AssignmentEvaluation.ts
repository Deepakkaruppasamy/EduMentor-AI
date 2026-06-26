import mongoose, { Document, Schema } from 'mongoose';

export interface IAssignmentEvaluation extends Document {
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  fileName: string;
  extractedText: string;
  evaluation: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    missingConcepts: string[];
    suggestedCorrections: {
      question: string;
      currentAnswer: string;
      suggestion: string;
      conceptMissing: string;
    }[];
    predefinedCriteria: {
      criterion: string;
      maxScore: number;
      score: number;
      comments: string;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentEvaluationSchema = new Schema<IAssignmentEvaluation>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    fileName: { type: String, required: true },
    extractedText: { type: String, required: true },
    evaluation: {
      score: { type: Number, required: true, min: 0, max: 100 },
      feedback: { type: String, required: true },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      missingConcepts: [{ type: String }],
      suggestedCorrections: [
        {
          question: { type: String },
          currentAnswer: { type: String },
          suggestion: { type: String },
          conceptMissing: { type: String },
        },
      ],
      predefinedCriteria: [
        {
          criterion: { type: String, required: true },
          maxScore: { type: Number, required: true },
          score: { type: Number, required: true },
          comments: { type: String },
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAssignmentEvaluation>('AssignmentEvaluation', AssignmentEvaluationSchema);
