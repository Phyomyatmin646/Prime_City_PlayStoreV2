import { apiRequest } from './client';

export async function sendSosAlert(payload) {
  const res = await apiRequest('/sos', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}
