import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length === 2,
        message: 'A conversation must have exactly 2 participants.',
      },
      required: true,
    },
    lastMessage: { type: Schema.Types.ObjectId, ref: 'MsgMessage' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for fast participant lookup
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IConversation>('MsgConversation', ConversationSchema);
