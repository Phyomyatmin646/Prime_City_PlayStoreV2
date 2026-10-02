import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { registerDeviceToken } from '../api/notifications';

const FALLBACK_ANDROID_IMPORTANCE = {
  DEFAULT: 3,
  HIGH: 4,
};

const FALLBACK_AUTHORIZATION_STATUS = {
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const CHANNELS = {
  urgent: 'urgent_alerts_v2',
  community: 'community_updates_v2',
  helper: 'helper_requests_v2',
};

let foregroundUnsubscribe = null;
let tokenRefreshUnsubscribe = null;
let notifeeModule = null;
let notifeeLoadAttempted = false;
let messagingModule = null;
let messagingLoadAttempted = false;
const notificationListeners = new Set();

function emitNotificationEvent(remoteMessage) {
  notificationListeners.forEach(listener => {
    try {
      listener(remoteMessage);
    } catch (err) {}
  });
}

export function subscribeToNotificationEvents(listener) {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

function getExport(module, exportName) {
  return module?.[exportName] || module?.default?.[exportName];
}

function getFirebaseApp() {
  try {
    const firebaseApp = require('@react-native-firebase/app');
    const getApps = getExport(firebaseApp, 'getApps');
    const getApp =
      getExport(firebaseApp, 'getApp') || getExport(firebaseApp, 'app');

    if (typeof getApps === 'function') {
      const apps = getApps();
      if (!apps?.length) return null;
      return typeof getApp === 'function' ? getApp() : apps[0];
    }

    return typeof getApp === 'function' ? getApp() : null;
  } catch (err) {
    return null;
  }
}

function getMessagingModule() {
  if (messagingLoadAttempted) return messagingModule;

  messagingLoadAttempted = true;

  try {
    const firebaseApp = getFirebaseApp();
    if (!firebaseApp) return null;

    const module = require('@react-native-firebase/messaging');
    messagingModule = {
      AuthorizationStatus:
        module.AuthorizationStatus || FALLBACK_AUTHORIZATION_STATUS,
      app: firebaseApp,
      getMessaging: module.getMessaging,
      getToken: module.getToken,
      onMessage: module.onMessage,
      onTokenRefresh: module.onTokenRefresh,
      registerDeviceForRemoteMessages: module.registerDeviceForRemoteMessages,
      requestPermission: module.requestPermission,
      setBackgroundMessageHandler: module.setBackgroundMessageHandler,
    };
  } catch (err) {
    console.warn(
      'Firebase messaging native module unavailable: ' +
        (err && err.message ? err.message : String(err)) +
        '. Native `@react-native-firebase/app`/`messaging` may not be linked, the default Firebase app is not initialized, or the app was not rebuilt.\n' +
        'Fix steps: 1) Place android/app/google-services.json (Android) and/or configure iOS GoogleService-Info.plist.\n' +
        '2) Run `npm install` or `yarn` and for iOS `cd ios && pod install`.\n' +
        '3) Rebuild the app (Android: `npx react-native run-android`, iOS: build from Xcode).\n' +
        '4) If you intentionally run without native Firebase (e.g., web-only), disable push registration in app start.',
    );
  }

  return messagingModule;
}

function getMessagingInstance(module) {
  try {
    return module.getMessaging(module.app);
  } catch (err) {
    return null;
  }
}

function getNotifeeModule() {
  if (notifeeLoadAttempted) return notifeeModule;

  notifeeLoadAttempted = true;

  try {
    // Native modules are only available after rebuilding the Android/iOS app.
    // Keep push registration alive on old emulator builds and let FCM system
    // notifications work in background until the native module is linked.
    const module = require('@notifee/react-native');
    notifeeModule = {
      notifee: module.default || module,
      AndroidImportance:
        module.AndroidImportance || FALLBACK_ANDROID_IMPORTANCE,
    };
  } catch (err) {
    console.warn('Notifee native module unavailable:', err.message);
  }

  return notifeeModule;
}

async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  const module = getNotifeeModule();
  if (!module) return;

  await Promise.all([
    module.notifee.createChannel({
      id: CHANNELS.urgent,
      name: 'Urgent alerts',
      description: 'Emergency and SOS alerts requiring immediate attention',
      importance: module.AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    }),
    module.notifee.createChannel({
      id: CHANNELS.community,
      name: 'Community updates',
      description: 'Prime City announcements, bills and account updates',
      importance: module.AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    }),
    module.notifee.createChannel({
      id: CHANNELS.helper,
      name: 'Helper requests',
      description: 'Updates about resident helper requests',
      importance: module.AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
      vibrationPattern: [300, 500],
    }),
  ]);
}

async function requestNotificationPermission() {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (Platform.OS === 'ios') {
    const module = getMessagingModule();
    if (!module) return false;

    const messaging = getMessagingInstance(module);
    if (!messaging) return false;

    const status = await module.requestPermission(messaging);
    return (
      status === module.AuthorizationStatus.AUTHORIZED ||
      status === module.AuthorizationStatus.PROVISIONAL
    );
  }

  return true;
}

function getMessageTitle(remoteMessage) {
  return (
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    'Smart Residential'
  );
}

function getMessageBody(remoteMessage) {
  return (
    remoteMessage?.notification?.body || remoteMessage?.data?.message || ''
  );
}

function getChannelId(remoteMessage) {
  const type = remoteMessage?.data?.type;
  const channelId = remoteMessage?.data?.channel_id;

  if (channelId) return channelId;
  if (type === 'SOS' || type === 'Emergency') return CHANNELS.urgent;
  if (type === 'Helper') return CHANNELS.helper;
  return CHANNELS.community;
}

async function showForegroundNotification(remoteMessage) {
  emitNotificationEvent(remoteMessage);
  const title = getMessageTitle(remoteMessage);
  const body = getMessageBody(remoteMessage);
  if (!title && !body) return;

  await createNotificationChannels();
  const module = getNotifeeModule();
  if (!module) return;

  await module.notifee.displayNotification({
    title,
    body,
    data: remoteMessage?.data,
    android: {
      channelId: getChannelId(remoteMessage),
      pressAction: { id: 'default' },
      sound: 'default',
      importance: module.AndroidImportance.HIGH,
      vibrationPattern: [300, 500],
    },
  });
}

export async function openSystemNotificationSettings() {
  const module = getNotifeeModule();
  if (module?.notifee?.openNotificationSettings) {
    await module.notifee.openNotificationSettings();
    return;
  }
  await Linking.openSettings();
}

export function registerBackgroundNotificationHandler() {
  try {
    const module = getMessagingModule();
    if (!module) return;

    const messaging = getMessagingInstance(module);
    if (!messaging) return;

    module.setBackgroundMessageHandler(messaging, async remoteMessage => {
      if (remoteMessage?.notification) return;
      await showForegroundNotification(remoteMessage);
    });
  } catch (err) {
    console.warn('Background push handler setup failed:', err.message);
  }
}

export async function registerForPushNotifications() {
  try {
    await createNotificationChannels();
    const allowed = await requestNotificationPermission();
    if (!allowed) return null;

    const module = getMessagingModule();
    if (!module) return null;

    const messaging = getMessagingInstance(module);
    if (!messaging) return null;

    await module.registerDeviceForRemoteMessages(messaging);
    const token = await module.getToken(messaging);

    if (token) {
      await registerDeviceToken(token);
    }

    tokenRefreshUnsubscribe?.();
    tokenRefreshUnsubscribe = module.onTokenRefresh(
      messaging,
      async newToken => {
        await registerDeviceToken(newToken);
      },
    );

    return token;
  } catch (err) {
    console.warn('Push notification registration failed:', err.message);
    return null;
  }
}

export function setupForegroundNotificationHandler() {
  try {
    const module = getMessagingModule();
    if (!module) return cleanupPushNotifications;

    const messaging = getMessagingInstance(module);
    if (!messaging) return cleanupPushNotifications;

    foregroundUnsubscribe?.();
    foregroundUnsubscribe = module.onMessage(
      messaging,
      showForegroundNotification,
    );
  } catch (err) {
    console.warn('Foreground push handler setup failed:', err.message);
  }

  return cleanupPushNotifications;
}

export function cleanupPushNotifications() {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;
  tokenRefreshUnsubscribe?.();
  tokenRefreshUnsubscribe = null;
}
