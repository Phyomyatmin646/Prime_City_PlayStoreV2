export const NOTIFICATION_TYPE_ICONS = {
  SOS: 'alert-circle-outline',
  Emergency: 'warning-outline',
  Announcement: 'megaphone-outline',
  Helper: 'people-outline',
  Visitor: 'person-outline',
  Report: 'document-text-outline',
  General: 'notifications-outline',
};

export function formatNotificationTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function notificationAccent(type, theme) {
  return type === 'SOS' || type === 'Emergency' ? theme.danger : theme.primary;
}

export function mapNotification(item) {
  return {
    id: item._id,
    title: item.title,
    body: item.message,
    type: item.type || 'General',
    time: formatNotificationTime(item.created_at),
    created_at: item.created_at || null,
    is_read: item.is_read,
    data: item.data || {},
    action_status: item.action_status || 'Pending',
    actioned_at: item.actioned_at || null,
  };
}
