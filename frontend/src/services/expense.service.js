import { api } from '../lib/api';

function mapBackendExpense(e) {
  const paidBy = e.paidBy ? {
    id: e.paidBy._id || e.paidBy.id || e.paidBy,
    name: e.paidBy.name,
    email: e.paidBy.email,
    avatar: e.paidBy.avatar,
  } : null;

  const participants = (e.splits || []).map(p => ({
    memberId: p.user?._id || p.user?.id || p.user,
    share: p.amount || 0,
    name: p.user?.name || p.user?.displayName,
    email: p.user?.email,
    avatar: p.user?.avatar,
    isGuest: p.user?.isGuest,
  }));

  return {
    id: e._id || e.id,
    groupId: e.circle?._id || e.circle || e.circleId,
    groupName: e.circle?.name,
    description: e.title || e.description || '',
    category: e.category?.name || e.category || 'Other',
    amount: e.amount || 0,
    currency: e.currency || 'USD',
    paidBy,
    participants,
    splitMethod: e.splitMethod || e.splitType || 'equal',
    note: e.note || e.notes || '',
    receipt: e.receipt || e.receiptUrl || null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export async function getUserExpenses(params = {}) {
  const { data } = await api.get('/expenses/me', { params });
  return (data.data || []).map(mapBackendExpense);
}

export async function getCircleExpenses(circleId, params = {}) {
  const { data } = await api.get(`/expenses/circle/${circleId}`, { params });
  return (data.data || []).map(mapBackendExpense);
}

export async function getExpense(expenseId) {
  const { data } = await api.get(`/expenses/${expenseId}`);
  return mapBackendExpense(data.data);
}

export async function createExpense(payload) {
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
   return mapBackendExpense(response.data.data);
  }

export async function updateExpense(expenseId, payload) {
  const { data } = await api.patch(`/expenses/${expenseId}`, payload);
  return mapBackendExpense(data.data);
}

export async function deleteExpense(expenseId) {
  await api.delete(`/expenses/${expenseId}`);
}

export async function uploadReceipt(expenseId, file) {
  const formData = new FormData();
  formData.append('receipt', file);
  const { data } = await api.post(`/expenses/${expenseId}/receipt`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteReceipt(expenseId) {
  await api.delete(`/expenses/${expenseId}/receipt`);
}

export async function getExpenseCategories() {
  const { data } = await api.get('/expenses/categories');
  return data.data || [];
}