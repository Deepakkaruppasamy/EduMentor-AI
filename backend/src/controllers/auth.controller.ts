import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Otp from '../models/Otp';
import AuditLog from '../models/AuditLog';
import { config } from '../config/env';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/email';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE as any });
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  // Allow registration ONLY if there are no users in the database at all (for bootstrapping)
  const count = await User.countDocuments();
  if (count > 0) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied. Public registration is disabled. Please contact the administrator.'
    });
  }

  const { name, email, password, role, department } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'admin',
    department: department || '',
    isFirstLogin: true,
    isActive: true,
  });
  const token = generateToken(user._id.toString());

  await AuditLog.create({
    action: 'USER_CREATED',
    performedBy: 'SYSTEM',
    targetUser: email,
    details: 'Bootstrap Super Admin created via register endpoint.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      isFirstLogin: user.isFirstLogin,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await AuditLog.create({
      action: 'LOGIN_FAILED',
      performedBy: email,
      details: 'Failed login attempt: Email is not registered.',
      ipAddress: req.ip || req.socket.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Local Intranet'
    });
    return res.status(401).json({
      success: false,
      message: 'Access Denied. Your email is not registered. Please contact the administrator.'
    });
  }

  if (!user.isActive) {
    await AuditLog.create({
      action: 'LOGIN_FAILED',
      performedBy: email,
      targetUser: email,
      details: 'Failed login attempt: Account is disabled/inactive.',
      ipAddress: req.ip || req.socket.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Local Intranet'
    });
    return res.status(401).json({
      success: false,
      message: 'Access Denied. Your account has been disabled. Please contact the administrator.'
    });
  }

  // Account lockout check
  if (user.lockUntil && user.lockUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    await AuditLog.create({
      action: 'LOGIN_BLOCKED',
      performedBy: email,
      targetUser: email,
      details: `Login blocked: Account is locked. Try again in ${minutesLeft} minute(s).`,
      ipAddress: req.ip || req.socket.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Local Intranet'
    });
    return res.status(403).json({
      success: false,
      message: `Account is temporarily locked. Please try again in ${minutesLeft} minute(s).`,
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      user.loginAttempts = 0; // reset login attempts count
      await user.save({ validateBeforeSave: false });

      await AuditLog.create({
        action: 'LOGIN_BLOCKED',
        performedBy: email,
        targetUser: email,
        details: 'Failed login attempt: Account locked due to 5 consecutive failed attempts.',
        ipAddress: req.ip || req.socket.remoteAddress,
        device: req.headers['user-agent'] || 'Unknown Device',
        location: 'Local Intranet'
      });

      return res.status(403).json({
        success: false,
        message: 'Too many failed login attempts. Your account has been locked for 15 minutes.',
      });
    }
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      action: 'LOGIN_FAILED',
      performedBy: email,
      targetUser: email,
      details: `Failed login attempt: Incorrect password. Attempt ${user.loginAttempts} of 5.`,
      ipAddress: req.ip || req.socket.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown Device',
      location: 'Local Intranet'
    });

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // Reset login attempts on success
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    action: 'LOGIN_SUCCESS',
    performedBy: email,
    targetUser: email,
    details: 'User logged in successfully.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  const token = generateToken(user._id.toString());

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      isFirstLogin: user.isFirstLogin,
    },
  });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id).populate('courses', 'title code');
  res.json({ success: true, user });
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

export const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, avatar, bio, qualifications, department, preferredLanguage } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { name, avatar, bio, qualifications, department, preferredLanguage },
    { new: true, runValidators: true }
  );
  res.json({ success: true, user });
});

// Avatar system controller — modular, non-breaking
export const updateAvatar = asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    avatarGender, avatarModel, avatarPose, avatarExpression,
    avatarOutfit, avatarAccessories, avatarAnimation,
    profileImage, useCustomPhoto
  } = req.body;

  const updatePayload: Record<string, any> = {};
  if (avatarGender !== undefined) updatePayload.avatarGender = avatarGender;
  if (avatarModel !== undefined) updatePayload.avatarModel = avatarModel;
  if (avatarPose !== undefined) updatePayload.avatarPose = avatarPose;
  if (avatarExpression !== undefined) updatePayload.avatarExpression = avatarExpression;
  if (avatarOutfit !== undefined) updatePayload.avatarOutfit = avatarOutfit;
  if (avatarAccessories !== undefined) updatePayload.avatarAccessories = avatarAccessories;
  if (avatarAnimation !== undefined) updatePayload.avatarAnimation = avatarAnimation;
  if (profileImage !== undefined) updatePayload.profileImage = profileImage;
  if (useCustomPhoto !== undefined) updatePayload.useCustomPhoto = useCustomPhoto;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    updatePayload,
    { new: true, runValidators: false }
  );
  res.json({ success: true, user });
});

export const uploadImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});



export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide current and new passwords' });
  }

  const user = await User.findById(req.user?._id).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

export const firstLoginChangePassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Please provide email, current, and new passwords' });
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  user.isFirstLogin = false; // toggle first login off
  await user.save();

  await AuditLog.create({
    action: 'PASSWORD_RESET_COMPLETED',
    performedBy: user.email,
    targetUser: user.email,
    details: 'User successfully changed password on first login.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.json({ success: true, message: 'Password updated successfully. First login completed.' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide email.' });
  }

  // Check user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ 
      success: false, 
      message: 'This email is not registered. Please contact the Super Admin.' 
    });
  }

  // Generate secure 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  // Invalidate any active OTP for this email
  await Otp.deleteMany({ email });

  // Create active OTP record
  await Otp.create({
    email,
    otpHash,
    attempts: 0,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
    lastSentAt: new Date(),
  });

  // Log in Security Audit Log
  await AuditLog.create({
    action: 'PASSWORD_RESET_REQUESTED',
    performedBy: email,
    targetUser: email,
    details: 'User requested a password reset. OTP generated and sent.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  // Send OTP Email using sendEmail utility
  await sendEmail({
    email,
    subject: 'EduMentor AI - Password Reset Verification Code',
    text: `Your password reset verification code is: ${otp}\nThis code is valid for 5 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f63ff; margin: 0; font-size: 24px;">EduMentor AI</h2>
          <p style="color: #777; margin: 5px 0 0 0; font-size: 14px;">Secure Verification Code</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password for your EduMentor AI account. Use the verification code below to proceed:</p>
        <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f5f6ff; border-radius: 8px; border: 1px dashed #4f63ff;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f63ff;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.5;">This code is valid for <strong>5 minutes</strong>. If you did not request a password reset, please secure your account immediately or contact support.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">This is an automated security email. Please do not reply directly to this message.</p>
      </div>
    `,
  });

  res.json({ 
    success: true, 
    message: 'A verification code has been sent to your registered email.' 
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide email.' });
  }

  const otpRecord = await Otp.findOne({ email });
  if (!otpRecord) {
    return res.status(400).json({ success: false, message: 'Request a new verification code first.' });
  }

  // Verify if 60 seconds have passed since last sent
  const timeDiff = Date.now() - new Date(otpRecord.lastSentAt).getTime();
  if (timeDiff < 60000) {
    return res.status(400).json({ 
      success: false, 
      message: `Please wait ${Math.ceil((60000 - timeDiff) / 1000)} seconds before requesting a new OTP.` 
    });
  }

  // Generate new OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  // Extend expiry and update hash
  otpRecord.otpHash = otpHash;
  otpRecord.attempts = 0; // reset attempts
  otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  otpRecord.lastSentAt = new Date();
  await otpRecord.save();

  // Log in Security Audit Log
  await AuditLog.create({
    action: 'PASSWORD_RESET_REQUESTED',
    performedBy: email,
    targetUser: email,
    details: 'User requested a resend of password reset OTP. New code generated.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  // Send OTP Email using sendEmail utility
  await sendEmail({
    email,
    subject: 'EduMentor AI - New Password Reset Verification Code',
    text: `Your new password reset verification code is: ${otp}\nThis code is valid for 5 minutes. If you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f63ff; margin: 0; font-size: 24px;">EduMentor AI</h2>
          <p style="color: #777; margin: 5px 0 0 0; font-size: 14px;">New Verification Code</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="font-size: 16px; line-height: 1.5;">You requested a new verification code for resetting your password. Use this code to proceed:</p>
        <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f5f6ff; border-radius: 8px; border: 1px dashed #4f63ff;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f63ff;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.5;">This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">This is an automated security email. Please do not reply directly to this message.</p>
      </div>
    `,
  });

  res.json({ 
    success: true, 
    message: 'A verification code has been sent to your registered email.' 
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otpCode, newPassword, confirmPassword } = req.body;

  if (!email || !otpCode || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const otpRecord = await Otp.findOne({ email });
  if (!otpRecord) {
    return res.status(400).json({ success: false, message: 'No active OTP request found. Please request a new OTP.' });
  }

  // Check max attempts limit (3 attempts)
  if (otpRecord.attempts >= 3) {
    await Otp.deleteOne({ email });
    return res.status(400).json({ 
      success: false, 
      message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' 
    });
  }

  // Check expiry
  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteOne({ email });
    return res.status(400).json({ 
      success: false, 
      message: 'Verification code has expired. Please request a new OTP.' 
    });
  }

  // Verify OTP matches
  const isMatch = await bcrypt.compare(otpCode, otpRecord.otpHash);
  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    if (otpRecord.attempts >= 3) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ 
        success: false, 
        message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.' 
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid verification code.' });
  }

  // Confirm passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  // Enforce password strength: min 10 characters, uppercase, lowercase, number, special character
  const hasMinLength = newPassword.length >= 10;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;

  if (!isStrong) {
    return res.status(400).json({ success: false, message: 'Password does not meet the safety requirements.' });
  }

  // Save new password
  user.password = newPassword;
  await user.save();

  // Invalidate OTP record
  await Otp.deleteOne({ email });

  // Log in Security Audit Log
  await AuditLog.create({
    action: 'PASSWORD_RESET_COMPLETED',
    performedBy: email,
    targetUser: email,
    details: 'User successfully reset account password using email OTP.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  // Send Confirmation Email using sendEmail utility
  await sendEmail({
    email,
    subject: 'EduMentor AI - Password Reset Successful',
    text: `Your EduMentor AI account password has been successfully reset. If you did not perform this change, please contact the administrator immediately.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff; color: #333333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #22c55e; margin: 0; font-size: 24px;">EduMentor AI</h2>
          <p style="color: #777; margin: 5px 0 0 0; font-size: 14px;">Password Reset Confirmation</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.5;">Hello,</p>
        <p style="font-size: 16px; line-height: 1.5;">This email is to confirm that the password for your EduMentor AI account (<strong>${email}</strong>) has been successfully reset.</p>
        <div style="text-align: center; margin: 35px 0;">
          <span style="font-size: 50px;">🔒</span>
        </div>
        <p style="font-size: 14px; color: #666; line-height: 1.5; background-color: #fff9f9; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px;">
          <strong>Security Warning:</strong> If you did not initiate this password reset, please contact your systems administrator immediately to secure your account.
        </p>
        <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">This is an automated security email. Please do not reply directly to this message.</p>
      </div>
    `,
  });

  res.json({ 
    success: true, 
    message: 'Password has been reset successfully. Please log in with your new password.' 
  });
});
