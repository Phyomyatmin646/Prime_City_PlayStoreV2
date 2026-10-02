import { apiRequest } from './client';

export async function fetchAiFeedbackForReview(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const res = await apiRequest(
    qs ? `/ai/feedback/admin?${qs}` : '/ai/feedback/admin',
    { auth: true },
  );
  return {
    items: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination || {},
  };
}

export async function reviewAiFeedback(feedbackId, payload) {
  const res = await apiRequest(`/ai/feedback/${feedbackId}/review`, {
    method: 'POST',
    auth: true,
    body: payload,
  });
  return res.data;
}

export async function fetchRagKnowledge(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.q) query.set('q', params.q);

  const qs = query.toString();
  const res = await apiRequest(qs ? `/knowledge?${qs}` : '/knowledge', {
    auth: true,
  });
  return {
    items: Array.isArray(res.data) ? res.data : [],
    pagination: res.pagination || {},
  };
}

export async function deactivateRagKnowledge(knowledgeId) {
  return apiRequest(`/knowledge/${knowledgeId}`, {
    method: 'DELETE',
    auth: true,
  });
}
