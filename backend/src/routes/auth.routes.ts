import { Router } from 'express';
import { register, login, getMe, getAllUsers, updateUser } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateUser);
router.get('/users', protect, authorize('admin', 'faculty'), getAllUsers);

export default router;
