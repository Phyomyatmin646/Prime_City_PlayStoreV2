/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import FloatingChat, {
  getFloatingChatPosition,
} from '../src/components/FloatingChat';

let mockAppTheme;
const mockToggle = jest.fn();

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: mockAppTheme }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { fullname: 'Resident One' } }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('../src/context/ChatContext', () => ({
  useChat: () => ({
    isOpen: false,
    close: jest.fn(),
    toggle: mockToggle,
    sessions: [],
    activeSession: null,
    activeSessionId: 'session-1',
    messages: [],
    sendMessage: jest.fn(),
    updateMessage: jest.fn(),
    setActiveConversationId: jest.fn(),
    newChat: jest.fn(),
    selectSession: jest.fn(),
    deleteSession: jest.fn(),
  }),
}));

jest.mock('../src/hooks/useVoiceAssistant', () =>
  jest.fn(() => ({
    listening: false,
    voiceAvailable: false,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    stopSpeaking: jest.fn(),
  })),
);

jest.mock('../src/services/chatService', () => ({
  sendFeedback: jest.fn(),
  sendMessage: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function renderChat() {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<FloatingChat />);
    await Promise.resolve();
  });
  return renderer;
}

describe('FloatingChat launcher logo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppTheme = {
      mode: 'dark',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      warning: '#F59E0B',
      warningBg: '#3B2506',
    };
  });

  test('bundles the approved PNG and removes the old emoji from the active launcher', () => {
    const assetPath = path.resolve(
      __dirname,
      '../src/assets/chatbot-home-logo.png',
    );
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/components/FloatingChat.jsx'),
      'utf8',
    );

    expect(fs.existsSync(assetPath)).toBe(true);
    expect(fs.readFileSync(assetPath).subarray(1, 4).toString()).toBe('PNG');
    expect(source).toContain("require('../assets/chatbot-home-logo.png')");
    expect(source).not.toContain('💬');
  });

  test.each(['dark', 'light'])(
    'renders the same accessible logo launcher in %s mode and preserves toggle behavior',
    async mode => {
      mockAppTheme = { ...mockAppTheme, mode };
      const renderer = await renderChat();
      const root = renderer.root;
      const launcher = findByAccessibilityLabel(root, 'Open chat');
      const logo = root
        .findAllByType(Image)
        .find(item =>
          String(item.props.source?.testUri || item.props.source).includes(
            'chatbot-home-logo',
          ),
        );

      expect(launcher.props.accessibilityRole).toBe('button');
      expect(launcher.props.accessibilityHint).toBe('Opens assistant chat');
      expect(logo).toBeTruthy();
      expect(logo.props.accessible).toBe(false);
      expect(logo.props.accessibilityIgnoresInvertColors).toBe(true);

      await ReactTestRenderer.act(async () => {
        launcher.props.onPress();
      });
      expect(mockToggle).toHaveBeenCalledTimes(1);

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test('keeps FloatingChat globally gated by authentication', () => {
    const appSource = fs.readFileSync(
      path.resolve(__dirname, '../App.jsx'),
      'utf8',
    );
    expect(appSource).toContain('{isAuthenticated && <FloatingChat />}');
  });

  test('keeps the launcher clear of the safe edge and shared bottom tab', () => {
    expect(
      getFloatingChatPosition(
        { top: 0, right: 0, bottom: 34, left: 0 },
        'ios',
      ),
    ).toEqual({ right: 20, bottom: 110 });
    expect(
      getFloatingChatPosition(
        { top: 0, right: 4, bottom: 0, left: 0 },
        'android',
      ),
    ).toEqual({ right: 24, bottom: 86 });
  });
});
