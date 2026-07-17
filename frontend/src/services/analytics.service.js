import { api } from '../lib/api';
import { getAnalyticsSummary as getAnalyticsFromEngine } from './financial.engine';

export async function getMonthlySpending(circleId, year, month) {
  const { data } = await api.get(`/analytics/spending/monthly?circleId=${circleId || ''}&year=${year || ''}&month=${month || ''}`);
  return data.data || {};
}

export async function getWeeklySpending(circleId, year, month) {
  const { data } = await api.get(`/analytics/spending/weekly?circleId=${circleId || ''}&year=${year || ''}&month=${month || ''}`);
  return data.data || [];
}

export async function getDailySpending(startDate, endDate, circleId) {
  const { data } = await api.get(`/analytics/spending/daily?startDate=${startDate || ''}&endDate=${endDate || ''}&circleId=${circleId || ''}`);
  return data.data || [];
}

export async function getCategoryDistribution(startDate, endDate, circleId) {
  const { data } = await api.get(`/analytics/categories/distribution?startDate=${startDate || ''}&endDate=${endDate || ''}&circleId=${circleId || ''}`);
  return data.data || {};
}

export async function getMemberBalances(circleId) {
  const { data } = await api.get(`/analytics/members/balances/${circleId}`);
  return data.data || [];
}

export async function getCircleComparison(circleIds) {
  const { data } = await api.get(`/analytics/circles/comparison?circleIds=${circleIds || ''}`);
  return data.data || [];
}

export async function getTopExpenses(circleId, limit) {
  const { data } = await api.get(`/analytics/top/expenses?circleId=${circleId || ''}&limit=${limit || 10}`);
  return data.data || [];
}

export async function getTopPayers(circleId, limit) {
  const { data } = await api.get(`/analytics/top/payers?circleId=${circleId || ''}&limit=${limit || 10}`);
  return data.data || [];
}

export async function getTopReceivers(circleId, limit) {
  const { data } = await api.get(`/analytics/top/receivers?circleId=${circleId || ''}&limit=${limit || 10}`);
  return data.data || [];
}

export async function getSettlementStatistics(circleId) {
  const { data } = await api.get(`/analytics/settlements/statistics/${circleId}`);
  return data.data || {};
}

export async function getCashFlow(startDate, endDate, circleId) {
  const { data } = await api.get(`/analytics/cash-flow?startDate=${startDate || ''}&endDate=${endDate || ''}&circleId=${circleId || ''}`);
  return data.data || {};
}

export async function getAnalyticsSummary(period = 'all') {
  return getAnalyticsFromEngine(period);
}
