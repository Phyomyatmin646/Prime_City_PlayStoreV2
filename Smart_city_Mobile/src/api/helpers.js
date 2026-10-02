import { apiRequest } from './client';

export const HELPER_CATALOG = [
  { name: 'House Helper', amount_mmk: null, service_window: null },
  {
    name: 'Cleaning',
    amount_mmk: 30000,
    service_window: '9:00 AM - 12:00 PM',
  },
  { name: 'Cooking', amount_mmk: null, service_window: null },
  { name: 'Laundry', amount_mmk: null, service_window: null },
  { name: 'Elder Care', amount_mmk: null, service_window: null },
  { name: 'Child Care', amount_mmk: null, service_window: null },
  { name: 'Maintenance', amount_mmk: null, service_window: null },
];

export const HELPER_CATEGORIES = HELPER_CATALOG.map(item => item.name);

export async function fetchHelperCatalog() {
  const res = await apiRequest('/helpers/catalog');
  return Array.isArray(res) ? res : res.data || HELPER_CATALOG;
}

export async function fetchHelpers(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.gender) query.set('gender', params.gender);

  const qs = query.toString();
  const path = qs ? `/helpers?${qs}` : '/helpers';
  const res = await apiRequest(path);
  return Array.isArray(res) ? res : res.data || [];
}

export async function createHelperRequest(payload) {
  const res = await apiRequest('/helper-requests', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data || res.request;
}

export async function fetchMyHelperRequests() {
  return fetchHelperRequests({ mine: true });
}

export async function fetchHelperRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.mine) query.set('mine', 'true');
  const qs = query.toString();
  const res = await apiRequest(
    qs ? `/helper-requests?${qs}` : '/helper-requests',
    { auth: true },
  );
  return Array.isArray(res) ? res : res.data || [];
}

export async function submitHelperRequest(requestId) {
  const res = await apiRequest(`/helper-requests/${requestId}/submit`, {
    method: 'POST',
    auth: true,
  });
  return res.data || res.request;
}
