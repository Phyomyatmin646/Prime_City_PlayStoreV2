/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { ActivityIndicator, Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ForgotPasswordScreen from '../src/screens/auth/ForgotPasswordScreen';
import {
  forgotPasswordStep1,
  forgotPasswordStep2,
} from '../src/api/auth';
import { showPrimeAlert } from '../src/services/primeAlert';

let mockAppThemeMode = 'dark';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { mode: mockAppThemeMode } }),
}));

jest.mock('../src/api/auth', () => ({
  forgotPasswordStep1: jest.fn(),
  forgotPasswordStep2: jest.fn(),
}));

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

function flattenText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(flattenText).join('');
  return '';
}

function renderedText(root) {
  return root
    .findAll(node => flattenText(node.props.children))
    .map(node => flattenText(node.props.children))
    .join('\n');
}

async function renderScreen(
  navigation = { navigate: jest.fn(), goBack: jest.fn() },
) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ForgotPasswordScreen navigation={navigation} />,
    );
  });
  return renderer;
}

async function reachResetStep(root) {
  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Recovery email').props.onChangeText(
      '  resident@prime.city  ',
    );
  });
  await ReactTestRenderer.act(async () => {
    await findByAccessibilityLabel(root, 'Send OTP').props.onPress();
  });
}

describe('Prime City Forgot Password screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppThemeMode = 'dark';
    forgotPasswordStep1.mockResolvedValue({ success: true });
    forgotPasswordStep2.mockResolvedValue({ success: true });
  });

  test.each(['dark', 'light'])(
    'uses the official local brand asset in %s mode',
    async mode => {
      mockAppThemeMode = mode;
      const source = fs.readFileSync(
        path.resolve(
          __dirname,
          '../src/screens/auth/ForgotPasswordScreen.jsx',
        ),
        'utf8',
      );
      expect(source).toContain(
        "require('../../assets/home-prime-city-night.png')",
      );
      expect(source).toContain("require('../../assets/app-icon-master.png')");
      expect(source).not.toMatch(/https?:\/\//);

      const renderer = await renderScreen();
      const logo = findByAccessibilityLabel(
        renderer.root,
        'Prime City logo',
      );
      expect(logo.type).toBe(Image);
      expect(logo.props.accessibilityIgnoresInvertColors).toBe(true);

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test('preserves email validation, payload trimming and pending state', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send OTP').props.onPress();
    });
    expect(forgotPasswordStep1).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing field',
      'Please enter your email address.',
    );

    let resolveRequest;
    forgotPasswordStep1.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRequest = resolve;
        }),
    );
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Recovery email').props.onChangeText(
        '  resident@prime.city  ',
      );
    });

    let request;
    await ReactTestRenderer.act(async () => {
      request = findByAccessibilityLabel(root, 'Send OTP').props.onPress();
      await Promise.resolve();
    });
    expect(forgotPasswordStep1).toHaveBeenCalledWith(
      'resident@prime.city',
    );
    expect(findByAccessibilityLabel(root, 'Send OTP').props.disabled).toBe(
      true,
    );
    expect(root.findAllByType(ActivityIndicator)).toHaveLength(1);

    await ReactTestRenderer.act(async () => {
      resolveRequest({ success: true });
      await request;
    });
    expect(renderedText(root)).toContain('Reset');
    expect(
      findByAccessibilityLabel(root, 'Password reset OTP').props.maxLength,
    ).toBe(6);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves reset validation, password toggles and exact API payload', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    await reachResetStep(root);
    showPrimeAlert.mockClear();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Reset password').props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing field',
      'Please enter the verification OTP.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Password reset OTP').props.onChangeText(
        ' 123456 ',
      );
      findByAccessibilityLabel(root, 'New password').props.onChangeText(
        'new-secret',
      );
      findByAccessibilityLabel(root, 'Confirm new password').props.onChangeText(
        'new-secret',
      );
      findByAccessibilityLabel(root, 'Show new password').props.onPress();
      findByAccessibilityLabel(root, 'Show confirmed password').props.onPress();
    });

    expect(findByAccessibilityLabel(root, 'New password').props.secureTextEntry)
      .toBe(false);
    expect(
      findByAccessibilityLabel(root, 'Confirm new password').props
        .secureTextEntry,
    ).toBe(false);

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(root, 'Reset password').props.onPress();
    });
    expect(forgotPasswordStep2).toHaveBeenCalledWith(
      'resident@prime.city',
      '123456',
      'new-secret',
    );
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Success',
      'Your password has been successfully reset. Please sign in with your new password.',
      expect.any(Array),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('uses state-first back behavior before leaving the auth route', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const renderer = await renderScreen(navigation);
    const root = renderer.root;
    await reachResetStep(root);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Back to email step').props.onPress();
    });
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(findByAccessibilityLabel(root, 'Recovery email')).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Go back to sign in').props.onPress();
    });
    expect(navigation.goBack).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
