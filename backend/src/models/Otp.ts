import mongoose, { Document, Schema } from 'mongoose';

export interface IOtp extends Document {
  email: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  otpHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date, default: Date.now },
});

export default mongoose.model<IOtp>('Otp', OtpSchema);
