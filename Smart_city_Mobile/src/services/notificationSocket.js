import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { API_BASE_URL } from '../config/api';

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function subscribeToRealtimeNotifications(listener, userId) {
  let socket = null;
  let active = true;

  getAccessToken()
    .then(token => {
      if (!active || !token) return;

      socket = io(SOCKET_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
      socket.on('connect', () => {
        if (userId) socket.emit('register', userId);
      });
      socket.on('notification', notification => listener(notification));
      socket.io.on('reconnect_attempt', async () => {
        const freshToken = await getAccessToken();
        if (freshToken) socket.auth = { token: freshToken };
      });
      socket.on('connect_error', error => {
        console.warn('Notification socket unavailable:', error.message);
      });
    })
    .catch(error => {
      console.warn('Notification socket setup failed:', error.message);
    });

  return () => {
    active = false;
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
  };
}
