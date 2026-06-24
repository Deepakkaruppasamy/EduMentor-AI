import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course';
import User from '../models/User';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const PREDEFINED_COURSES = [
  { title: 'Database Management Systems', code: 'DBMS101', description: 'Study of database design, SQL, normalization, and transactions.' },
  { title: 'Operating Systems', code: 'OS201', description: 'Process management, memory, file systems, and concurrency.' },
  { title: 'Computer Networks', code: 'CN301', description: 'Network protocols, TCP/IP, routing, and security.' },
  { title: 'Data Structures', code: 'DS401', description: 'Arrays, linked lists, trees, graphs, and algorithm complexity.' },
  { title: 'Machine Learning', code: 'ML501', description: 'Supervised, unsupervised learning, neural networks, and model evaluation.' },
];

export const createCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, code, description } = req.body;

  const chromaCollection = `course_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const course = await Course.create({
    title,
    code,
    description,
    faculty: req.user?._id,
    chromaCollection,
  });

  res.status(201).json({ success: true, course });
});

export const getAllCourses = asyncHandler(async (_req: Request, res: Response) => {
  const courses = await Course.find({ isActive: true })
    .populate('faculty', 'name email')
    .sort({ createdAt: -1 });
  res.json({ success: true, count: courses.length, courses });
});

export const getCourseById = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.id)
    .populate('faculty', 'name email')
    .populate('students', 'name email')
    .populate('documents', 'originalName fileType processingStatus createdAt');

  if (!course) {
    return res.status(404).json({ success: false, message: 'Course not found' });
  }

  res.json({ success: true, course });
});

export const enrollStudent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId } = req.body;
  const studentId = req.user?._id;

  const course = await Course.findByIdAndUpdate(
    courseId,
    { $addToSet: { students: studentId } },
    { new: true }
  );

  await User.findByIdAndUpdate(studentId, { $addToSet: { courses: courseId } });

  res.json({ success: true, message: 'Enrolled successfully', course });
});

export const seedPredefinedCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const results = [];
  for (const c of PREDEFINED_COURSES) {
    const existing = await Course.findOne({ code: c.code });
    if (!existing) {
      const chromaCollection = `course_${c.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const course = await Course.create({
        ...c,
        faculty: req.user?._id,
        chromaCollection,
      });
      results.push(course);
    }
  }
  res.json({ success: true, message: `Created ${results.length} predefined courses`, courses: results });
});

export const getMyCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?._id).populate({
    path: 'courses',
    populate: { path: 'faculty', select: 'name' },
  });
  res.json({ success: true, courses: user?.courses || [] });
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Course deleted' });
});
