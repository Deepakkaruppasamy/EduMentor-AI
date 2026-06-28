import mongoose, { Document, Schema } from 'mongoose';

export interface IAttachment {
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

export interface IDeliveryReceipt {
  user: mongoose.Types.ObjectId;
  at: Date;
}

export interface IReadReceipt {
  user: mongoose.Types.ObjectId;
  at: Date;
}

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'emoji';
  attachments: IAttachment[];
  replyTo?: mongoose.Types.ObjectId;
  isEdited: boolean;
  editedAt?: Date;
  deletedFor: mongoose.Types.ObjectId[];
  deliveredTo: IDeliveryReceipt[];
  readBy: IReadReceipt[];
  isPinned: boolean;
  pinnedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'MsgConversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'audio', 'file', 'emoji'],
      default: 'text',
    },
    attachments: { type: [AttachmentSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: 'MsgMessage' },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deliveredTo: {
      type: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, at: { type: Date } }],
      default: [],
    },
    readBy: {
      type: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, at: { type: Date } }],
      default: [],
    },
    isPinned: { type: Boolean, default: false },
    pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Indexes for fast queries
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ content: 'text' });

export default mongoose.model<IMessage>('MsgMessage', MessageSchema);
