import { api } from '../lib/api';

/**
 * Entries Service
 * Master service for Entries Management Center
 * All API calls for expense management across all circles
 */

// Transform backend expense to frontend entry format
function mapBackendExpenseToEntry(e) {
  const paidBy = e.paidBy ? {
    id: e.paidBy._id || e.paidBy.id || e.paidBy,
    name: e.paidBy.name,
    email: e.paidBy.email,
    avatar: e.paidBy.avatar,
  } : null;

  const participants = (e.splits || []).map(p => ({
    memberId: p.user?._id || p.user?.id || p.user,
    share: p.amount || 0,
    percentage: p.percentage,
    shares: p.shares || 1,
    name: p.user?.name || p.user?.displayName,
    email: p.user?.email,
    avatar: p.user?.avatar,
    isGuest: p.user?.isGuest,
  }));

  return {
    id: e._id || e.id,
    groupId: e.circle?._id || e.circle || e.circleId,
    groupName: e.circle?.name,
    groupCurrency: e.circle?.currency,
    description: e.title || e.description || '',
    category: e.category?.name || e.category || 'Other',
    categoryIcon: e.category?.icon,
    categoryColor: e.category?.color,
    amount: e.amount || 0,
    currency: e.currency || 'USD',
    paidBy,
    participants,
    splitMethod: e.splitMethod || e.splitType || 'equal',
    note: e.note || e.notes || '',
    notes: e.notes || e.note || '',
    receipt: e.receipts?.[0] || e.receipt || e.receiptUrl || null,
    receipts: e.receipts || [],
    status: e.status || 'pending',
    date: e.date,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    isRecurring: e.isRecurring || false,
    tags: e.tags || [],
    isDeleted: e.isDeleted || false,
    deletedAt: e.deletedAt,
  };
}

/**
 * Get all expenses across all circles with advanced filtering
 * Master endpoint for Entries Management Center
 */
export async function getEntries(params = {}) {
  const { data } = await api.get('/expenses', { params });
  return {
    entries: (data.data || []).map(mapBackendExpenseToEntry),
    pagination: data.pagination || {},
  };
}

/**
 * Get single entry by ID
 */
export async function getEntry(entryId) {
  const { data } = await api.get(`/expenses/${entryId}`);
  return mapBackendExpenseToEntry(data.data);
}

/**
 * Get expense statistics
 */
export async function getEntryStatistics() {
  const { data } = await api.get('/expenses/statistics');
  return data.data;
}

/**
 * Global search across all expenses
 */
export async function searchEntries(query, limit = 20) {
  const { data } = await api.get('/expenses/search', {
    params: { q: query, limit },
  });
  return {
    entries: (data.data || []).map(mapBackendExpenseToEntry),
    total: data.total || 0,
  };
}

/**
 * Get expense timeline/activity log
 */
export async function getEntryTimeline(entryId) {
  const { data } = await api.get(`/expenses/timeline/${entryId}`);
  return data.data || [];
}

/**
 * Bulk delete expenses
 */
export async function bulkDeleteEntries(entryIds) {
  const { data } = await api.post('/expenses/bulk/delete', { expenseIds: entryIds });
  return data.data;
}

/**
 * Bulk archive expenses
 */
export async function bulkArchiveEntries(entryIds) {
  const { data } = await api.post('/expenses/bulk/archive', { expenseIds: entryIds });
  return data.data;
}

/**
 * Bulk restore expenses
 */
export async function bulkRestoreEntries(entryIds) {
  const { data } = await api.post('/expenses/bulk/restore', { expenseIds: entryIds });
  return data.data;
}

/**
 * Bulk update category
 */
export async function bulkUpdateCategory(entryIds, category) {
  const { data } = await api.post('/expenses/bulk/category', {
    expenseIds: entryIds,
    category,
  });
  return data.data;
}

/**
 * Bulk move expenses to another circle
 */
export async function bulkMoveToCircle(entryIds, targetCircleId) {
  const { data } = await api.post('/expenses/bulk/move', {
    expenseIds: entryIds,
    targetCircleId,
  });
  return data.data;
}

/**
 * Export expenses in various formats
 */
export async function exportEntries(format, filters = {}) {
  const response = await api.get(`/expenses/export/${format}`, {
    params: filters,
    responseType: format === 'json' ? 'json' : 'text',
  });
  return response.data;
}

/**
 * Create expense (reuse existing)
 */
export async function createEntry(payload) {
  const splits = (payload.splits || payload.participants || []).map(p => ({
    user: p.user || p.userId,
    amount: p.amount || p.share || 0,
    percentage: p.percentage,
    shares: p.shares,
  }));

  const response = await api.post('/expenses', {
    ...payload,
    circleId: payload.groupId || payload.circleId,
    paidBy: payload.paidBy,
    splits,
    title: ((payload.title || payload.description || '').trim().length >= 2 ? (payload.title || payload.description || '').trim() : 'Untitled expense'),
    notes: payload.note || payload.notes || '',
  });
  return mapBackendExpenseToEntry(response.data.data);
}

/**
 * Update expense (reuse existing)
 */
export async function updateEntry(entryId, payload) {
  const { data } = await api.patch(`/expenses/${entryId}`, payload);
  return mapBackendExpenseToEntry(data.data);
}

/**
 * Delete expense (reuse existing)
 */
export async function deleteEntry(entryId) {
  await api.delete(`/expenses/${entryId}`);
}

/**
 * Upload receipt
 */
export async function uploadReceipt(entryId, file) {
  const formData = new FormData();
  formData.append('receipt', file);
  const { data } = await api.post(`/expenses/${entryId}/receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

/**
 * Delete receipt
 */
export async function deleteReceipt(entryId) {
  await api.delete(`/expenses/${entryId}/receipt`);
}

/**
 * Get expense categories
 */
export async function getEntryCategories() {
  const { data } = await api.get('/expenses/categories');
  return data.data || [];
}