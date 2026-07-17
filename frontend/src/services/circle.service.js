import { api } from '../lib/api';
import { getCircleFinancialSummary } from './financial.engine.api';
import { mapCircleDocument } from '../utils/circle.mapper';

export async function getUserCircles(currentUserId = null) {
  const { data } = await api.get('/circles');
  return {
    circles: (data.data || []).map(c => mapCircleDocument(c, currentUserId)),
    total: data.meta?.pagination?.total || 0,
  };
}

export async function getCircle(id) {
  const { data } = await api.get(`/circles/${id}`);
  return data.data;
}

/**
 * DEPRECATED: Use getCircle() + getCircleFinancialSummary() separately.
 * This function is kept for backward compatibility but should not be used.
 * The financial summary does NOT contain complete member data.
 */
export async function getCircleMapped(id, currentUserId) {
  console.warn('[circle.service] getCircleMapped is deprecated. Use getCircle() for members and getCircleFinancialSummary() for financials.');
  const [circleData, financialData] = await Promise.all([
    getCircle(id),
    getCircleFinancialSummary(id),
  ]);
  
  const mapped = mapCircleDocument(circleData, currentUserId);
  if (mapped && financialData) {
    mapped.financialSummary = financialData;
  }
  return mapped;
}

export async function createCircle(payload, currentUserId) {
  const { data } = await api.post('/circles', payload);
  return mapCircleDocument(data.data, currentUserId);
}

export async function updateCircle(id, payload, currentUserId) {
  const { data } = await api.patch(`/circles/${id}`, payload);
  return mapCircleDocument(data.data, currentUserId);
}

export async function deleteCircle(id) {
  await api.delete(`/circles/${id}`);
}

export async function archiveCircle(id, archive = true) {
  const { data } = await api.patch(`/circles/${id}/archive`, { archive });
  return mapCircleDocument(data.data);
}

export async function getCircleMembers(id) {
  const { data } = await api.get(`/circles/${id}/members`);
  return data.data || [];
}

export async function inviteMember(circleId, email, role) {
  const { data } = await api.post(`/circles/${circleId}/invite`, { email, role });
  return data.data;
}

export async function addMemberByName(circleId, name, role = 'member') {
  const { data } = await api.post(`/circles/${circleId}/members/add-by-name`, { name, role });
  return data.data;
}

export async function acceptInvitation(token) {
  const { data } = await api.post(`/circles/invitations/${token}/accept`);
  return data.data;
}

export async function declineInvitation(token) {
  await api.post(`/circles/invitations/${token}/decline`);
}

export async function removeMember(circleId, memberId) {
  await api.delete(`/circles/${circleId}/members/${memberId}`);
}

export async function leaveCircle(circleId) {
  await api.post(`/circles/${circleId}/leave`);
}

export async function transferOwnership(circleId, newOwnerId) {
  await api.post(`/circles/${circleId}/transfer-ownership`, { newOwnerId });
}

export async function getUserInvitations() {
  const { data } = await api.get('/circles/invitations');
  return data.data || [];
}

export async function getPeople() {
  const { data } = await api.get('/financial/users/me/people-summary');
  return data.data || [];
}

export async function updateMemberRole(circleId, memberId, newRole) {
  const { data } = await api.patch(`/circles/${circleId}/members/${memberId}/role`, { role: newRole });
  return data.data;
}
