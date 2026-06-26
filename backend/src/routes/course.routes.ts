import { Router } from 'express';
import {
  createCourse,
  getAllCourses,
  getCourseById,
  enrollStudent,
  seedPredefinedCourses,
  getMyCourses,
  deleteCourse,
  updateCourse,
} from '../controllers/course.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/create', protect, authorize('faculty', 'admin'), createCourse);
router.get('/all', getAllCourses);
router.get('/my', protect, getMyCourses);
router.get('/:id', protect, getCourseById);
router.post('/enroll', protect, authorize('student'), enrollStudent);
router.post('/seed', protect, authorize('faculty', 'admin'), seedPredefinedCourses);
router.put('/:id', protect, authorize('faculty', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('faculty', 'admin'), deleteCourse);

export default router;
