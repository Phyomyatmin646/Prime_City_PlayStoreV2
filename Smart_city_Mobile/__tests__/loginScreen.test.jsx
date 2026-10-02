/* eslint-env jest */

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { ActivityIndicator, Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import LoginScreen from '../src/screens/auth/LoginScreen';
import { getLoginTheme } from '../src/screens/auth/loginTheme';
import { loginStep1, loginStep2 } from '../src/api/auth';
import { showPrimeAlert } from '../src/services/primeAlert';

let mockAppThemeMode = 'dark';
const mockSignIn = jest.fn();

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { mode: mockAppThemeMode } }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

jest.mock('../src/api/auth', () => ({
  loginStep1: jest.fn(),
  loginStep2: jest.fn(),
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

async function renderScreen(navigation = { navigate: jest.fn() }) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <LoginScreen navigation={navigation} />,
    );
  });
  return renderer;
}

async function fillCredentials(root) {
  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Email').props.onChangeText(
      '  resident@prime.city  ',
    );
    findByAccessibilityLabel(root, 'Password').props.onChangeText(
      '  secret password  ',
    );
  });
}

async function reachOtpStage(root) {
  await fillCredentials(root);
  await ReactTestRenderer.act(async () => {
    await findByAccessibilityLabel(root, 'Continue').props.onPress();
  });
}

describe('Prime City Login screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppThemeMode = 'dark';
    loginStep1.mockResolvedValue({ success: true });
    loginStep2.mockResolvedValue({
      user: {
        id: 'resident-1',
        fullname: 'Resident One',
        email: 'resident@prime.city',
        phone: '09123456789',
        role: 'Resident',
        room_id: 'room-1',
        room_number: 'B-P32',
      },
    });
  });

  test('keeps a scoped black-and-gold dark theme and light-mode support', () => {
    expect(getLoginTheme({ mode: 'dark' })).toEqual(
      expect.objectContaining({
        mode: 'dark',
        background: '#05080A',
        primary: '#F5AD27',
        statusBar: 'light-content',
      }),
    );
    expect(getLoginTheme({ mode: 'light' })).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAF9F6',
        panel: '#FFFFFF',
        statusBar: 'dark-content',
      }),
    );
  });

  test('bundles the approved background and logo assets without remote images', async () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../src/screens/auth/LoginScreen.jsx'),
      'utf8',
    );
    expect(source).toContain(
      "require('../../assets/home-prime-city-night.png')",
    );
    expect(source).toContain("require('../../assets/app-icon-master.png')");
    expect(source).not.toMatch(/https?:\/\//);

    const renderer = await renderScreen();
    const logo = findByAccessibilityLabel(renderer.root, 'Prime City logo');
    expect(logo.type).toBe(Image);
    expect(logo.props.accessibilityIgnoresInvertColors).toBe(true);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves the initial credentials fields, input configuration and password toggle', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);
    const emailInput = findByAccessibilityLabel(root, 'Email');
    const passwordInput = findByAccessibilityLabel(root, 'Password');

    expect(rendered).toContain('Prime City');
    expect(rendered).toContain('Sign in with your resident account');
    expect(rendered).toContain('Forgot Password?');
    expect(rendered).toContain('Continue');
    expect(rendered).not.toContain('Secure access for Prime City residents');
    expect(rendered).not.toContain('Remember me');
    expect(rendered).not.toContain('Sign up');
    expect(emailInput.props.placeholder).toBe('Enter email');
    expect(emailInput.props.autoCapitalize).toBe('none');
    expect(emailInput.props.keyboardType).toBe('email-address');
    expect(passwordInput.props.placeholder).toBe('Enter password');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    await ReactTestRenderer.act(async () => {
      passwordInput.props.onChangeText('unchanged-secret');
      findByAccessibilityLabel(root, 'Show password').props.onPress();
    });
    expect(findByAccessibilityLabel(root, 'Password').props.value).toBe(
      'unchanged-secret',
    );
    expect(
      findByAccessibilityLabel(root, 'Password').props.secureTextEntry,
    ).toBe(false);
    expect(findByAccessibilityLabel(root, 'Hide password')).toBeTruthy();

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves Forgot Password navigation and missing-credentials validation', async () => {
    const navigation = { navigate: jest.fn() };
    const renderer = await renderScreen(navigation);
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Forgot Password').props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('ForgotPassword');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue').props.onPress();
    });
    expect(loginStep1).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing fields',
      'Please enter your email and password.',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('submits the unchanged step-one payload, disables while pending and opens OTP state', async () => {
    let resolveLogin;
    loginStep1.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveLogin = resolve;
        }),
    );
    const renderer = await renderScreen();
    const root = renderer.root;
    await fillCredentials(root);

    let request;
    await ReactTestRenderer.act(async () => {
      request = findByAccessibilityLabel(root, 'Continue').props.onPress();
      await Promise.resolve();
    });

    expect(loginStep1).toHaveBeenCalledWith(
      'resident@prime.city',
      '  secret password  ',
    );
    expect(findByAccessibilityLabel(root, 'Continue').props.disabled).toBe(
      true,
    );
    expect(root.findAllByType(ActivityIndicator)).toHaveLength(1);

    await ReactTestRenderer.act(async () => {
      resolveLogin({ success: true });
      await request;
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'OTP sent',
      'Check your email for the verification code.',
    );
    expect(renderedText(root)).toContain('Enter the OTP sent to your email');
    expect(findByAccessibilityLabel(root, 'OTP code').props.placeholder).toBe(
      '6-digit code',
    );
    expect(findByAccessibilityLabel(root, 'OTP code').props.keyboardType).toBe(
      'number-pad',
    );
    expect(findByAccessibilityLabel(root, 'OTP code').props.maxLength).toBe(6);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves step-one API errors', async () => {
    loginStep1.mockRejectedValue(new Error('Credentials rejected'));
    const renderer = await renderScreen();
    const root = renderer.root;
    await fillCredentials(root);

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(root, 'Continue').props.onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Sign in failed',
      'Credentials rejected',
    );
    expect(findByAccessibilityLabel(root, 'Continue').props.disabled).toBe(
      false,
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves missing-OTP validation and exact signIn user mapping', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    await reachOtpStage(root);
    showPrimeAlert.mockClear();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Verify and sign in').props.onPress();
    });
    expect(loginStep2).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Missing OTP',
      'Enter the code sent to your email.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'OTP code').props.onChangeText(' 123456 ');
    });
    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        root,
        'Verify and sign in',
      ).props.onPress();
    });

    expect(loginStep2).toHaveBeenCalledWith('resident@prime.city', '123456');
    expect(mockSignIn).toHaveBeenCalledWith({
      id: 'resident-1',
      fullname: 'Resident One',
      email: 'resident@prime.city',
      phone: '09123456789',
      role: 'Resident',
      room_id: 'room-1',
      room_number: 'B-P32',
    });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves email fallback, verification errors and different-account state reset', async () => {
    loginStep2.mockResolvedValueOnce({
      user: {
        id: 'resident-2',
        fullname: 'Resident Two',
        email: '',
        phone: null,
        role: 'Resident',
        room_id: 'room-2',
        room_number: 'A-S53',
      },
    });
    const renderer = await renderScreen();
    const root = renderer.root;
    await reachOtpStage(root);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'OTP code').props.onChangeText('654321');
    });
    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        root,
        'Verify and sign in',
      ).props.onPress();
    });
    expect(mockSignIn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'resident@prime.city' }),
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Use a different account').props.onPress();
    });
    expect(findByAccessibilityLabel(root, 'Email').props.value).toBe(
      '  resident@prime.city  ',
    );
    expect(findByAccessibilityLabel(root, 'Password').props.value).toBe(
      '  secret password  ',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());

    loginStep2.mockRejectedValueOnce(new Error('Expired verification code'));
    const errorRenderer = await renderScreen();
    const errorRoot = errorRenderer.root;
    await reachOtpStage(errorRoot);
    showPrimeAlert.mockClear();
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(errorRoot, 'OTP code').props.onChangeText(
        '111111',
      );
    });
    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        errorRoot,
        'Verify and sign in',
      ).props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Verification failed',
      'Expired verification code',
    );

    await ReactTestRenderer.act(async () => errorRenderer.unmount());
  });

  test('renders the same required authentication states in light mode', async () => {
    mockAppThemeMode = 'light';
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(renderedText(root)).toContain('Sign in with your resident account');
    expect(findByAccessibilityLabel(root, 'Prime City logo')).toBeTruthy();
    expect(findByAccessibilityLabel(root, 'Continue')).toBeTruthy();

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
