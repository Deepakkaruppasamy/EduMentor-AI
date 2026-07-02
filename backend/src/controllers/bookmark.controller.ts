import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Bookmark from '../models/Bookmark';
import { asyncHandler } from '../middleware/errorHandler';

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/bookmarks
───────────────────────────────────────────────────────────────────────────── */
export const createBookmark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { itemType, itemId, title, category, isFavorite, metadata } = req.body;

  if (!itemType || !itemId || !title) {
    return res.status(400).json({ success: false, message: 'itemType, itemId, and title are required.' });
  }

  // Check if already bookmarked
  let bookmark = await Bookmark.findOne({ userId, itemType, itemId });

  if (bookmark) {
    bookmark.title = title;
    if (category !== undefined) bookmark.category = category;
    if (isFavorite !== undefined) bookmark.isFavorite = isFavorite;
    if (metadata !== undefined) bookmark.metadata = metadata;
    await bookmark.save();
  } else {
    bookmark = await Bookmark.create({
      userId,
      itemType,
      itemId,
      title,
      category: category || 'General',
      isFavorite: !!isFavorite,
      metadata,
    });
  }

  res.json({ success: true, message: 'Bookmark saved successfully', bookmark });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bookmarks
───────────────────────────────────────────────────────────────────────────── */
export const getBookmarks = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { type, category, search, sort, favorite } = req.query as Record<string, string>;

  const filter: Record<string, any> = { userId };

  if (type) filter.itemType = type;
  if (category) filter.category = { $regex: category, $options: 'i' };
  if (favorite === 'true') filter.isFavorite = true;
  if (search) filter.title = { $regex: search, $options: 'i' };

  let query = Bookmark.find(filter);

  // Sorting
  if (sort === 'title') {
    query = query.sort({ title: 1 });
  } else if (sort === 'oldest') {
    query = query.sort({ createdAt: 1 });
  } else {
    // default: newest first
    query = query.sort({ createdAt: -1 });
  }

  const bookmarks = await query.lean();

  // Find all distinct categories for filtering UI
  const categories = await Bookmark.distinct('category', { userId });

  res.json({ success: true, bookmarks, categories });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/bookmarks/:id
───────────────────────────────────────────────────────────────────────────── */
export const updateBookmark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { isFavorite, category, title } = req.body;

  const updateFields: Record<string, any> = {};
  if (isFavorite !== undefined) updateFields.isFavorite = isFavorite;
  if (category !== undefined) updateFields.category = category;
  if (title !== undefined) updateFields.title = title;

  const bookmark = await Bookmark.findOneAndUpdate(
    { _id: id, userId },
    { $set: updateFields },
    { new: true }
  );

  if (!bookmark) {
    return res.status(404).json({ success: false, message: 'Bookmark not found.' });
  }

  res.json({ success: true, message: 'Bookmark updated successfully', bookmark });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/bookmarks/:id
───────────────────────────────────────────────────────────────────────────── */
export const deleteBookmark = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;

  const bookmark = await Bookmark.findOneAndDelete({ _id: id, userId });

  if (!bookmark) {
    return res.status(404).json({ success: false, message: 'Bookmark not found.' });
  }

  res.json({ success: true, message: 'Bookmark removed successfully' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/bookmarks/count
───────────────────────────────────────────────────────────────────────────── */
export const getBookmarksCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const count = await Bookmark.countDocuments({ userId });
  res.json({ success: true, count });
});
