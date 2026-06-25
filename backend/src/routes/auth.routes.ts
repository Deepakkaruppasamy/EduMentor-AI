import { Router } from 'express';
import { register, login, getMe, getAllUsers, updateUser, uploadImage } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateUser);
router.post('/upload-image', protect, upload.single('image'), uploadImage);
router.get('/users', protect, authorize('admin', 'faculty'), getAllUsers);

export default router;
