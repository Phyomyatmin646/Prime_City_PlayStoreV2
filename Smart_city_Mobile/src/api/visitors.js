import { apiRequest } from './client';

export const VISITOR_PURPOSES = [
  'Meeting',
  'Interview',
  'Delivery',
  'Event',
  'Tour',
  'Service',
  'General',
  'Other',
];

export async function registerVisitor(payload) {
  return apiRequest('/visitors/register', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function fetchVisitorHistory(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.page) query.set('page', String(params.page));
  const qs = query.toString();
  const res = await apiRequest(qs ? `/visitors?${qs}` : '/visitors', {
    auth: true,
  });
  return {
    data: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination || null,
  };
}

export async function fetchVisitorPass(visitorId) {
  const res = await apiRequest(`/visitors/${visitorId}/qr`, { auth: true });
  return res.data;
}

export function splitFullName(fullName) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || parts[0],
  };
}
