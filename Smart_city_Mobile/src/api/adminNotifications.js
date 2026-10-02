import { apiRequest } from './client';

export async function fetchResidentsForNotifications() {
  const res = await apiRequest('/notifications/residents', { auth: true });
  return res.data || [];
}

export function buildNotificationRecipientPayload(target, residentIds = []) {
  if (target === 'all') return { target: 'all_residents' };

  const recipientUserIds = Array.from(
    new Set(
      residentIds.map(value => String(value || '').trim()).filter(Boolean),
    ),
  );
  if (recipientUserIds.length === 1) {
    return {
      target: 'resident',
      recipient_user_id: recipientUserIds[0],
      recipient_user_ids: recipientUserIds,
    };
  }

  return {
    target: 'selected_residents',
    recipient_user_ids: recipientUserIds,
  };
}

export async function sendAdminNotification(payload) {
  return apiRequest('/notifications/send', {
    method: 'POST',
    auth: true,
    body: payload,
  });
}
