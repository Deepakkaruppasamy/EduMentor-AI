import api from './api';

export interface RecentlyViewedItem {
  _id: string;
  itemType: string;
  itemId: string;
  title: string;
  url: string;
  isPinned: boolean;
  viewedAt: string;
}

export const recentlyViewedService = {
  record: async (data: { itemType: string; itemId: string; title: string; url: string }) => {
    const res = await api.post<{ success: boolean; item: RecentlyViewedItem }>('/recently-viewed', data);
    return res.data.item;
  },

  list: async (filters?: { type?: string; search?: string }) => {
    const res = await api.get<{ success: boolean; history: RecentlyViewedItem[] }>('/recently-viewed', {
      params: filters,
    });
    return res.data.history;
  },

  togglePin: async (id: string) => {
    const res = await api.put<{ success: boolean; item: RecentlyViewedItem }>(`/recently-viewed/${id}/pin`);
    return res.data.item;
  },

  remove: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/recently-viewed/${id}`);
    return res.data;
  },

  clear: async () => {
    const res = await api.delete<{ success: boolean; message: string }>('/recently-viewed');
    return res.data;
  },
};
