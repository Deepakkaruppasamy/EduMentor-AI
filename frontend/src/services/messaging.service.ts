import api from './api';
import { MsgConversation, MsgMessage, MsgDiscussion, MsgDiscussionReply, MsgNotification, MsgAttachment } from '../types/messaging.types';

// ── Private Chat ─────────────────────────────────────────────────────────

export const messagingService = {
  // Conversations
  getConversations: () =>
    api.get<{ success: boolean; data: MsgConversation[] }>('/messaging/conversations'),

  startConversation: (participantId: string) =>
    api.post<{ success: boolean; data: MsgConversation }>('/messaging/conversations/start', { participantId }),

  getMessages: (conversationId: string, page = 1, limit = 50) =>
    api.get<{ success: boolean; data: MsgMessage[]; pagination: any }>(
      `/messaging/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    ),

  // Messages
  sendMessage: (data: {
    conversationId: string;
    content?: string;
    messageType?: string;
    replyTo?: string;
    attachments?: MsgAttachment[];
  }) => api.post<{ success: boolean; data: MsgMessage }>('/messaging/messages/send', data),

  editMessage: (messageId: string, content: string) =>
    api.put<{ success: boolean; data: MsgMessage }>(`/messaging/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    api.delete<{ success: boolean }>(`/messaging/messages/${messageId}`),

  togglePinMessage: (messageId: string) =>
    api.put<{ success: boolean; data: MsgMessage }>(`/messaging/messages/${messageId}/pin`),

  searchMessages: (params: { q: string; conversationId?: string; startDate?: string; endDate?: string }) =>
    api.get<{ success: boolean; data: MsgMessage[] }>('/messaging/messages/search', { params }),

  // User lists
  getFacultyList: () =>
    api.get<{ success: boolean; data: any[] }>('/messaging/users/faculty'),

  getStudentList: () =>
    api.get<{ success: boolean; data: any[] }>('/messaging/users/students'),

  // File uploads
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ success: boolean; data: MsgAttachment }>('/messaging/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadAudio: (blob: Blob, filename = 'voice-message.webm') => {
    const formData = new FormData();
    formData.append('audio', blob, filename);
    return api.post<{ success: boolean; data: MsgAttachment }>('/messaging/upload/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ success: boolean; data: MsgAttachment }>('/messaging/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Discussions ──────────────────────────────────────────────────────

  getCourseDiscussions: (courseId: string, category?: string) =>
    api.get<{ success: boolean; data: MsgDiscussion[] }>(
      `/messaging/discussions/course/${courseId}${category ? `?category=${encodeURIComponent(category)}` : ''}`
    ),

  createDiscussion: (data: { courseId: string; title: string; content: string; category?: string }) =>
    api.post<{ success: boolean; data: MsgDiscussion }>('/messaging/discussions', data),

  getDiscussion: (discussionId: string) =>
    api.get<{ success: boolean; data: { discussion: MsgDiscussion; replies: MsgDiscussionReply[] } }>(
      `/messaging/discussions/${discussionId}`
    ),

  replyToDiscussion: (discussionId: string, data: { content: string; parentReplyId?: string; messageType?: string; attachments?: MsgAttachment[] }) =>
    api.post<{ success: boolean; data: MsgDiscussionReply }>(
      `/messaging/discussions/${discussionId}/reply`,
      data
    ),

  resolveDiscussion: (discussionId: string) =>
    api.put<{ success: boolean; data: MsgDiscussion }>(`/messaging/discussions/${discussionId}/resolve`),

  // ── Notifications ────────────────────────────────────────────────────

  getNotifications: () =>
    api.get<{ success: boolean; data: MsgNotification[] }>('/messaging/notifications'),

  markAllNotificationsRead: () =>
    api.put('/messaging/notifications/read'),

  markNotificationRead: (notificationId: string) =>
    api.put(`/messaging/notifications/${notificationId}/read`),

  // ── Admin Moderation ──────────────────────────────────────────────────
  getConversationsAdmin: () =>
    api.get<{ success: boolean; data: MsgConversation[] }>('/messaging/admin/conversations'),

  getMessagesAdmin: (conversationId: string) =>
    api.get<{ success: boolean; data: MsgMessage[] }>(`/messaging/admin/conversations/${conversationId}/messages`),

  deleteMessageAdmin: (messageId: string) =>
    api.delete<{ success: boolean }>(`/messaging/admin/messages/${messageId}`),

  deleteDiscussionAdmin: (discussionId: string) =>
    api.delete<{ success: boolean }>(`/messaging/admin/discussions/${discussionId}`),

  deleteDiscussionReplyAdmin: (replyId: string) =>
    api.delete<{ success: boolean }>(`/messaging/admin/discussions/replies/${replyId}`),

  restrictUserMessaging: (userId: string, restrict: boolean) =>
    api.put<{ success: boolean; data: any }>(`/messaging/admin/users/${userId}/restrict-messaging`, { restrict }),

  // AI Chat audits
  getChatSessionsAdmin: () =>
    api.get<{ success: boolean; data: any[] }>('/messaging/admin/chats/sessions'),

  getChatMessagesAdmin: (sessionId: string) =>
    api.get<{ success: boolean; data: any }>(`/messaging/admin/chats/${sessionId}/messages`),

  deleteChatAdmin: (sessionId: string) =>
    api.delete<{ success: boolean }>(`/messaging/admin/chats/${sessionId}`),

  // Quiz audits
  getQuizzesAdmin: () =>
    api.get<{ success: boolean; data: any[] }>('/messaging/admin/quizzes'),

  getQuizDetailAdmin: (quizId: string) =>
    api.get<{ success: boolean; data: any }>(`/messaging/admin/quizzes/${quizId}`),

  deleteQuizAdmin: (quizId: string) =>
    api.delete<{ success: boolean }>(`/messaging/admin/quizzes/${quizId}`),
};
