import { apiRequest } from './client';

export async function fetchParkingStatus() {
  const response = await apiRequest('/parking', { auth: true });
  return Array.isArray(response.data) ? response.data : [];
}
