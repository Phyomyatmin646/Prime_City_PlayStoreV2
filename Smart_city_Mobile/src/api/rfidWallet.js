import { apiRequest } from './client';

export async function fetchMyRfidWallet() {
  const res = await apiRequest('/rfid-wallet/me', { auth: true });
  return res.data;
}

export async function creditRfidWallet(payload) {
  const res = await apiRequest('/rfid-wallet/adjust', {
    method: 'POST',
    auth: true,
    body: { ...payload, type: 'Credit' },
  });
  return res.data;
}

export async function fetchPrimeCityMerchants() {
  const res = await apiRequest('/rfid-wallet/merchants', { auth: true });
  return res.data || [];
}

export async function payPrimeCityMerchant(payload) {
  const res = await apiRequest('/rfid-wallet/pay', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}

export async function createPrimeCityMerchant(payload) {
  const res = await apiRequest('/rfid-wallet/merchants', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}

export async function settlePrimeCityMerchant(id, payload) {
  const res = await apiRequest(`/rfid-wallet/merchants/${id}/settle`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}

export async function fetchPrimeCityMerchantLedger(id) {
  const res = await apiRequest(`/rfid-wallet/merchants/${id}/ledger`, {
    auth: true,
  });
  return res.data;
}
