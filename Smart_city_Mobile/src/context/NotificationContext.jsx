import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import { useAuth } from './AuthContext';
import { subscribeToNotificationEvents } from '../services/pushNotifications';
import { subscribeToRealtimeNotifications } from '../services/notificationSocket';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = user?.id || user?._id || null;

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }

    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
      return count;
    } catch (err) {
      if (!err.sessionExpired) console.warn('Unread notification count failed:', err.message);
      return 0;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();
    const unsubscribe = subscribeToNotificationEvents(refreshUnreadCount);
    const unsubscribeSocket = subscribeToRealtimeNotifications(
      refreshUnreadCount,
      userId,
    );
    const timer = setInterval(refreshUnreadCount, 30000);
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshUnreadCount();
    });
    return () => {
      unsubscribe();
      unsubscribeSocket();
      clearInterval(timer);
      appStateSubscription.remove();
    };
  }, [isAuthenticated, refreshUnreadCount, userId]);

  const markOneRead = useCallback(
    async notificationId => {
      await markNotificationRead(notificationId);
      setUnreadCount(current => Math.max(0, current - 1));
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      markOneRead,
      markAllRead,
    }),
    [markAllRead, markOneRead, refreshUnreadCount, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export default NotificationProvider;
