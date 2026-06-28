import api from './api';

export interface SupportTicketData {
  _id: string;
  ticketId: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  subject: string;
  description: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Waiting for User' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessageData {
  _id: string;
  ticket: string;
  sender?: string;
  senderName: string;
  role: 'student' | 'faculty' | 'admin' | 'system' | 'ai';
  content: string;
  createdAt: string;
}

export interface TicketHistoryData {
  _id: string;
  ticket: string;
  changedBy: string;
  changedByName: string;
  field: 'status' | 'priority' | 'assignedTo';
  oldValue: string;
  newValue: string;
  createdAt: string;
}

export const supportService = {
  // Chatbot
  queryChat: (messages: { role: 'user' | 'assistant'; content: string }[]) =>
    api.post<{ success: boolean; data: { role: string; content: string } }>('/support/chat', { messages }),

  // Tickets
  createTicket: (data: { subject: string; description: string; category: string; priority?: string }) =>
    api.post<{ success: boolean; data: SupportTicketData }>('/support/ticket/create', data),

  getTickets: () =>
    api.get<{ success: boolean; data: SupportTicketData[] }>('/support/tickets'),

  getTicketDetails: (id: string) =>
    api.get<{
      success: boolean;
      data: {
        ticket: SupportTicketData;
        messages: SupportMessageData[];
        timeline: TicketHistoryData[];
      };
    }>(`/support/tickets/${id}`),

  replyToTicket: (id: string, content: string) =>
    api.post<{ success: boolean; data: SupportMessageData }>(`/support/tickets/${id}/message`, { content }),

  updateTicketAdmin: (id: string, updates: { status?: string; priority?: string; assignedToId?: string | null }) =>
    api.put<{ success: boolean; data: SupportTicketData }>(`/support/ticket/update/${id}`, updates),

  // CSAT Feedback
  submitFeedback: (data: { ticketId: string; rating: string; comments?: string }) =>
    api.post<{ success: boolean; data: any }>('/support/feedback', data),

  // Announcements
  createAnnouncement: (data: { title: string; content: string; targetRole?: string }) =>
    api.post<{ success: boolean; data: any }>('/support/announcements', data),

  getAnnouncements: () =>
    api.get<{ success: boolean; data: any[] }>('/support/announcements'),

  // Analytics (Admin only)
  getAnalytics: () =>
    api.get<{ success: boolean; data: any }>('/support/analytics'),
};
