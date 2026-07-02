import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createBookmark,
  getBookmarks,
  updateBookmark,
  deleteBookmark,
  getBookmarksCount,
} from '../controllers/bookmark.controller';

const router = Router();

router.use(protect);

router.post('/', createBookmark);
router.get('/', getBookmarks);
router.get('/count', getBookmarksCount);
router.put('/:id', updateBookmark);
router.delete('/:id', deleteBookmark);

export default router;
