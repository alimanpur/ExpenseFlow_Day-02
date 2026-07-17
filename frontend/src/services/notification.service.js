import { api } from '../lib/api';

export async function getNotifications(params = {}) {
  const { data } = await api.get('/notifications', { params });
  return {
    notifications: data.data || [],
    meta: data.meta || {},
    unreadCount: data.meta?.unreadCount ?? (data.unreadCount || 0),
  };
}

export async function markAsRead(notificationId) {
  const { data } = await api.patch(`/notifications/${notificationId}/read`);
  return data.data;
}

export async function markAllAsRead() {
  const { data } = await api.patch('/notifications/read-all');
  return data.data;
}

export async function deleteNotification(notificationId) {
  const { data } = await api.delete(`/notifications/${notificationId}`);
  return data.data;
}

export async function getNotificationPreferences() {
  const { data } = await api.get('/notifications/preferences');
  return data.data || {};
}

export async function updateNotificationPreferences(preferences) {
  const { data } = await api.patch('/notifications/preferences', preferences);
  return data.data;
}