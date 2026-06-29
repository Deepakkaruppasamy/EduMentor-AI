import { Router } from 'express';
import { generateFacultyMaterial } from '../controllers/faculty.controller';
import { protect, authorize } from '../middleware/auth';
import User from '../models/User';

const router = Router();

// Any authenticated user can get the faculty list (needed for feedback target selector)
router.get('/list', protect, async (_req, res) => {
  try {
    const faculty = await User.find({ role: 'faculty', isActive: true }).select('_id name department').sort({ name: 1 });
    res.json({ success: true, data: faculty });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/assistant/generate', protect, authorize('faculty', 'admin'), generateFacultyMaterial);

export default router;
