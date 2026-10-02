import { apiRequest } from './client';

export async function fetchBills() {
  const res = await apiRequest('/bills', { auth: true });
  return Array.isArray(res) ? res : res.data || [];
}

export async function fetchBill(id) {
  const res = await apiRequest(`/bills/${id}`, { auth: true });
  return res.data;
}

export async function fetchBillingRooms() {
  const res = await apiRequest('/bills/admin/rooms', { auth: true });
  return res.data || [];
}

export async function createMonthlyBill(payload) {
  return apiRequest('/bills', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function createMonthlyBillsForAll(payload) {
  return apiRequest('/bills/bulk', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}

export async function submitBillPayment({ billId, amount, screenshot, note }) {
  const form = new FormData();
  form.append('submitted_amount', String(amount));
  if (note) form.append('user_note', note);
  form.append('screenshot', {
    uri: screenshot.uri,
    type: screenshot.type || 'image/jpeg',
    name: screenshot.fileName || `kpay-payment-${Date.now()}.jpg`,
  });

  return apiRequest(`/bill-payments/${billId}/submit`, {
    method: 'POST',
    auth: true,
    body: form,
  });
}

export async function fetchPaymentSubmissions(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const res = await apiRequest(`/bill-payments${qs ? `?${qs}` : ''}`, {
    auth: true,
  });
  return res.data || [];
}

export async function fetchMyPaymentSubmissions(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  const res = await apiRequest(
    `/bill-payments/mine${qs ? `?${qs}` : ''}`,
    { auth: true },
  );
  return res.data || [];
}

export async function reviewPaymentSubmission(id, payload) {
  return apiRequest(`/bill-payments/${id}/review`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
}
