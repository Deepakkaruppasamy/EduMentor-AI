import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  requestAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getFacultyList,
} from '../controllers/appointment.controller';

const router = Router();
router.use(protect);

router.get('/faculty', getFacultyList);
router.post('/', requestAppointment);
router.get('/my', getMyAppointments);
router.get('/all', authorize('admin'), getAllAppointments);
router.put('/:id/status', updateAppointmentStatus); // faculty / admin
router.put('/:id/cancel', cancelAppointment);       // student

export default router;
