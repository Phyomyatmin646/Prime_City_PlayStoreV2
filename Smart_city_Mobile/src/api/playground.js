import { apiRequest } from './client';

export async function fetchPlaygroundConfig() {
  const res = await apiRequest('/playground/config', { auth: true });
  return res.data;
}

export async function fetchMyPlaygroundRegistrations() {
  const res = await apiRequest('/playground/registrations', { auth: true });
  return res.data || [];
}

export async function createPlaygroundRegistration(payload) {
  const res = await apiRequest('/playground/registrations', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}

export async function updatePlaygroundRegistrationStatus(id, status) {
  const res = await apiRequest(`/playground/registrations/${id}/status`, {
    method: 'PATCH',
    auth: true,
    body: { status },
  });
  return res.data;
}
