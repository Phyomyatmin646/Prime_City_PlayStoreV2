/* eslint-env jest */

require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map();
  const asyncStorage = {
    getItem: jest.fn(key => Promise.resolve(storage.get(key) ?? null)),
    setItem: jest.fn((key, value) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn(key => {
      storage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
    multiGet: jest.fn(keys =>
      Promise.resolve(keys.map(key => [key, storage.get(key) ?? null])),
    ),
    multiSet: jest.fn(pairs => {
      pairs.forEach(([key, value]) => storage.set(key, value));
      return Promise.resolve();
    }),
    multiRemove: jest.fn(keys => {
      keys.forEach(key => storage.delete(key));
      return Promise.resolve();
    }),
  };

  return {
    __esModule: true,
    default: asyncStorage,
    ...asyncStorage,
  };
});

jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve()),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('@react-native-voice/voice', () => ({
  onSpeechStart: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechResults: jest.fn(),
  onSpeechError: jest.fn(),
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
  removeAllListeners: jest.fn(),
}));

jest.mock('react-native-audio-recorder-player', () =>
  jest.fn().mockImplementation(() => ({
    setSubscriptionDuration: jest.fn(),
    startRecorder: jest.fn(() => Promise.resolve('test-recording.m4a')),
    stopRecorder: jest.fn(() => Promise.resolve('test-recording.m4a')),
    startPlayer: jest.fn(() => Promise.resolve()),
    stopPlayer: jest.fn(() => Promise.resolve()),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  })),
);

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
  exists: jest.fn(() => Promise.resolve(true)),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(() => Promise.resolve('channel')),
    displayNotification: jest.fn(() => Promise.resolve()),
  },
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
  },
}));

const mockMessagingInstance = {};
const mockFirebaseApp = { name: '[DEFAULT]' };

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => mockFirebaseApp),
  getApps: jest.fn(() => [mockFirebaseApp]),
  default: {
    app: jest.fn(() => mockFirebaseApp),
    getApp: jest.fn(() => mockFirebaseApp),
    getApps: jest.fn(() => [mockFirebaseApp]),
  },
}));

jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  getMessaging: jest.fn(() => mockMessagingInstance),
  getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  requestPermission: jest.fn(() => Promise.resolve(1)),
  setBackgroundMessageHandler: jest.fn(),
}));
