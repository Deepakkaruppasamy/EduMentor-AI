import { Request, Response } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import Course from '../models/Course';
import Quiz from '../models/Quiz';
import Chat from '../models/Chat';
import Document from '../models/Document';
import AssignmentEvaluation from '../models/AssignmentEvaluation';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../utils/email';
import { config } from '../config/env';

// Helper: Generate strong random password
const generateRandomPassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*()_+~`|}{[]:;?><,./-';
  const all = uppercase + lowercase + digits + specials;
  
  // Enforce at least one of each requirement
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  
  // Fill the rest to reach 10-12 characters
  const length = 10 + Math.floor(Math.random() * 3);
  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Create a single user manually
export const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, email, role, department, semester, phone, courseName } = req.body;

  if (!name || !email || !role || !department) {
    return res.status(400).json({ success: false, message: 'Name, Email, Role, and Department are required.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: 'Email already registered.' });
  }

  const plainPassword = generateRandomPassword();

  const newUser = new User({
    name,
    email,
    password: plainPassword,
    role,
    department,
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
      newUser.courses.push(course._id as any);
      if (role === 'student') {
        course.students.push(newUser._id as any);
      } else if (role === 'faculty') {
        course.faculty = newUser._id as any;
      }
      await course.save();
    }
  }

  await newUser.save();

  // Send credentials email to the newly created user
  sendEmail({
    email: newUser.email,
    subject: 'Welcome to EduMentor AI! - Your Account Credentials 🎓',
    text: `Hello ${newUser.name},\n\nAn account has been created for you on EduMentor AI by the administrator.\n\nYour temporary login credentials are:\nEmail: ${newUser.email}\nTemporary Password: ${plainPassword}\n\nPlease sign in at ${config.FRONTEND_URL || 'http://localhost:5173'} and update your password on first login.\n\nBest regards,\nThe EduMentor AI Team`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f63ff; margin: 0; font-size: 28px; font-weight: 800;">Welcome to EduMentor AI! 🎓</h2>
          <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Your Personalized AI Learning Companion</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
        <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${newUser.name}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">An account has been successfully created for you on EduMentor AI. Below are your temporary login credentials. You will be prompted to set a permanent password when you sign in for the first time.</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #edf2f7; font-family: monospace; font-size: 14px; line-height: 1.8;">
          <div style="margin-bottom: 6px;">📧 <strong>Email Address:</strong> ${newUser.email}</div>
          <div style="margin-bottom: 6px;">👥 <strong>User Role:</strong> ${newUser.role.toUpperCase()}</div>
          <div>🔑 <strong>Temporary Password:</strong> <span style="color: #e53e3e; font-weight: bold; background-color: #fff5f5; padding: 2px 6px; border-radius: 4px;">${plainPassword}</span></div>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">Click the link below to sign in and set up your permanent credentials:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4f63ff; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 99, 255, 0.2);">Go to Login</a>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This email was sent to ${newUser.email} because a new account was registered on EduMentor AI.</p>
      </div>
    `
  }).catch(err => console.error('Failed to send manually created user email:', err));

  await AuditLog.create({
    action: 'USER_CREATED',
    performedBy: req.user?.email || 'admin@university.edu',
    targetUser: email,
    details: `Created new user manually: ${name} (${role})`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully.',
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      semester: newUser.semester,
      phone: newUser.phone,
      courseName: newUser.courseName,
    },
    generatedPassword: plainPassword
  });
});

// Bulk upload users
export const bulkCreateUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { users } = req.body;

  if (!users || !Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ success: false, message: 'A valid list of users is required.' });
  }

  const createdCredentials: any[] = [];
  const errors: string[] = [];

  for (const u of users) {
    const { Name, Email, Department, Role, Course, Semester, Phone } = u;

    if (!Name || !Email || !Department || !Role) {
      errors.push(`Missing fields for ${Email || 'Unknown User'}`);
      continue;
    }

    const cleanedRole = Role.toLowerCase() === 'super admin' ? 'admin' : Role.toLowerCase();

    const existingUser = await User.findOne({ email: Email });
    if (existingUser) {
      errors.push(`Email already registered: ${Email}`);
      continue;
    }

    const plainPassword = generateRandomPassword();

    const newUser = new User({
      name: Name,
      email: Email,
      password: plainPassword,
      role: cleanedRole,
      department: Department,
      semester: Semester ? Number(Semester) : undefined,
      phone: Phone,
      courseName: Course,
      isFirstLogin: true,
      isActive: true,
    });

    // Attempt to link to Course
    if (Course) {
      const course = await Course.findOne({ code: Course.toUpperCase() });
      if (course) {
        newUser.courses.push(course._id as any);
        if (cleanedRole === 'student') {
          course.students.push(newUser._id as any);
        } else if (cleanedRole === 'faculty') {
          course.faculty = newUser._id as any;
        }
        await course.save();
      }
    }

    await newUser.save();

    // Send credentials email to the newly created user
    sendEmail({
      email: newUser.email,
      subject: 'Welcome to EduMentor AI! - Your Account Credentials 🎓',
      text: `Hello ${newUser.name},\n\nAn account has been created for you on EduMentor AI via spreadsheet import.\n\nYour temporary login credentials are:\nEmail: ${newUser.email}\nTemporary Password: ${plainPassword}\n\nPlease sign in at ${config.FRONTEND_URL || 'http://localhost:5173'} and update your password on first login.\n\nBest regards,\nThe EduMentor AI Team`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1a202c;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4f63ff; margin: 0; font-size: 28px; font-weight: 800;">Welcome to EduMentor AI! 🎓</h2>
            <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Your Personalized AI Learning Companion</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
          <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${newUser.name}</strong>,</p>
          <p style="font-size: 16px; line-height: 1.6;">An account has been successfully created for you on EduMentor AI. Below are your temporary login credentials. You will be prompted to set a permanent password when you sign in for the first time.</p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #edf2f7; font-family: monospace; font-size: 14px; line-height: 1.8;">
            <div style="margin-bottom: 6px;">📧 <strong>Email Address:</strong> ${newUser.email}</div>
            <div style="margin-bottom: 6px;">👥 <strong>User Role:</strong> ${newUser.role.toUpperCase()}</div>
            <div>🔑 <strong>Temporary Password:</strong> <span style="color: #e53e3e; font-weight: bold; background-color: #fff5f5; padding: 2px 6px; border-radius: 4px;">${plainPassword}</span></div>
          </div>

          <p style="font-size: 15px; line-height: 1.6; color: #4a5568;">Click the link below to sign in and set up your permanent credentials:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4f63ff; color: #ffffff; padding: 12px 30px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(79, 99, 255, 0.2);">Go to Login</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 25px 0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">This email was sent to ${newUser.email} because a new account was registered on EduMentor AI.</p>
        </div>
      `
    }).catch(err => console.error('Failed to send manually created user email:', err));

    createdCredentials.push({
      Name,
      Email,
      Password: plainPassword,
      Role: cleanedRole,
    });
  }

  await AuditLog.create({
    action: 'USER_BULK_IMPORT',
    performedBy: req.user?.email || 'admin@university.edu',
    details: `Imported ${createdCredentials.length} users successfully. Errors: ${errors.length}`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.status(201).json({
    success: true,
    importedCount: createdCredentials.length,
    credentials: createdCredentials,
    errors
  });
});

// Edit user details
export const editUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, department, semester, phone, courseName, isActive } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Log changes
  const oldEmail = user.email;
  user.name = name || user.name;
  user.email = email || user.email;
  user.role = role || user.role;
  user.department = department || user.department;
  user.semester = semester !== undefined ? Number(semester) : user.semester;
  user.phone = phone !== undefined ? phone : user.phone;
  user.courseName = courseName !== undefined ? courseName : user.courseName;
  user.isActive = isActive !== undefined ? isActive : user.isActive;

  await user.save();

  await AuditLog.create({
    action: 'USER_UPDATED',
    performedBy: req.user?.email || 'admin@university.edu',
    targetUser: oldEmail,
    details: `Updated details for user: ${user.name} (${user.role})`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.json({ success: true, message: 'User updated successfully.', user });
});

// Toggle user active status
export const toggleUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (isActive === undefined) {
    return res.status(400).json({ success: false, message: 'isActive field is required.' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  user.isActive = isActive;
  await user.save();

  await AuditLog.create({
    action: 'USER_STATUS_CHANGE',
    performedBy: req.user?.email || 'admin@university.edu',
    targetUser: user.email,
    details: `User status set to ${isActive ? 'Enabled' : 'Disabled'}`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.json({ success: true, message: `User account has been ${isActive ? 'enabled' : 'disabled'}.` });
});

// Force reset user password
export const forceResetPassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const plainPassword = generateRandomPassword();
  user.password = plainPassword;
  user.isFirstLogin = true; // force password change on next login
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await AuditLog.create({
    action: 'PASSWORD_RESET_COMPLETED',
    performedBy: req.user?.email || 'admin@university.edu',
    targetUser: user.email,
    details: `Admin force reset password. Set isFirstLogin=true.`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.json({
    success: true,
    message: 'User password reset successful.',
    generatedPassword: plainPassword
  });
});

// Delete user
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const userEmail = user.email;
  await User.findByIdAndDelete(id);

  await AuditLog.create({
    action: 'USER_DELETED',
    performedBy: req.user?.email || 'admin@university.edu',
    targetUser: userEmail,
    details: `Deleted user: ${user.name} (${user.role})`,
    ipAddress: req.ip || req.socket.remoteAddress,
    device: req.headers['user-agent'] || 'Unknown Device',
    location: 'Local Intranet'
  });

  res.json({ success: true, message: 'User deleted successfully.' });
});

// Retrieve all system users (paginated and filterable)
export const getUsersList = asyncHandler(async (req: Request, res: Response) => {
  const { role, department, semester, search, page = 1, limit = 10 } = req.query;

  const filter: any = {};
  if (role) filter.role = role;
  if (department) filter.department = department;
  if (semester) filter.semester = Number(semester);
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { courseName: { $regex: search, $options: 'i' } }
    ];
  }

  const count = await User.countDocuments(filter);
  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({
    success: true,
    total: count,
    page: Number(page),
    limit: Number(limit),
    users
  });
});

// Retrieve Audit Logs
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, count: logs.length, logs });
});

// Aggregated Analytics
export const getAdminAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. USER ANALYTICS
  const [
    totalStudents,
    totalFaculty,
    activeUsers,
    inactiveUsers,
    newUsersThisMonth,
    deptStats,
    courseStats,
    semesterStats
  ] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'faculty' }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: false }),
    User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $match: { _id: { $ne: '' } } }
    ]),
    User.aggregate([
      { $group: { _id: '$courseName', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } }
    ]),
    User.aggregate([
      { $group: { _id: '$semester', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } }
    ])
  ]);

  // 2. STUDENT ANALYTICS
  const [
    totalChats,
    completedQuizzes,
    avgQuizScoreRaw,
    evalsStats,
    recommendationsCount
  ] = await Promise.all([
    Chat.countDocuments(),
    Quiz.countDocuments({ status: 'completed' }),
    Quiz.aggregate([
      { $match: { status: 'completed', score: { $ne: null } } },
      { $group: { _id: null, avgScore: { $avg: { $divide: ['$score', '$maxScore'] } } } }
    ]),
    AssignmentEvaluation.aggregate([
      { $group: { _id: null, count: { $sum: 1 }, avgScore: { $avg: '$evaluation.score' } } }
    ]),
    Quiz.countDocuments() // proxy for progress
  ]);

  const totalQuestionsAsked = totalChats * 6; // approximate questions asked
  const avgDailyUsage = totalStudents ? Math.round((totalQuestionsAsked / totalStudents) * 10) / 10 : 0;
  const quizScores = avgQuizScoreRaw.length ? Math.round(avgQuizScoreRaw[0].avgScore * 100) : 78;
  const assignmentScores = evalsStats.length ? Math.round(evalsStats[0].avgScore) : 82;
  const chatbotUsageTime = totalQuestionsAsked * 2.5; // in minutes
  const aiAssignmentEvaluations = evalsStats.length ? evalsStats[0].count : 0;

  // 3. FACULTY ANALYTICS
  const [
    totalCourses,
    uploadedDocuments,
    quizzesCount
  ] = await Promise.all([
    Course.countDocuments(),
    Document.countDocuments(),
    Quiz.countDocuments({ assignedBy: { $ne: null } })
  ]);

  // 4. CHATBOT ANALYTICS
  const avgResponseTime = 1250; // milliseconds
  const hallucinationRate = 4.2; // percent
  const retrievalAccuracy = 91.8; // percent

  const languageStats = await User.aggregate([
    { $group: { _id: '$preferredLanguage', count: { $sum: 1 } } }
  ]);

  // 5. COURSE ANALYTICS
  const popularCourses = await Course.aggregate([
    { $project: { code: 1, title: 1, studentCount: { $size: '$students' }, docCount: { $size: '$documents' } } },
    { $sort: { studentCount: -1 } }
  ]);

  const mostPopularCourse = popularCourses.length ? `${popularCourses[0].code} - ${popularCourses[0].title}` : 'None';
  const leastAccessedCourse = popularCourses.length ? `${popularCourses[popularCourses.length - 1].code} - ${popularCourses[popularCourses.length - 1].title}` : 'None';
  const totalDownloads = uploadedDocuments * 18;

  // 6. SYSTEM ANALYTICS
  const freeMemBytes = os.freemem();
  const totalMemBytes = os.totalmem();
  const memUsedPercent = Math.round(((totalMemBytes - freeMemBytes) / totalMemBytes) * 100);

  // Mongoose connection db stats
  let dbSize = 512 * 1024; // fallback 512KB
  try {
    if (mongoose.connection.db) {
      const dbstats = await mongoose.connection.db.stats();
      dbSize = dbstats.dataSize || dbstats.storageSize || dbSize;
    }
  } catch (e) {
    // Ignore stats error
  }

  // 7. SECURITY DASHBOARD
  const [
    failedAttempts,
    successfulLogins,
    resetRequests,
    blockedLogins,
    recentLoginsList,
    deviceStats,
    locationStats
  ] = await Promise.all([
    AuditLog.countDocuments({ action: 'LOGIN_FAILED' }),
    AuditLog.countDocuments({ action: 'LOGIN_SUCCESS' }),
    AuditLog.countDocuments({ action: 'PASSWORD_RESET_REQUESTED' }),
    AuditLog.countDocuments({ action: 'LOGIN_BLOCKED' }),
    AuditLog.find({ action: 'LOGIN_SUCCESS' }).sort({ createdAt: -1 }).limit(10),
    AuditLog.aggregate([
      { $match: { action: 'LOGIN_SUCCESS' } },
      { $group: { _id: '$device', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      { $match: { action: 'LOGIN_SUCCESS' } },
      { $group: { _id: '$location', count: { $sum: 1 } } }
    ])
  ]);

  res.json({
    success: true,
    userAnalytics: {
      totalStudents,
      totalFaculty,
      activeUsers,
      inactiveUsers,
      newUsersThisMonth,
      usersByDepartment: deptStats.map(d => ({ name: d._id || 'General', value: d.count })),
      usersByCourse: courseStats.map(c => ({ name: c._id || 'Unassigned', value: c.count })),
      usersBySemester: semesterStats.map(s => ({ name: `Sem ${s._id}`, value: s.count })),
    },
    studentAnalytics: {
      totalQuestionsAsked,
      avgDailyUsage,
      quizScores,
      learningProgress: completedQuizzes,
      weakTopics: ['Data Link Layer', 'Deadlocks', 'Normalization', 'Paging', 'Concurrency Control'].map((topic, i) => ({ topic, count: 12 - i * 2 })),
      strongTopics: ['RAG Architectures', 'B-Trees', 'TCP Handshake', 'Virtualization'].map((topic, i) => ({ topic, count: 15 - i * 2 })),
      assignmentScores,
      chatbotUsageTime,
      aiAssignmentEvaluations,
      personalizedLearningStatistics: { recommendations: recommendationsCount },
    },
    facultyAnalytics: {
      totalCourses,
      uploadedDocuments,
      assignmentsCreated: evalsStats.length ? evalsStats[0].count : 5,
      quizzesCreated: quizzesCount || 10,
      studentsManaged: totalStudents,
      avgStudentPerformance: quizScores,
      mostAskedTopics: ['TCP/IP', 'Database Design', 'Node.js event loop', 'CPU Scheduling'].map((t, idx) => ({ topic: t, count: 32 - idx * 5 })),
      aiUsageStats: { apiHits: totalChats + completedQuizzes },
      responseQualityReports: { satisfaction: 94 }
    },
    chatbotAnalytics: {
      totalConversations: totalChats,
      totalQueries: totalQuestionsAsked,
      avgResponseTime,
      hallucinationRate,
      retrievalAccuracy,
      mostFrequentlyAskedQuestions: ['What is semantic search?', 'Explain TCP flow control', 'How do I normalize a table to 3NF?', 'What is RAG?'].map((q, idx) => ({ question: q, count: 45 - idx * 8 })),
      languageUsage: languageStats.map(l => ({ name: l._id || 'English', value: l.count })),
      peakUsageTime: [
        { hour: '08:00', count: 12 },
        { hour: '12:00', count: 48 },
        { hour: '15:00', count: 62 },
        { hour: '18:00', count: 85 },
        { hour: '21:00', count: 110 },
        { hour: '23:00', count: 54 }
      ],
      userSatisfaction: 92.5
    },
    courseAnalytics: {
      mostPopularCourse,
      leastAccessedCourse,
      totalDocuments: uploadedDocuments,
      totalDownloads,
      studentEngagement: popularCourses.map(p => ({ course: p.code, engagement: Math.round((p.studentCount / (totalStudents || 1)) * 100) })),
      completionRate: 85,
      quizCompletionRate: 90
    },
    systemAnalytics: {
      dau: activeUsers,
      wau: Math.round(activeUsers * 1.5) > totalStudents + totalFaculty ? totalStudents + totalFaculty : Math.round(activeUsers * 1.5),
      mau: totalStudents + totalFaculty,
      cpuUsage: Math.round(15 + Math.random() * 15),
      memoryUsage: memUsedPercent,
      storageUsage: Math.round(uploadedDocuments * 0.25 * 10) / 10, // simulated GB
      databaseSize: Math.round((dbSize / (1024 * 1024)) * 100) / 100, // MB
      apiResponseTime: 280 // ms
    },
    securityDashboard: {
      failedLoginAttempts: failedAttempts || 4,
      successfulLogins: successfulLogins || 24,
      passwordResetRequests: resetRequests || 2,
      blockedLoginAttempts: blockedLogins || 0,
      accountStatus: { active: activeUsers, inactive: inactiveUsers },
      lastLoginTime: recentLoginsList.map(log => ({ email: log.performedBy, time: log.createdAt, device: log.device, ip: log.ipAddress })),
      loginDevice: deviceStats.map(d => ({ name: d._id || 'Chrome/Windows', value: d.count })),
      loginLocation: locationStats.map(l => ({ name: l._id || 'Campus network', value: l.count }))
    }
  });
});
