import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Otp from '../models/Otp';
import AuditLog from '../models/AuditLog';
import Course from '../models/Course';
import { config } from '../config/env';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/email';
import UserSession from '../models/UserSession';
import { logActivity, hashToken, parseBrowser, parseOS, parseDeviceName } from '../utils/activity-logger';

const generateToken = (id: string): string => {
  return jwt.sign({ id }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE as any });
};

const generateRandomPassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*()_+~`|}{[]:;?><,./-';
  const all = uppercase + lowercase + digits + specials;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  
  const length = 10 + Math.floor(Math.random() * 3);
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, role, department, semester, phone, courseName, courses } = req.body;

  if (!name || !email || !role || !department) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, role, and department.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  const plainPassword = generateRandomPassword();

  const user = new User({
    name,
    email,
    password: plainPassword,
    role: role || 'student',
    department: department || '',
    semester: semester ? Number(semester) : undefined,
    phone,
    courseName,
    isFirstLogin: true,
    isActive: true,
  });

  // Attempt to link to Course by Code if courseName matches code
  if (courseName) {
    const course = await Course.findOne({ code: courseName.toUpperCase() });
    if (course) {
      user.courses.push(course._id as any);
      if (role === 'student') {
        course.students.push(user._id as any);
      } else if (role === 'faculty') {
        course.faculty = user._id as any;
      }
      await course.save();
    }
  }

  // Link selected courses by ID
  if (courses && Array.isArray(courses)) {
    for (const cId of courses) {
      if (!user.courses.includes(cId)) {
        user.courses.push(cId);
        const course = await Course.findById(cId);
        if (course) {
          if (role === 'student') {
            course.students.push(user._id as any);
          } else if (role === 'faculty') {
            course.faculty = user._id as any;
          }
          await course.save();
        }
      }
    }
  }

  await user.save();

  await AuditLog.create({
    action: 'USER_CREATED',
    performedBy: 'SYSTEM',
    targetUser: email,
    details: `User self-registered: ${name} (${role})`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  // Send credentials email
  sendEmail({
    email: user.email,
    subject: 'Welcome to EduMentor AI! - Your Account Credentials 🎓',
    text: `Hello ${user.name},\n\nAn account has been created for you on EduMentor AI.\n\nYour temporary login credentials are:\nEmail: ${user.email}\nTemporary Password: ${plainPassword}\n\nPlease sign in at ${config.FRONTEND_URL || 'http://localhost:5173'} and update your password on first login.\n\nBest regards,\nThe EduMentor AI Team`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f63ff; margin: 0; font-size: 28px; font-weight: 800;">Welcome to EduMentor AI! 🎓</h2>
          <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Your Personalized AI Learning Companion</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">An account has been successfully created for you. Below are your temporary login credentials. You will be prompted to set a permanent password when you sign in for the first time.</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #edf2f7; font-family: monospace; font-size: 14px; line-height: 1.8;">
          <div style="margin-bottom: 6px;">📧 <strong>Email Address:</strong> ${user.email}</div>
          <div style="margin-bottom: 6px;">👥 <strong>User Role:</strong> ${user.role.toUpperCase()}</div>
          <div>🔑 <strong>Temporary Password:</strong> <span style="color: #e53e3e; font-weight: bold; background-color: #fff5f5; padding: 2px 6px; border-radius: 4px;">${plainPassword}</span></div>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">Click the link below to sign in and set up your permanent credentials:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4f63ff; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 99, 255, 0.2);">Go to Login</a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This email was sent to ${user.email} because a new account was registered on EduMentor AI.</p>
      </div>
    `
  }).catch(err => console.error('Failed to send credentials email:', err));

  res.status(201).json({
    success: true,
    message: 'Registration successful. A temporary password has been sent to your email.',
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

  // Check if this is the user's first login
  const isNewUser = !user.lastLogin;

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

  // Asynchronously send login notification
  if (isNewUser) {
    sendEmail({
      email: user.email,
      subject: 'Welcome to EduMentor AI! 🎓',
      text: `Hello ${user.name},\n\nWelcome to EduMentor AI! We are thrilled to have you join our platform.\n\nEduMentor AI is your personalized academic companion designed to help you succeed. Here are some of the key features you can access right away:\n- AI Study Tutor: Ask any question about your courses and get instant, context-aware answers.\n- Notes Generator: Instantly generate revisions, cheat sheets, or formulas lists.\n- Custom Quizzes: Take quizzes assigned by instructors or generated by AI to test your knowledge.\n- Meeting Scheduler: Book consultation sessions with your instructors easily.\n\nLog in now to explore your study dashboard!\n\nBest regards,\nThe EduMentor AI Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f63ff; margin: 0; font-size: 28px; font-weight: 800;">Welcome to EduMentor AI! 🎓</h2>
            <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Your Personalized AI Learning Companion</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6;">We are thrilled to welcome you to the EduMentor AI platform! Our system is designed to support your academic journey with advanced AI-driven features.</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #edf2f7;">
            <h4 style="margin-top: 0; color: #4f63ff; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">💡 What you can do on EduMentor AI:</h4>
            <ul style="padding-left: 20px; margin: 0; font-size: 14px; color: #4a5568; line-height: 1.8;">
              <li><strong>AI Study Tutor:</strong> Get instant, context-aware answers to course questions.</li>
              <li><strong>AI Notes Generator:</strong> Create study summaries, revision guides, and formulas cheat sheets.</li>
              <li><strong>Interactive Quizzes:</strong> Take quizzes assigned by instructors or generate custom ones on any topic.</li>
              <li><strong>Meeting Scheduler:</strong> Schedule office hours and slots with your faculty members in real time.</li>
            </ul>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">Click the link below to sign in and begin exploring your personalized learning plan:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4f63ff; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 99, 255, 0.2);">Go to Dashboard</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This email was sent to ${user.email} because a new account was registered on EduMentor AI.</p>
        </div>
      `
    }).catch(err => console.error('Failed to send Welcome Email:', err));
  } else {
    sendEmail({
      email: user.email,
      subject: 'Security Alert: New Sign-in to Your Account',
      text: `Hello ${user.name},\n\nWe detected a new login to your EduMentor AI account.\n\nSign-in details:\n- Time: ${new Date().toLocaleString()}\n- Device: ${req.headers['user-agent'] || 'Unknown Device'}\n- IP Address: ${req.ip || req.socket.remoteAddress}\n\nIf this was you, you can safely ignore this message. If you did not perform this action, please reset your password immediately and contact support.`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2b6cb0; margin: 0; font-size: 24px; font-weight: 700;">Security Alert: New Login 🔒</h2>
            <p style="color: #718096; margin: 5px 0 0 0; font-size: 13px;">EduMentor AI Security Notification</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 15px; line-height: 1.5; color: #2d3748;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #4a5568;">We noticed a new login to your EduMentor AI account. Below are the details:</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
            <div style="margin-bottom: 8px;">⏰ <strong>Time:</strong> ${new Date().toLocaleString()}</div>
            <div style="margin-bottom: 8px;">🌐 <strong>IP Address:</strong> ${req.ip || req.socket.remoteAddress}</div>
            <div>📱 <strong>Device:</strong> ${req.headers['user-agent'] || 'Unknown Device'}</div>
          </div>
          
          <p style="font-size: 14px; line-height: 1.5; color: #718096;">If this login was performed by you, no action is required. If you do not recognize this activity, please reset your password immediately or contact our support desk.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">This is an automated security email. Please do not reply directly to this message.</p>
        </div>
      `
    }).catch(err => console.error('Failed to send login alert:', err));
  }

  const token = generateToken(user._id.toString());

  // Create UserSession
  try {
    const ua = req.headers['user-agent'] || '';
    await UserSession.create({
      userId: user._id,
      userEmail: user.email,
      tokenHash: hashToken(token),
      deviceName: parseDeviceName(ua),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      ipAddress: req.ip || req.socket.remoteAddress || '',
      isActive: true,
      loginTime: new Date(),
      lastActive: new Date()
    });

    // Log Activity
    await logActivity(req, {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      module: 'Authentication',
      details: 'User logged in successfully.',
      status: 'success'
    });
  } catch (sessErr) {
    console.error('Failed to create login session or log activity:', sessErr);
  }

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
  
  if (user) {
    // Log Activity
    await logActivity(req, {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PROFILE_UPDATED',
      module: 'User Profile',
      details: 'User updated profile details.',
      status: 'success'
    });
    
    sendEmail({
      email: user.email,
      subject: 'EduMentor AI - Profile Information Updated',
      text: `Hello ${user.name},\n\nThis is to confirm that your profile and account details have been successfully updated on EduMentor AI.\n\nUpdated details:\n- Name: ${user.name}\n- Bio: ${user.bio || 'Not set'}\n- Department: ${user.department || 'Not set'}\n- Preferred Language: ${user.preferredLanguage}\n\nIf you did not authorize this change, please contact support immediately.`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f63ff; margin: 0; font-size: 24px; font-weight: 700;">Profile Updated Successful ✅</h2>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${user.name}</strong>,</p>
          <p style="font-size: 15px; line-height: 1.5; color: #4a5568;">Your EduMentor AI profile and account details were recently updated. Here is a summary of your profile information:</p>
          
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px; line-height: 1.6; color: #4a5568;">
            <div style="margin-bottom: 8px;">👤 <strong>Name:</strong> ${user.name}</div>
            <div style="margin-bottom: 8px;">🏫 <strong>Department:</strong> ${user.department || 'Not set'}</div>
            <div style="margin-bottom: 8px;">🌐 <strong>Preferred Language:</strong> ${user.preferredLanguage}</div>
            <div>📝 <strong>Bio:</strong> ${user.bio || 'Not set'}</div>
          </div>
          
          <p style="font-size: 13px; color: #718096;">If you made these changes, no further action is required. If you did not authorize this profile update, please contact the administrator immediately.</p>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">This is an automated system confirmation.</p>
        </div>
      `
    }).catch(err => console.error('Failed to send profile update email:', err));
  }

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

  // Terminate all sessions on password change
  try {
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    );
    // Log Activity
    await logActivity(req, {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      module: 'Authentication',
      details: 'User changed password.',
      status: 'success'
    });
  } catch (sessErr) {
    console.error('Failed to revoke sessions or log activity on changePassword:', sessErr);
  }

  // Send security alert
  sendEmail({
    email: user.email,
    subject: 'EduMentor AI - Password Changed Successfully',
    text: `Hello ${user.name},\n\nYour account password has been changed successfully.\n\nIf you performed this action, you can safely ignore this email. If you did not change your password, please reset it using the forgot password option on the login page or contact support immediately to lock your account.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #e53e3e; margin: 0; font-size: 24px; font-weight: 700;">Password Updated Successfully 🔑</h2>
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5; color: #4a5568;">Your account password for EduMentor AI was successfully updated.</p>
        
        <div style="background-color: #fffaf0; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #feebc8; font-size: 13px; line-height: 1.6; color: #7b341e;">
          ⚠️ <strong>Security Notice:</strong> If you did not make this change, please use the "Forgot Password" feature on the login screen immediately to reset it, or contact an administrator to secure your account.
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">This is an automated security email.</p>
      </div>
    `
  }).catch(err => console.error('Failed to send password change email:', err));

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

  // Terminate all sessions
  try {
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    );
    // Log Activity
    await logActivity(req, {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      module: 'Authentication',
      details: 'User changed password on first login.',
      status: 'success'
    });
  } catch (sessErr) {
    console.error('Failed to revoke sessions or log activity on firstLoginChangePassword:', sessErr);
  }

  await AuditLog.create({
    action: 'PASSWORD_RESET_COMPLETED',
    performedBy: user.email,
    targetUser: user.email,
    details: 'User successfully changed password on first login.',
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  // Send security alert
  sendEmail({
    email: user.email,
    subject: 'EduMentor AI - Password Changed Successfully',
    text: `Hello ${user.name},\n\nYour account password has been changed successfully.\n\nIf you performed this action, you can safely ignore this email. If you did not change your password, please reset it using the forgot password option on the login page or contact support immediately to lock your account.`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #e53e3e; margin: 0; font-size: 24px; font-weight: 700;">Password Updated Successfully 🔑</h2>
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 15px; line-height: 1.5;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5; color: #4a5568;">Your account password for EduMentor AI was successfully updated.</p>
        
        <div style="background-color: #fffaf0; padding: 15px; border-radius: 10px; margin: 20px 0; border: 1px solid #feebc8; font-size: 13px; line-height: 1.6; color: #7b341e;">
          ⚠️ <strong>Security Notice:</strong> If you did not make this change, please use the "Forgot Password" feature on the login screen immediately to reset it, or contact an administrator to secure your account.
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 11px; color: #a0aec0; text-align: center; margin: 0;">This is an automated security email.</p>
      </div>
    `
  }).catch(err => console.error('Failed to send password change email:', err));

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

  // Terminate all sessions on password reset
  try {
    await UserSession.updateMany(
      { userId: user._id, isActive: true },
      { $set: { isActive: false, logoutTime: new Date() } }
    );
    // Log Activity
    await logActivity(req, {
      userId: user._id.toString(),
      userEmail: user.email,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      module: 'Authentication',
      details: 'User reset password via OTP.',
      status: 'success'
    });
  } catch (sessErr) {
    console.error('Failed to revoke sessions or log activity on resetPassword:', sessErr);
  }

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
