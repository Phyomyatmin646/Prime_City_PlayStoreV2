import { buildNotificationRecipientPayload } from '../src/api/adminNotifications';

test('All residents remains unchanged', () => {
  expect(buildNotificationRecipientPayload('all', ['ignored-id'])).toEqual({
    target: 'all_residents',
  });
});

test('one selected resident uses the backward-compatible single target', () => {
  expect(buildNotificationRecipientPayload('selected', ['resident-1'])).toEqual(
    {
      target: 'resident',
      recipient_user_id: 'resident-1',
      recipient_user_ids: ['resident-1'],
    },
  );
});

test('multiple selected residents use a de-duplicated recipient list', () => {
  expect(
    buildNotificationRecipientPayload('selected', [
      'resident-1',
      'resident-2',
      'resident-1',
    ]),
  ).toEqual({
    target: 'selected_residents',
    recipient_user_ids: ['resident-1', 'resident-2'],
  });
});
