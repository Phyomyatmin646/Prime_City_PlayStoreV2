/* eslint-env jest */

import React from 'react';
import { Image, RefreshControl } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ResidentActivityHistoryScreen from '../src/screens/history/ResidentActivityHistoryScreen';
import { getHistoryTheme } from '../src/screens/history/historyTheme';
import { fetchVisitorHistory } from '../src/api/visitors';
import { fetchMyHelperRequests } from '../src/api/helpers';
import { fetchMyReports } from '../src/api/reports';
import { fetchMyPaymentSubmissions } from '../src/api/bills';
import { getAccessToken } from '../src/api/client';
import { API_BASE_URL } from '../src/config/api';

let mockScreenContainerProps;

const visitor = {
  _id: 'visitor-1',
  fullname: 'Ma Thida',
  purpose: 'Family visit',
  badgeNumber: 'V-014',
  registration_type: 'PreRegistered',
  createdAt: '2026-08-24T08:00:00.000Z',
};

const helper = {
  _id: 'helper-1',
  type: 'Cleaning',
  status: 'Assigned',
  gender_preferred: 'Female',
  helper_id: { fullname: 'Daw Mya' },
  quoted_price_mmk: 25000,
  service_window: '9:00 AM – 11:00 AM',
  note: 'Please bring cleaning supplies.',
  created_at: '2026-08-24T08:30:00.000Z',
};

const report = {
  _id: 'report-1',
  title: 'Lift maintenance',
  status: 'Received',
  type: 'Maintenance',
  location: 'Block B',
  message: 'The lift is making a loud sound.',
  submitted_at: '2026-08-24T09:00:00.000Z',
  created_at: '2026-08-24T08:45:00.000Z',
};

const payment = {
  _id: 'payment-1',
  status: 'Approved',
  submitted_amount: 45500,
  expected_amount: 45500,
  proof_url: '/uploads/payment-1.jpg',
  submitted_at: '2026-08-24T10:00:00.000Z',
  reviewed_at: '2026-08-24T10:15:00.000Z',
  bill_id: {
    category: 'Water',
    type: 'Utility',
    title: 'August water bill',
    paid_at: '2026-08-24T10:16:00.000Z',
  },
  room_id: { room_name: 'B-P32' },
};

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: callback => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: { mode: 'dark' } }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return function MockScreenContainer({ children, ...props }) {
    mockScreenContainerProps = props;
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/api/visitors', () => ({
  fetchVisitorHistory: jest.fn(),
}));

jest.mock('../src/api/helpers', () => ({
  fetchMyHelperRequests: jest.fn(),
}));

jest.mock('../src/api/reports', () => ({
  fetchMyReports: jest.fn(),
}));

jest.mock('../src/api/bills', () => ({
  fetchMyPaymentSubmissions: jest.fn(),
}));

jest.mock('../src/api/client', () => ({
  getAccessToken: jest.fn(),
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function renderScreen(navigation = { navigate: jest.fn() }) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ResidentActivityHistoryScreen navigation={navigation} />,
    );
    await flushPromises();
  });
  return renderer;
}

describe('Resident activity history screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenContainerProps = undefined;
    fetchVisitorHistory.mockResolvedValue({ data: [visitor] });
    fetchMyHelperRequests.mockResolvedValue([helper]);
    fetchMyReports.mockResolvedValue([report]);
    fetchMyPaymentSubmissions.mockResolvedValue([payment]);
    getAccessToken.mockResolvedValue('resident-token');
  });

  test('keeps a scoped black-and-gold dark theme and light-mode support', () => {
    expect(getHistoryTheme({ mode: 'dark' })).toEqual(
      expect.objectContaining({
        mode: 'dark',
        background: '#05080A',
        card: '#0E1316',
        primary: '#F5AD27',
      }),
    );

    expect(getHistoryTheme({ mode: 'light' })).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAF9F6',
        card: '#FFFFFF',
      }),
    );
  });

  test('preserves screen chrome, four data requests, tabs and visitor QR navigation', async () => {
    const navigation = { navigate: jest.fn() };
    const renderer = await renderScreen(navigation);
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        topBarVariant: 'stack',
        title: 'My Activity History',
        showBottomNav: true,
      }),
    );
    expect(mockScreenContainerProps.themeOverride.background).toBe('#05080A');
    expect(fetchVisitorHistory).toHaveBeenCalledWith({ limit: 100 });
    expect(fetchMyHelperRequests).toHaveBeenCalledTimes(1);
    expect(fetchMyReports).toHaveBeenCalledWith({ limit: 100 });
    expect(fetchMyPaymentSubmissions).toHaveBeenCalledWith({ limit: 100 });
    expect(getAccessToken).toHaveBeenCalledTimes(1);

    expect(
      findByAccessibilityLabel(root, 'Visitors history').props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(findByAccessibilityLabel(root, 'Helpers history')).toBeTruthy();
    expect(findByAccessibilityLabel(root, 'Reports history')).toBeTruthy();
    expect(findByAccessibilityLabel(root, 'Payments history')).toBeTruthy();
    expect(rendered).toContain('Ma Thida');
    expect(rendered).toContain('Purpose: Family visit');
    expect(rendered).toContain('Badge: V-014');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'View visitor QR for Ma Thida',
      ).props.onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('VisitorPass', {
      visitorId: 'visitor-1',
    });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves every tab payload and authenticated payment-proof modal', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Helpers history').props.onPress();
    });
    expect(renderedText(root)).toContain('Cleaning');
    expect(renderedText(root)).toContain('Price: 25,000 MMK');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Reports history').props.onPress();
    });
    expect(renderedText(root)).toContain('Lift maintenance');
    expect(renderedText(root)).toContain('Acknowledged by administration');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Payments history').props.onPress();
    });
    expect(renderedText(root)).toContain('Water');
    expect(renderedText(root)).toContain('45,500 MMK');
    expect(renderedText(root)).toContain('Room B-P32 · Expected 45,500 MMK');

    const proofButton = findByAccessibilityLabel(
      root,
      'View payment screenshot for Water',
    );
    const thumbnail = proofButton.findByType(Image);
    expect(thumbnail.props.source).toEqual({
      uri: `${API_BASE_URL}/uploads/payment-1.jpg`,
      headers: { Authorization: 'Bearer resident-token' },
    });

    await ReactTestRenderer.act(async () => {
      proofButton.props.onPress();
    });

    const fullProof = root
      .findAllByType(Image)
      .find(node => node.props.resizeMode === 'contain');
    expect(fullProof.props.source.headers).toEqual({
      Authorization: 'Bearer resident-token',
    });

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Close payment screenshot',
      ).props.onPress();
    });
    expect(
      root.findAll(
        node => node.props.accessibilityLabel === 'Close payment screenshot',
      ),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves pull-to-refresh and does not refetch when switching tabs', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const refreshControl = root.findByType(RefreshControl);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Helpers history').props.onPress();
      findByAccessibilityLabel(root, 'Reports history').props.onPress();
      await flushPromises();
    });
    expect(fetchVisitorHistory).toHaveBeenCalledTimes(1);
    expect(fetchMyHelperRequests).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      refreshControl.props.onRefresh();
      await flushPromises();
    });
    expect(fetchVisitorHistory).toHaveBeenCalledTimes(2);
    expect(fetchMyHelperRequests).toHaveBeenCalledTimes(2);
    expect(fetchMyReports).toHaveBeenCalledTimes(2);
    expect(fetchMyPaymentSubmissions).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps the existing error copy and dynamic empty-state copy without adding actions', async () => {
    fetchVisitorHistory.mockRejectedValueOnce(
      new Error('Unable to reach activity service'),
    );
    const renderer = await renderScreen();
    const rendered = renderedText(renderer.root);

    expect(rendered).toContain('Unable to reach activity service');
    expect(rendered).toContain('No visitors history yet');
    expect(rendered).not.toContain('Retry');
    expect(rendered).not.toContain('Search');
    expect(rendered).not.toContain('Export');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
