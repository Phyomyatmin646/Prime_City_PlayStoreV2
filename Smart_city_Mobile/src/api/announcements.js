import { apiRequest } from './client';

export async function fetchAnnouncements(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.q) query.set('q', params.q);
  if (params.status) query.set('status', params.status);
  if (params.includeArchived) query.set('include_archived', 'true');

  const qs = query.toString();
  const path = qs ? `/announcements?${qs}` : '/announcements';
  const res = await apiRequest(path, { auth: true });
  return res.data || [];
}

export async function completeMaintenanceAnnouncement(id) {
  return apiRequest(`/announcements/${id}/complete`, {
    method: 'PATCH',
    auth: true,
  });
}

export async function archiveAnnouncement(id) {
  return apiRequest(`/announcements/${id}/archive`, {
    method: 'PATCH',
    auth: true,
  });
}
