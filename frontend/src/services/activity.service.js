import { api } from '../lib/api';

export async function getUserActivities(params = {}) {
  const { data } = await api.get('/activities/me', { params });
  return {
    activities: data.data || [],
    meta: data.meta || {}
  };
}

export async function getCircleActivities(circleId, params = {}) {
  const { data } = await api.get(`/activities/circles/${circleId}`, { params });
  return {
    activities: data.data || [],
    meta: data.meta || {}
  };
}