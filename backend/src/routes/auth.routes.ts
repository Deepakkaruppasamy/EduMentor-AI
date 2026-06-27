import { Router } from 'express';
import { register, login, getMe, getAllUsers, updateUser, updateAvatar, uploadImage, forgotPassword, resendOtp, resetPassword, changePassword, firstLoginChangePassword } from '../controllers/auth.controller';
import { protect, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateUser);
router.post('/upload-image', protect, upload.single('image'), uploadImage);
router.get('/users', protect, authorize('admin', 'faculty'), getAllUsers);
router.post('/forgot-password', forgotPassword);
router.post('/resend-otp', resendOtp);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);
router.post('/first-login-change', firstLoginChangePassword);
// Avatar system route
router.put('/avatar', protect, updateAvatar);

export default router;
