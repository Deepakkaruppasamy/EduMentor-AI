import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import RecentlyViewed from '../models/RecentlyViewed';
import { asyncHandler } from '../middleware/errorHandler';

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/recently-viewed
───────────────────────────────────────────────────────────────────────────── */
export const recordView = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { itemType, itemId, title, url } = req.body;

  if (!itemType || !itemId || !title || !url) {
    return res.status(400).json({ success: false, message: 'itemType, itemId, title, and url are required.' });
  }

  // Upsert history item
  let item = await RecentlyViewed.findOne({ userId, itemType, itemId });

  if (item) {
    item.viewedAt = new Date();
    item.title = title;
    item.url = url;
    await item.save();
  } else {
    item = await RecentlyViewed.create({
      userId,
      itemType,
      itemId,
      title,
      url,
      viewedAt: new Date(),
    });
  }

  // Cleanup: only keep top 50 items
  const count = await RecentlyViewed.countDocuments({ userId });
  if (count > 50) {
    const oldestToKeep = await RecentlyViewed.find({ userId })
      .sort({ viewedAt: -1 })
      .skip(49)
      .limit(1);

    if (oldestToKeep.length > 0) {
      await RecentlyViewed.deleteMany({
        userId,
        viewedAt: { $lt: oldestToKeep[0].viewedAt },
        isPinned: false, // Don't purge pinned items
      });
    }
  }

  res.json({ success: true, item });
});

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/recently-viewed
───────────────────────────────────────────────────────────────────────────── */
export const getViewHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { type, search } = req.query as Record<string, string>;

  const filter: Record<string, any> = { userId };

  if (type) filter.itemType = type;
  if (search) filter.title = { $regex: search, $options: 'i' };

  // Sort pinned items first, then by viewed time descending
  const history = await RecentlyViewed.find(filter)
    .sort({ isPinned: -1, viewedAt: -1 })
    .lean();

  res.json({ success: true, history });
});

/* ─────────────────────────────────────────────────────────────────────────────
   PUT /api/recently-viewed/:id/pin
───────────────────────────────────────────────────────────────────────────── */
export const togglePinItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;

  const item = await RecentlyViewed.findOne({ _id: id, userId });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found in history.' });
  }

  item.isPinned = !item.isPinned;
  await item.save();

  res.json({ success: true, message: item.isPinned ? 'Item pinned' : 'Item unpinned', item });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/recently-viewed/:id
───────────────────────────────────────────────────────────────────────────── */
export const deleteViewedItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;

  const item = await RecentlyViewed.findOneAndDelete({ _id: id, userId });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found in history.' });
  }

  res.json({ success: true, message: 'Item removed from history' });
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/recently-viewed
───────────────────────────────────────────────────────────────────────────── */
export const clearViewHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!._id;

  // Delete all unpinned items. Pinned items are preserved.
  await RecentlyViewed.deleteMany({ userId, isPinned: false });

  res.json({ success: true, message: 'History cleared (pinned items preserved)' });
});
