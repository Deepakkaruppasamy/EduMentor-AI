import { create } from 'zustand';
import { SupportTicketData, SupportMessageData, TicketHistoryData } from '../services/support.service';

interface SupportStore {
  tickets: SupportTicketData[];
  activeTicket: SupportTicketData | null;
  ticketMessages: SupportMessageData[];
  ticketTimeline: TicketHistoryData[];
  announcements: any[];
  loadingTickets: boolean;
  loadingDetails: boolean;

  setTickets: (tickets: SupportTicketData[]) => void;
  setActiveTicket: (ticket: SupportTicketData | null) => void;
  addTicket: (ticket: SupportTicketData) => void;
  updateTicketInList: (ticketId: string, updates: Partial<SupportTicketData>) => void;
  setTicketDetails: (messages: SupportMessageData[], timeline: TicketHistoryData[]) => void;
  addTicketMessage: (message: SupportMessageData) => void;
  setAnnouncements: (announcements: any[]) => void;
  addAnnouncement: (announcement: any) => void;
  setLoadingTickets: (loading: boolean) => void;
  setLoadingDetails: (loading: boolean) => void;
}

export const useSupportStore = create<SupportStore>((set) => ({
  tickets: [],
  activeTicket: null,
  ticketMessages: [],
  ticketTimeline: [],
  announcements: [],
  loadingTickets: false,
  loadingDetails: false,

  setTickets: (tickets) => set({ tickets }),
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
  addTicket: (ticket) =>
    set((s) => ({
      tickets: [ticket, ...s.tickets.filter((t) => t._id !== ticket._id)],
    })),
  updateTicketInList: (ticketId, updates) =>
    set((s) => ({
      tickets: s.tickets.map((t) => (t._id === ticketId ? { ...t, ...updates } : t)),
      activeTicket:
        s.activeTicket?._id === ticketId ? { ...s.activeTicket, ...updates } : s.activeTicket,
    })),
  setTicketDetails: (messages, timeline) =>
    set({ ticketMessages: messages, ticketTimeline: timeline }),
  addTicketMessage: (message) =>
    set((s) => {
      if (s.ticketMessages.some((m) => m._id === message._id)) return s;
      return { ticketMessages: [...s.ticketMessages, message] };
    }),
  setAnnouncements: (announcements) => set({ announcements }),
  addAnnouncement: (announcement) =>
    set((s) => ({
      announcements: [announcement, ...s.announcements],
    })),
  setLoadingTickets: (loading) => set({ loadingTickets: loading }),
  setLoadingDetails: (loading) => set({ loadingDetails: loading }),
}));
