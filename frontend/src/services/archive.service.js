import { api } from '../lib/api';

export async function getArchivedExpenses(params = {}) {
  const { data } = await api.get('/expenses', { 
    params: { ...params, isArchived: true } 
  });
  return {
    expenses: (data.data || []).map(mapBackendExpense),
    meta: data.meta || {}
  };
}

export async function restoreExpense(expenseId) {
  const { data } = await api.patch(`/expenses/${expenseId}/restore`);
  return data.data;
}

export async function permanentlyDeleteExpense(expenseId) {
  const { data } = await api.delete(`/expenses/${expenseId}/permanent`);
  return data.data;
}

function mapBackendExpense(e) {
  return {
    id: e._id || e.id,
    groupId: e.groupId || e.circleId || e.circle?._id,
    groupName: e.circle?.name || e.groupName || '',
    description: e.description || e.title || '',
    category: e.category || 'Other',
    amount: e.amount || 0,
    currency: e.currency || 'USD',
    paidBy: e.paidBy || e.payer || null,
    date: e.date || e.createdAt ? new Date(e.date || e.createdAt).toISOString().split('T')[0] : '',
    splitMethod: e.splitMethod || e.splitType || 'equal',
    participants: (e.participants || e.splits || []).map((p) => ({
      memberId: p.memberId || p.user || p.userId,
      share: p.share || p.amount || 0,
    })),
    note: e.note || e.notes || '',
    receipt: e.receipt || e.receiptUrl || null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    isArchived: e.isArchived || false,
    archivedAt: e.archivedAt,
  };
}