import { create } from 'zustand';
import { MsgConversation, MsgMessage, MsgDiscussion, MsgDiscussionReply, MsgNotification } from '../types/messaging.types';

interface TypingUser {
  userId: string;
  userName: string;
}

interface MessagingStore {
  // Conversations
  conversations: MsgConversation[];
  activeConversation: MsgConversation | null;
  messages: MsgMessage[];
  messagesLoading: boolean;

  // Discussions
  discussions: MsgDiscussion[];
  activeDiscussion: MsgDiscussion | null;
  discussionReplies: MsgDiscussionReply[];

  // Real-time state
  onlineUsers: Set<string>;
  typingUsers: Map<string, TypingUser[]>; // conversationId -> typing users
  unreadCounts: Map<string, number>;

  // Notifications
  notifications: MsgNotification[];
  unreadNotifCount: number;

  // Active tab
  activeTab: 'chats' | 'discussions' | 'moderate';

  // Actions — Conversations
  setConversations: (convos: MsgConversation[]) => void;
  setActiveConversation: (conv: MsgConversation | null) => void;
  addConversation: (conv: MsgConversation) => void;
  updateConversation: (convId: string, updates: Partial<MsgConversation>) => void;

  // Actions — Messages
  setMessages: (msgs: MsgMessage[]) => void;
  addMessage: (msg: MsgMessage) => void;
  updateMessage: (msgId: string, updates: Partial<MsgMessage>) => void;
  removeMessage: (msgId: string) => void;
  setMessagesLoading: (loading: boolean) => void;

  // Actions — Discussions
  setDiscussions: (discussions: MsgDiscussion[]) => void;
  setActiveDiscussion: (disc: MsgDiscussion | null) => void;
  setDiscussionReplies: (replies: MsgDiscussionReply[]) => void;
  addDiscussionReply: (reply: MsgDiscussionReply) => void;
  updateDiscussion: (discId: string, updates: Partial<MsgDiscussion>) => void;

  // Actions — Real-time
  setOnlineUsers: (users: string[]) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setTypingUser: (conversationId: string, user: TypingUser) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  setUnreadCount: (conversationId: string, count: number) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;

  // Actions — Notifications
  setNotifications: (notifs: MsgNotification[]) => void;
  addNotification: (notif: MsgNotification) => void;
  markNotifRead: (notifId: string) => void;
  markAllNotifsRead: () => void;

  // Actions — Tab
  setActiveTab: (tab: 'chats' | 'discussions' | 'moderate') => void;
}

export const useMessagingStore = create<MessagingStore>((set, get) => ({
  // Initial state
  conversations: [],
  activeConversation: null,
  messages: [],
  messagesLoading: false,
  discussions: [],
  activeDiscussion: null,
  discussionReplies: [],
  onlineUsers: new Set(),
  typingUsers: new Map(),
  unreadCounts: new Map(),
  notifications: [],
  unreadNotifCount: 0,
  activeTab: 'chats',

  // Conversations
  setConversations: (convos) => set({ conversations: convos }),
  setActiveConversation: (conv) => set({ activeConversation: conv }),
  addConversation: (conv) =>
    set((s) => ({
      conversations: [conv, ...s.conversations.filter((c) => c._id !== conv._id)],
    })),
  updateConversation: (convId, updates) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c._id === convId ? { ...c, ...updates } : c)),
    })),

  // Messages
  setMessages: (msgs) => set({ messages: msgs }),
  addMessage: (msg) =>
    set((s) => {
      // Avoid duplicates
      if (s.messages.some((m) => m._id === msg._id)) return s;
      return { messages: [...s.messages, msg] };
    }),
  updateMessage: (msgId, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m._id === msgId ? { ...m, ...updates } : m)),
    })),
  removeMessage: (msgId) =>
    set((s) => ({
      messages: s.messages.filter((m) => m._id !== msgId),
    })),
  setMessagesLoading: (loading) => set({ messagesLoading: loading }),

  // Discussions
  setDiscussions: (discussions) => set({ discussions }),
  setActiveDiscussion: (disc) => set({ activeDiscussion: disc }),
  setDiscussionReplies: (replies) => set({ discussionReplies: replies }),
  addDiscussionReply: (reply) =>
    set((s) => ({
      discussionReplies: [...s.discussionReplies, reply],
    })),
  updateDiscussion: (discId, updates) =>
    set((s) => ({
      discussions: s.discussions.map((d) => (d._id === discId ? { ...d, ...updates } : d)),
      activeDiscussion:
        s.activeDiscussion?._id === discId
          ? { ...s.activeDiscussion, ...updates }
          : s.activeDiscussion,
    })),

  // Real-time
  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),
  setUserOnline: (userId) =>
    set((s) => {
      const updated = new Set(s.onlineUsers);
      updated.add(userId);
      return { onlineUsers: updated };
    }),
  setUserOffline: (userId) =>
    set((s) => {
      const updated = new Set(s.onlineUsers);
      updated.delete(userId);
      return { onlineUsers: updated };
    }),
  setTypingUser: (conversationId, user) =>
    set((s) => {
      const updated = new Map(s.typingUsers);
      const existing = updated.get(conversationId) || [];
      if (!existing.some((u) => u.userId === user.userId)) {
        updated.set(conversationId, [...existing, user]);
      }
      return { typingUsers: updated };
    }),
  removeTypingUser: (conversationId, userId) =>
    set((s) => {
      const updated = new Map(s.typingUsers);
      const existing = updated.get(conversationId) || [];
      updated.set(
        conversationId,
        existing.filter((u) => u.userId !== userId)
      );
      return { typingUsers: updated };
    }),
  setUnreadCount: (conversationId, count) =>
    set((s) => {
      const updated = new Map(s.unreadCounts);
      updated.set(conversationId, count);
      return { unreadCounts: updated };
    }),
  incrementUnread: (conversationId) =>
    set((s) => {
      const updated = new Map(s.unreadCounts);
      updated.set(conversationId, (updated.get(conversationId) || 0) + 1);
      return { unreadCounts: updated };
    }),
  clearUnread: (conversationId) =>
    set((s) => {
      const updated = new Map(s.unreadCounts);
      updated.set(conversationId, 0);
      return { unreadCounts: updated };
    }),

  // Notifications
  setNotifications: (notifs) =>
    set({ notifications: notifs, unreadNotifCount: notifs.filter((n) => !n.isRead).length }),
  addNotification: (notif) =>
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadNotifCount: s.unreadNotifCount + 1,
    })),
  markNotifRead: (notifId) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)),
      unreadNotifCount: Math.max(0, s.unreadNotifCount - 1),
    })),
  markAllNotifsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadNotifCount: 0,
    })),

  // Tab
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
