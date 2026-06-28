import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { uploadImage, uploadAudio, uploadFile } from '../middleware/messaging-upload';
import {
  getConversations,
  startConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  togglePinMessage,
  searchMessages,
  getFacultyList,
  getStudentList,
  uploadImageHandler,
  uploadAudioHandler,
  uploadFileHandler,
  getCourseDiscussions,
  createDiscussion,
  getDiscussion,
  replyToDiscussion,
  resolveDiscussion,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  getConversationsAdmin,
  getMessagesAdmin,
  deleteMessageAdmin,
  deleteDiscussionAdmin,
  deleteDiscussionReplyAdmin,
  restrictUserMessaging,
  getChatSessionsAdmin,
  getChatMessagesAdmin,
  deleteChatAdmin,
  getQuizzesAdmin,
  getQuizDetailAdmin,
  deleteQuizAdmin,
} from '../controllers/messaging.controller';

const router = Router();

// All routes require authentication
router.use(protect);

// ── Admin Moderation ─────────────────────────────────────────
router.get('/admin/conversations', authorize('admin'), getConversationsAdmin);
router.get('/admin/conversations/:id/messages', authorize('admin'), getMessagesAdmin);
router.delete('/admin/messages/:id', authorize('admin'), deleteMessageAdmin);
router.delete('/admin/discussions/:id', authorize('admin'), deleteDiscussionAdmin);
router.delete('/admin/discussions/replies/:id', authorize('admin'), deleteDiscussionReplyAdmin);
router.put('/admin/users/:id/restrict-messaging', authorize('admin'), restrictUserMessaging);
router.get('/admin/chats/sessions', authorize('admin'), getChatSessionsAdmin);
router.get('/admin/chats/:id/messages', authorize('admin'), getChatMessagesAdmin);
router.delete('/admin/chats/:id', authorize('admin'), deleteChatAdmin);
router.get('/admin/quizzes', authorize('admin'), getQuizzesAdmin);
router.get('/admin/quizzes/:id', authorize('admin'), getQuizDetailAdmin);
router.delete('/admin/quizzes/:id', authorize('admin'), deleteQuizAdmin);

// ── Private Chat ────────────────────────────────────────────
router.get('/conversations', getConversations);
router.post('/conversations/start', startConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/messages/send', sendMessage);
router.put('/messages/:id', editMessage);
router.delete('/messages/:id', deleteMessage);
router.put('/messages/:id/pin', authorize('faculty', 'admin'), togglePinMessage);
router.get('/messages/search', searchMessages);

// ── User Lists ──────────────────────────────────────────────
router.get('/users/faculty', getFacultyList);
router.get('/users/students', authorize('faculty', 'admin'), getStudentList);

// ── File Uploads ────────────────────────────────────────────
router.post('/upload/image', uploadImage.single('image'), uploadImageHandler);
router.post('/upload/audio', uploadAudio.single('audio'), uploadAudioHandler);
router.post('/upload/file', uploadFile.single('file'), uploadFileHandler);

// ── Discussion Boards ───────────────────────────────────────
router.get('/discussions/course/:courseId', getCourseDiscussions);
router.post('/discussions', createDiscussion);
router.get('/discussions/:id', getDiscussion);
router.post('/discussions/:id/reply', replyToDiscussion);
router.put('/discussions/:id/resolve', resolveDiscussion);

// ── Notifications ───────────────────────────────────────────
router.get('/notifications', getNotifications);
router.put('/notifications/read', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
