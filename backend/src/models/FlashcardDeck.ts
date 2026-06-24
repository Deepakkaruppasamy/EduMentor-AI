import mongoose, { Document, Schema } from 'mongoose';

export interface IFlashcard {
  front: string;
  back: string;
  interval: number;
  repetition: number;
  efactor: number;
  nextReview: Date;
}

export interface IFlashcardDeck extends Document {
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  title: string;
  topic: string;
  cards: IFlashcard[];
  createdAt: Date;
  updatedAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>({
  front: { type: String, required: true },
  back: { type: String, required: true },
  interval: { type: Number, default: 0 },
  repetition: { type: Number, default: 0 },
  efactor: { type: Number, default: 2.5 },
  nextReview: { type: Date, default: Date.now },
});

const FlashcardDeckSchema = new Schema<IFlashcardDeck>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    topic: { type: String, required: true },
    cards: [FlashcardSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IFlashcardDeck>('FlashcardDeck', FlashcardDeckSchema);
