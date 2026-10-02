import { apiRequest } from './client';
import { API_BASE_URL } from '../config/api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function resolveImageUrl(url) {
  const value = String(url || '').trim().replace(/\\/g, '/');
  if (!value) return '';
  if (/^data:image\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `http:${value}`;

  if (/^https?:\/\//i.test(value)) {
    try {
      const imageUrl = new URL(value);
      const apiUrl = new URL(API_ORIGIN);
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(imageUrl.hostname)) {
        imageUrl.protocol = apiUrl.protocol;
        imageUrl.hostname = apiUrl.hostname;
        imageUrl.port = apiUrl.port;
      }
      return encodeURI(imageUrl.toString());
    } catch (err) {
      return encodeURI(value);
    }
  }

  if (/^www\./i.test(value)) return `https://${value}`;

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return encodeURI(`${API_ORIGIN}${normalizedPath}`);
}

export async function fetchAdvertisements(params = {}) {
  const query = new URLSearchParams();
  if (params.status !== 'all') query.set('status', params.status || 'Active');
  if (params.limit) query.set('limit', String(params.limit));
  if (params.random) query.set('random', 'true');

  const queryString = query.toString();
  const res = await apiRequest(
    queryString ? `/advertisements?${queryString}` : '/advertisements',
  );
  const data = Array.isArray(res) ? res : res.data || [];

  return data.map((item) => ({
    id: item._id,
    companyName: item.company_name,
    title: item.title,
    content: item.content,
    imageUrl: resolveImageUrl(item.image_url),
    linkUrl: item.link_url,
    duration: item.duration,
  }));
}
