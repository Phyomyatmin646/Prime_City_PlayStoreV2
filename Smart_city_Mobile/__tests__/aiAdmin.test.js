import {
  deactivateRagKnowledge,
  fetchAiFeedbackForReview,
  fetchRagKnowledge,
  reviewAiFeedback,
} from '../src/api/aiAdmin';
import { apiRequest } from '../src/api/client';

jest.mock('../src/api/client', () => ({ apiRequest: jest.fn() }));

beforeEach(() => {
  apiRequest.mockReset();
});

test('loads the protected Admin feedback queue', async () => {
  apiRequest.mockResolvedValue({
    data: [{ _id: 'feedback-1' }],
    pagination: { total: 1 },
  });

  const result = await fetchAiFeedbackForReview({
    status: 'pending',
    limit: 100,
  });

  expect(apiRequest).toHaveBeenCalledWith(
    '/ai/feedback/admin?status=pending&limit=100',
    { auth: true },
  );
  expect(result.items).toHaveLength(1);
});

test('publishes an approved feedback review through the protected endpoint', async () => {
  const payload = {
    reviewStatus: 'approved',
    title: 'Visitor guidance',
    approvedContent: 'Residents can create a one-time visitor gate pass.',
  };
  apiRequest.mockResolvedValue({ data: { reviewStatus: 'approved' } });

  await reviewAiFeedback('feedback-1', payload);

  expect(apiRequest).toHaveBeenCalledWith('/ai/feedback/feedback-1/review', {
    method: 'POST',
    auth: true,
    body: payload,
  });
});

test('loads and deactivates RAG knowledge through protected endpoints', async () => {
  apiRequest
    .mockResolvedValueOnce({ data: [], pagination: { total: 0 } })
    .mockResolvedValueOnce({ success: true });

  await fetchRagKnowledge({ limit: 100 });
  await deactivateRagKnowledge('knowledge-1');

  expect(apiRequest).toHaveBeenNthCalledWith(1, '/knowledge?limit=100', {
    auth: true,
  });
  expect(apiRequest).toHaveBeenNthCalledWith(2, '/knowledge/knowledge-1', {
    method: 'DELETE',
    auth: true,
  });
});
