import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  upsertOfficeHours,
  getAllFacultyAvailability,
  getMyOfficeHours,
  updateFacultyStatus,
  joinQueue,
  leaveQueue,
  getQueue,
  callNext,
} from '../controllers/officeHours.controller';

const router = Router();
router.use(protect);

router.get('/faculty', getAllFacultyAvailability);
router.get('/my', getMyOfficeHours);
router.post('/configure', upsertOfficeHours);
router.put('/status', updateFacultyStatus);
router.get('/queue/:facultyId', getQueue);
router.post('/queue/join', joinQueue);
router.post('/queue/leave', leaveQueue);
router.post('/queue/next', callNext);

export default router;
