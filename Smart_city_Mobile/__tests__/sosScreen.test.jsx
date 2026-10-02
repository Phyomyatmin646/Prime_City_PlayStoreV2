/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SosScreen from '../src/screens/sos/SosScreen';
import { fetchProfile } from '../src/api/profile';
import { sendSosAlert } from '../src/api/sos';
import { showPrimeAlert } from '../src/services/primeAlert';

let mockUser = {
  id: 'resident-1',
  room_id: 'room-1',
  fullname: 'Resident One',
};

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      mode: 'dark',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      warning: '#F59E0B',
      warningBg: '#3B2506',
    },
  }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return function MockScreenContainer({ children }) {
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

jest.mock('../src/api/profile', () => ({
  fetchProfile: jest.fn(),
}));

jest.mock('../src/api/sos', () => ({
  sendSosAlert: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function renderScreen() {
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<SosScreen navigation={{}} />);
  });

  return renderer;
}

function confirmLatestSosAlert() {
  const confirmationCall = showPrimeAlert.mock.calls.find(
    ([title]) => title === 'Send SOS Alert?',
  );
  return confirmationCall?.[2]?.find(button => button.text === 'Send SOS');
}

describe('SOS screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'resident-1',
      room_id: 'room-1',
      fullname: 'Resident One',
    };
    sendSosAlert.mockResolvedValue({ id: 'sos-1' });
  });

  test('renders the three existing types with Security selected', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(
      findByAccessibilityLabel(root, 'Security emergency type').props
        .accessibilityState,
    ).toEqual({ selected: true, disabled: false });
    expect(
      findByAccessibilityLabel(root, 'Medical emergency type').props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: false });
    expect(
      findByAccessibilityLabel(root, 'Fire emergency type').props
        .accessibilityState,
    ).toEqual({ selected: false, disabled: false });
    expect(
      findByAccessibilityLabel(root, 'Send Security SOS alert'),
    ).toBeTruthy();

    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain('Tap to send alert');
    expect(rendered).not.toContain('HOLD FOR SOS');
    expect(rendered).not.toContain('Location ready');
    expect(rendered).not.toContain('Call security');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('selecting Fire does not submit and confirmation preserves the exact payload', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Fire emergency type').props.onPress();
    });

    expect(sendSosAlert).not.toHaveBeenCalled();
    expect(
      findByAccessibilityLabel(root, 'Fire emergency type').props
        .accessibilityState,
    ).toEqual({ selected: true, disabled: false });

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send Fire SOS alert').props.onPress();
    });

    expect(sendSosAlert).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Send SOS Alert?',
      'Security will be notified immediately with your location.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Send SOS', style: 'destructive' }),
      ]),
    );

    const confirmButton = confirmLatestSosAlert();
    expect(confirmButton).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await confirmButton.onPress();
    });

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(sendSosAlert).toHaveBeenCalledTimes(1);
    expect(sendSosAlert).toHaveBeenCalledWith({
      resident_id: 'resident-1',
      room_id: 'room-1',
      alert_type: 'Fire',
      priority: 'Critical',
      message: 'Fire SOS from Resident One.',
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'SOS Sent',
      'Security has been notified. Help is on the way.',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('uses the profile fallback and keeps the room-not-linked guard', async () => {
    mockUser = { id: 'resident-1', fullname: 'Resident One' };
    fetchProfile.mockResolvedValue({ id: 'resident-1' });
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send Security SOS alert').props.onPress();
    });

    const confirmButton = confirmLatestSosAlert();
    await ReactTestRenderer.act(async () => {
      await confirmButton.onPress();
    });

    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(sendSosAlert).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Room not linked',
      'Your resident account needs a linked unit before sending SOS.',
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('allows an admin to send SOS without a linked room', async () => {
    mockUser = {
      id: 'admin-1',
      fullname: 'Admin One',
      role: 'Admin',
    };
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send Security SOS alert').props.onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Send SOS Alert?',
      'Security will be notified immediately.',
      expect.any(Array),
    );

    await ReactTestRenderer.act(async () => {
      await confirmLatestSosAlert().onPress();
    });

    expect(fetchProfile).not.toHaveBeenCalled();
    expect(sendSosAlert).toHaveBeenCalledWith({
      resident_id: 'admin-1',
      alert_type: 'Security',
      priority: 'High',
      message: 'Security SOS from Admin One.',
    });
    expect(showPrimeAlert).not.toHaveBeenCalledWith(
      'Room not linked',
      expect.any(String),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves dynamic failures and the session-expired guard', async () => {
    sendSosAlert.mockRejectedValueOnce(new Error('Network unavailable'));
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send Security SOS alert').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await confirmLatestSosAlert().onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'SOS failed',
      'Network unavailable',
    );

    jest.clearAllMocks();
    sendSosAlert.mockRejectedValueOnce(
      Object.assign(new Error('Session expired'), { sessionExpired: true }),
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Send Security SOS alert').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      await confirmLatestSosAlert().onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledTimes(1);
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Send SOS Alert?',
      'Security will be notified immediately with your location.',
      expect.any(Array),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
