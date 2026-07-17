import { api } from '../lib/api';

// Resolve a stable display name from a populated Member or User object.
// Falls back: user.name → user.email → displayName → nickname → "Guest".
export function resolvePartyName(member) {
  if (!member) return 'Guest';
  const user = member.user && typeof member.user === 'object' ? member.user : null;
  return (
    user?.name ||
    user?.email ||
    member.displayName ||
    member.nickname ||
    (user && user._id ? `User ${String(user._id).slice(-4)}` : null) ||
    'Guest'
  );
}

// Map backend settlement to frontend format
function mapBackendSettlement(s) {
  // Handle Member-based identity: s.from and s.to are now Member objects with user populated
  const fromMember = s.from;
  const toMember = s.to;

  const fromId = typeof fromMember === 'string' ? fromMember : (fromMember?._id || fromMember?.id || fromMember)?.toString?.() || String(fromMember || '');
  const toId = typeof toMember === 'string' ? toMember : (toMember?._id || toMember?.id || toMember)?.toString?.() || String(toMember || '');

  // Get user info from populated user field on Member, or use displayName
  const fromUser = fromMember?.user || { name: fromMember?.displayName || 'Unknown', email: '', avatar: null };
  const toUser = toMember?.user || { name: toMember?.displayName || 'Unknown', email: '', avatar: null };

  const fromName = resolvePartyName(fromMember);
  const toName = resolvePartyName(toMember);

  return {
    id: s._id || s.id,
    circleId: s.circle?._id || s.circle || s.circleId,
    from: fromId,
    to: toId,
    fromName,
    toName,
    fromUser: {
      ...fromUser,
      name: fromUser?.name || fromName,
    },
    toUser: {
      ...toUser,
      name: toUser?.name || toName,
    },
    amount: s.amount || 0,
    remainingAmount: s.remainingAmount || s.amount || 0,
    currency: s.currency || 'USD',
    status: s.status || 'pending',
    paymentMethod: s.paymentMethod || 'other',
    date: s.date || s.createdAt ? new Date(s.date || s.createdAt).toISOString().split('T')[0] : '',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

// Map backend balance to frontend format
function mapBackendBalance(b) {
  const userId = typeof b.user === 'string' ? b.user : (b.user?._id || b.user?.id || b.user)?.toString?.() || String(b.user || '');
  return {
    userId,
    user: b.user || {},
    name: b.user?.name || b.name || 'Unknown',
    email: b.user?.email || b.email || '',
    avatar: b.user?.avatar || b.avatar || null,
    totalPaid: b.totalPaid || 0,
    totalOwed: b.totalOwed || 0,
    netBalance: b.netBalance || 0,
  };
}

// Get all settlements for a circle
export async function getCircleSettlements(circleId, params = {}) {
  const { data } = await api.get(`/settlements/circles/${circleId}/settlements`, { params });
  return {
    settlements: (data.data || []).map(mapBackendSettlement),
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
    limit: data.pagination?.limit || 20,
    totalPages: data.pagination?.totalPages || 1,
  };
}

// Get settlement by ID
export async function getSettlement(settlementId) {
  const { data } = await api.get(`/settlements/${settlementId}`);
  return mapBackendSettlement(data.data);
}

// Get suggested settlements (debt optimization)
export async function getSuggestedSettlements(circleId) {
  const { data } = await api.get(`/settlements/suggested/${circleId}`);
  return {
    balances: (data.data?.balances || []).map(mapBackendBalance),
    suggestedSettlements: (data.data?.suggestedSettlements || []).map(mapBackendSettlement),
    existingSettlements: (data.data?.existingSettlements || []).map(mapBackendSettlement),
  };
}

// Get net balances for a circle
export async function getCircleBalances(circleId) {
  const { data } = await api.get(`/settlements/balances/${circleId}`);
  return (data.data || []).map(mapBackendBalance);
}

// Create a new settlement
export async function createSettlement(payload) {
  const { data } = await api.post('/settlements', payload);
  return mapBackendSettlement(data.data);
}

// Confirm a settlement
export async function confirmSettlement(settlementId) {
  const { data } = await api.post(`/settlements/${settlementId}/confirm`);
  return mapBackendSettlement(data.data);
}

// Complete a settlement
export async function completeSettlement(settlementId) {
  const { data } = await api.post(`/settlements/${settlementId}/complete`);
  return mapBackendSettlement(data.data);
}

// Process partial settlement
export async function partialSettlement(settlementId, amount) {
  const { data } = await api.post(`/settlements/${settlementId}/partial`, { amount });
  return mapBackendSettlement(data.data);
}

// Cancel a settlement
export async function cancelSettlement(settlementId) {
  const { data } = await api.post(`/settlements/${settlementId}/cancel`);
  return mapBackendSettlement(data.data);
}

// Get all settlements across all circles (for People page)
export async function getAllSettlements(params = {}) {
  const { data } = await api.get('/settlements', { params });
  return (data.data || []).map(mapBackendSettlement);
}

// Get all balances across all circles (for People page)
export async function getAllBalances() {
  const { data } = await api.get('/analytics/dashboard');
  return data.data || {};
}