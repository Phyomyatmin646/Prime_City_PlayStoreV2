import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

let onSessionExpired = null;

export function setOnSessionExpired(handler) {
  onSessionExpired = handler;
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens({ accessToken, refreshToken }) {
  const ops = [];
  if (accessToken)
    ops.push(AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken));
  if (refreshToken)
    ops.push(AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken));
  await Promise.all(ops);
}

export async function clearTokens() {
  await Promise.all([
    AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
  ]);
}

async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.accessToken) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    return data.accessToken;
  }
  return null;
}

export async function apiRequest(
  path,
  { method = 'GET', body, auth = false, retry = true } = {},
) {
  const isMultipart =
    body != null && typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = isMultipart ? {} : { 'Content-Type': 'application/json' };
  let token = auth ? await getAccessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body == null ? undefined : isMultipart ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
    await clearTokens();
    onSessionExpired?.();
    const err = new Error('Session expired. Please sign in again.');
    err.status = 401;
    err.sessionExpired = true;
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.message || data.error || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
