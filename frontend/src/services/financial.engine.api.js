/**
 * ExpenseFlow - Financial Engine API (Frontend)
 * Pure API call functions for Financial Engine endpoints.
 *
 * IMPORTANT: All API calls use the centralized axios instance from lib/api.js
 * which includes token refresh logic. Do NOT use services/api.js (fetch-based).
 */

import { api } from '../lib/api';
import { mapCircleDocument } from '../utils/circle.mapper';

export async function getCircleFinancialSummary(circleId) {
  const { data } = await api.get(`/financial/circles/${circleId}/financial-summary`);
  return data.data || {};
}

export async function getDashboard() {
  const { data } = await api.get('/financial/users/me/dashboard');
  return data.data || {};
}

export async function getPeopleSummary() {
  const { data } = await api.get('/financial/users/me/people-summary');
  return data.data || [];
}

export async function getLedger(query = {}) {
  const params = new URLSearchParams(query).toString();
  const { data } = await api.get(`/financial/users/me/ledger${params ? '?' + params : ''}`);
  return data.data || {};
}

export async function getAnalyticsSummary(period = 'all') {
  const { data } = await api.get(`/financial/analytics/summary?period=${period}`);
  return data.data || {};
}

export async function getProfileStats() {
  const { data } = await api.get('/financial/users/me/profile-stats');
  return data.data || {};
}

export async function getUserCircles(currentUserId = null) {
  const { data } = await api.get('/circles');
  const rawCircles = data.data || [];
  return {
    circles: rawCircles.map(c => mapCircleDocument(c, currentUserId)),
    total: data.meta?.pagination?.total || 0,
  };
}

export async function getAllSettlementsAggregated() {
  const { data } = await api.get('/settlements');
  const settlementsList = (data.data || []).map(s => ({
    id: s._id || s.id,
    circleId: typeof s.circle === 'string' ? s.circle : (s.circle?._id || s.circleId),
    fromId: typeof s.from === 'string' ? s.from : (s.from?._id || s.from?.id),
    toId: typeof s.to === 'string' ? s.to : (s.to?._id || s.to?.id),
    fromName: s.from?.name || s.fromName || 'Unknown',
    toName: s.to?.name || s.toName || 'Unknown',
    amount: s.amount || 0,
    status: s.status || 'pending',
    paymentMethod: s.paymentMethod || 'other',
    currency: s.currency || 'USD',
    note: s.note || '',
    circleName: s.circle?.name || '',
    remainingAmount: s.remainingAmount || s.amount || 0,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
  return settlementsList;
}

export async function getAllSuggestedSettlementsAggregated() {
  const { data } = await api.get('/settlements?status=suggested');
  return data.data || [];
}
