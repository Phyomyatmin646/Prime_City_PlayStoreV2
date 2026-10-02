module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      '<rootDir>/node_modules/@react-native/jest-preset/jest/assetFileTransformer.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@react-native-async-storage|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-vector-icons)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
