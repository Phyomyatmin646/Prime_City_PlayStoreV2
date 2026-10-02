import { io } from 'socket.io-client';
import { getAccessToken } from '../api/client';
import { API_BASE_URL } from '../config/api';

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function subscribeToParkingUpdates(listener, onConnectionChange) {
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
      socket.on('connect', () => onConnectionChange?.(true));
      socket.on('disconnect', () => onConnectionChange?.(false));
      socket.on('parking_update', parking => listener(parking));
      socket.io.on('reconnect_attempt', async () => {
        const freshToken = await getAccessToken();
        if (freshToken) socket.auth = { token: freshToken };
      });
      socket.on('connect_error', () => onConnectionChange?.(false));
    })
    .catch(() => onConnectionChange?.(false));

  return () => {
    active = false;
    onConnectionChange?.(false);
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
  };
}
