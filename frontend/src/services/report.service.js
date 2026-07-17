import { api } from '../lib/api';

export async function getMonthlyReport(params = {}) {
  const { data } = await api.get('/reports/monthly', { params });
  return data.data || {};
}

export async function getCircleReport(circleId) {
  const { data } = await api.get(`/reports/circles/${circleId}`);
  return data.data || {};
}

export async function getMemberReport(params = {}) {
  const { data } = await api.get('/reports/members', { params });
  return data.data || {};
}

export async function getSettlementReport(params = {}) {
  const { data } = await api.get('/reports/settlements', { params });
  return data.data || {};
}

export async function getExpenseReport(params = {}) {
  const { data } = await api.get('/reports/expenses', { params });
  return data.data || {};
}

export async function exportReport(reportData, format) {
  const { data } = await api.post('/reports/export', { report: reportData, format });
  return data.data || {};
}