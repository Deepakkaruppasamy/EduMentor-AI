import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createAnnouncement,
  getAnnouncements,
  markRead,
  toggleBookmark,
  deleteAnnouncement,
  announcementUpload,
} from '../controllers/announcement.controller';

const router = Router();
router.use(protect);

router.get('/', getAnnouncements);
router.post('/', announcementUpload.array('attachments', 5), createAnnouncement);
router.put('/:id/read', markRead);
router.put('/:id/bookmark', toggleBookmark);
router.delete('/:id', deleteAnnouncement);

export default router;
