import api from './api';

export interface Bookmark {
  _id: string;
  itemType: string;
  itemId: string;
  title: string;
  category: string;
  isFavorite: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const bookmarkService = {
  create: async (data: {
    itemType: string;
    itemId: string;
    title: string;
    category?: string;
    isFavorite?: boolean;
    metadata?: Record<string, any>;
  }) => {
    const res = await api.post<{ success: boolean; bookmark: Bookmark }>('/bookmarks', data);
    return res.data.bookmark;
  },

  list: async (filters?: {
    type?: string;
    category?: string;
    search?: string;
    sort?: string;
    favorite?: boolean;
  }) => {
    const res = await api.get<{ success: boolean; bookmarks: Bookmark[]; categories: string[] }>('/bookmarks', {
      params: filters,
    });
    return res.data;
  },

  update: async (id: string, updates: { isFavorite?: boolean; category?: string; title?: string }) => {
    const res = await api.put<{ success: boolean; bookmark: Bookmark }>(`/bookmarks/${id}`, updates);
    return res.data.bookmark;
  },

  remove: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/bookmarks/${id}`);
    return res.data;
  },

  getCount: async () => {
    const res = await api.get<{ success: boolean; count: number }>('/bookmarks/count');
    return res.data.count;
  },
};
