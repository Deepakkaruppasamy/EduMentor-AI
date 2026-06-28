// ─── Messaging Module Types ──────────────────────────────────────────────────

export interface MsgAttachment {
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
}

export interface MsgDeliveryReceipt {
  user: string;
  at: string;
}

export interface MsgReadReceipt {
  user: string;
  at: string;
}

export interface MsgParticipant {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'faculty' | 'admin';
  department?: string;
  profileImage?: string;
  useCustomPhoto?: boolean;
}

export interface MsgConversation {
  _id: string;
  participants: MsgParticipant[];
  lastMessage?: {
    _id: string;
    content: string;
    messageType: string;
    sender: { _id: string; name: string };
    createdAt: string;
    readBy?: MsgReadReceipt[];
  };
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MsgMessage {
  _id: string;
  conversation: string;
  sender: MsgParticipant;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'emoji';
  attachments: MsgAttachment[];
  replyTo?: {
    _id: string;
    content: string;
    sender: { _id: string; name: string };
    messageType: string;
    createdAt: string;
  };
  isEdited: boolean;
  editedAt?: string;
  deletedFor: string[];
  deliveredTo: MsgDeliveryReceipt[];
  readBy: MsgReadReceipt[];
  isPinned: boolean;
  pinnedBy?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export type DiscussionCategory =
  | 'General Questions'
  | 'Assignments'
  | 'Exams'
  | 'Lab'
  | 'Course Materials'
  | 'Announcements';

export const DISCUSSION_CATEGORIES: DiscussionCategory[] = [
  'General Questions',
  'Assignments',
  'Exams',
  'Lab',
  'Course Materials',
  'Announcements',
];

export interface MsgDiscussion {
  _id: string;
  course: string;
  author: MsgParticipant;
  title: string;
  content: string;
  category: DiscussionCategory;
  isResolved: boolean;
  resolvedBy?: { _id: string; name: string };
  resolvedAt?: string;
  replyCount: number;
  lastReplyAt?: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MsgDiscussionReply {
  _id: string;
  discussion: string;
  author: MsgParticipant;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'emoji';
  attachments: MsgAttachment[];
  parentReply?: string;
  depth: number;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export type MsgNotificationType =
  | 'private_message'
  | 'public_reply'
  | 'faculty_replied'
  | 'student_replied'
  | 'mention'
  | 'discussion_resolved';

export interface MsgNotification {
  _id: string;
  recipient: string;
  type: MsgNotificationType;
  title: string;
  body: string;
  relatedConversation?: string;
  relatedDiscussion?: string;
  relatedMessage?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}
