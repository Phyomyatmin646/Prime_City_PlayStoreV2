/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Share } from 'react-native';
import RNFS from 'react-native-fs';
import VisitorPassScreen, {
  formatVisitorPassDate,
  isVisitorPassActive,
} from '../src/screens/visitors/VisitorPassScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: callback => callback(),
}));

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

jest.mock('../src/api/visitors', () => ({
  fetchVisitorPass: jest.fn(),
}));

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache',
  writeFile: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

const activePassData = {
  id: 'visitor-1',
  name: 'Phyo Myat Min',
  badgeNumber: 'V20260824-343A43',
  room: 'B-P32',
  purpose: 'Meeting',
  visitDate: '2026-08-24T00:00:00.000Z',
  visitor_pass: {
    status: 'Active',
    qr_image_data_url: 'data:image/png;base64,QUJD',
    valid_from: '2026-08-24T00:00:00.000Z',
    expires_at: '2026-08-24T23:59:59.000Z',
    share_url: 'https://example.com/pass',
  },
};

async function renderPass(initialPass) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <VisitorPassScreen
        navigation={{ goBack: jest.fn() }}
        route={{ params: { initialPass } }}
      />,
    );
  });
  return renderer;
}

describe('Visitor QR pass presentation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RNFS.writeFile.mockResolvedValue();
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('requires both active status and QR data', () => {
    expect(isVisitorPassActive(activePassData.visitor_pass)).toBe(true);
    expect(isVisitorPassActive({ status: 'Active' })).toBe(false);
    expect(
      isVisitorPassActive({
        status: 'Used',
        qr_image_data_url: 'data:image/png;base64,QUJD',
      }),
    ).toBe(false);
    expect(formatVisitorPassDate('not-a-date')).toBe('not-a-date');
    expect(formatVisitorPassDate(null)).toBe('—');
  });

  test('renders real pass data and preserves save/share behavior', async () => {
    const renderer = await renderPass(activePassData);
    const root = renderer.root;
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain('Phyo Myat Min');
    expect(output).toContain('V20260824-343A43');
    expect(output).toContain('Meeting');
    expect(findByAccessibilityLabel(root, 'Pass status: Active')).toBeTruthy();
    expect(
      findByAccessibilityLabel(root, 'Visitor QR code for Phyo Myat Min'),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        root,
        'Save or share visitor QR pass',
      ).props.onPress();
    });

    expect(RNFS.writeFile).toHaveBeenCalledWith(
      '/cache/prime-city-V20260824-343A43.png',
      'QUJD',
      'base64',
    );
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Prime City visitor pass',
        url: 'file:///cache/prime-city-V20260824-343A43.png',
      }),
    );

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('shows the existing inactive notice and hides the share action', async () => {
    const inactiveData = {
      ...activePassData,
      visitor_pass: {
        ...activePassData.visitor_pass,
        status: 'Used',
      },
    };
    const renderer = await renderPass(inactiveData);
    const root = renderer.root;
    const output = JSON.stringify(renderer.toJSON());

    expect(output).toContain('Pass status: Used');
    expect(output).toContain('This pass is no longer active');
    expect(() =>
      findByAccessibilityLabel(root, 'Save or share visitor QR pass'),
    ).toThrow();

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
