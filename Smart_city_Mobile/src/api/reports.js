import { apiRequest } from './client';

export const REPORT_TYPES = ['Maintenance', 'Security', 'Other'];

export async function submitReport(payload) {
  const res = await apiRequest('/reports', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data || res.report;
}

export async function fetchReports(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);

  const qs = query.toString();
  const res = await apiRequest(qs ? `/reports?${qs}` : '/reports', {
    auth: true,
  });
  return res.data || [];
}

export async function submitReportAcknowledgement(reportId) {
  const res = await apiRequest(`/reports/${reportId}/submit`, {
    method: 'POST',
    auth: true,
  });
  return res.data;
}

export async function fetchMyReports(params = {}) {
  const query = new URLSearchParams();
  if (params.limit) query.set('limit', String(params.limit));
  if (params.page) query.set('page', String(params.page));
  if (params.status) query.set('status', params.status);
  const qs = query.toString();
  const res = await apiRequest(qs ? `/reports/mine?${qs}` : '/reports/mine', {
    auth: true,
  });
  return Array.isArray(res.data) ? res.data : [];
}
