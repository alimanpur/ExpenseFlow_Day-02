import { api } from '../lib/api';

export async function globalSearch(query, params = {}) {
  const { data } = await api.get('/search', { 
    params: { q: query, ...params } 
  });
  return {
    results: data.data || [],
    total: data.total || 0,
    query: data.query || query
  };
}