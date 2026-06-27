import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'faculty' | 'admin';
  courses: mongoose.Types.ObjectId[];
  avatar?: string;
  bio?: string;
  qualifications?: string;
  department?: string;
  preferredLanguage?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  isActive: boolean;
  lastLogin?: Date;
  semester?: number;
  phone?: string;
  isFirstLogin: boolean;
  courseName?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  // Avatar system fields
  avatarGender?: 'male' | 'female';
  avatarModel?: string;
  avatarPose?: string;
  avatarExpression?: string;
  avatarOutfit?: string;
  avatarAccessories?: string;
  avatarAnimation?: string;
  profileImage?: string;
  useCustomPhoto?: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['student', 'faculty', 'admin'], default: 'student' },
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    avatar: { type: String },
    bio: { type: String, default: '' },
    qualifications: { type: String, default: '' },
    department: { type: String, default: '' },
    preferredLanguage: { type: String, default: 'English', enum: ['English', 'Tamil', 'Hindi', 'German', 'French'] },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    semester: { type: Number },
    phone: { type: String },
    isFirstLogin: { type: Boolean, default: true },
    courseName: { type: String },
    // Avatar system fields (all optional, non-breaking)
    avatarGender: { type: String, enum: ['male', 'female'] },
    avatarModel: { type: String },
    avatarPose: { type: String, default: 'standing' },
    avatarExpression: { type: String, default: 'neutral' },
    avatarOutfit: { type: String, default: 'casual' },
    avatarAccessories: { type: String },
    avatarAnimation: { type: String, default: 'smooth' },
    profileImage: { type: String },
    useCustomPhoto: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model<IUser>('User', UserSchema);
