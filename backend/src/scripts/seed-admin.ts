import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://root:edumentor123@localhost:27017/edumentor?authSource=admin';

const targetEmail = 'deepakkaruppasamy27@gmail.com';
const targetPassword = 'edumentor@123';

async function updateAdmin() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const User = mongoose.model(
    'User',
    new mongoose.Schema(
      {
        name: String,
        email: { type: String, unique: true, lowercase: true },
        password: String,
        role: String,
        isActive: Boolean,
        isFirstLogin: Boolean,
        department: String,
        loginAttempts: Number,
        lockUntil: Date,
      },
      { timestamps: true }
    )
  );

  const hashedPassword = await bcrypt.hash(targetPassword, 12);

  // Check if target email exists
  let user = await User.findOne({ email: targetEmail });
  if (user) {
    user.password = hashedPassword;
    user.role = 'admin';
    user.name = 'Super Admin';
    user.isActive = true;
    user.isFirstLogin = false;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    console.log(`✅ Admin updated successfully: ${targetEmail} / ${targetPassword}`);
  } else {
    // Check if legacy admin exists
    const legacy = await User.findOne({ email: 'admin@university.edu' });
    if (legacy) {
      legacy.email = targetEmail;
      legacy.password = hashedPassword;
      legacy.role = 'admin';
      legacy.name = 'Super Admin';
      legacy.isActive = true;
      legacy.isFirstLogin = false;
      legacy.loginAttempts = 0;
      legacy.lockUntil = undefined;
      await legacy.save();
      console.log(`✅ Legacy admin migrated to: ${targetEmail} / ${targetPassword}`);
    } else {
      await User.create({
        name: 'Super Admin',
        email: targetEmail,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isFirstLogin: false,
        department: 'Administration',
        loginAttempts: 0,
      });
      console.log(`✅ New Admin created successfully: ${targetEmail} / ${targetPassword}`);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

updateAdmin().catch((err) => {
  console.error('Error updating admin:', err);
  process.exit(1);
});
