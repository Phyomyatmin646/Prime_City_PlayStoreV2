/* eslint-env jest */

import React from 'react';
import { RefreshControl } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ParkingScreen from '../src/screens/parking/ParkingScreen';
import { fetchParkingStatus } from '../src/api/parking';
import { subscribeToParkingUpdates } from '../src/services/parkingSocket';

let mockScreenContainerProps;
let mockParkingUpdate;
let mockParkingConnectionChange;
const mockSocketCleanup = jest.fn();

const parkingItems = [
  {
    type: 'visitor',
    totalSlot: 7,
    usedSlot: 0,
    maintenanceSlot: 0,
    availableSlot: 7,
    updated_at: '2026-08-24T08:00:00.000Z',
  },
  {
    type: 'resident',
    totalSlot: 7,
    usedSlot: 1,
    maintenanceSlot: 1,
    availableSlot: 5,
    updatedAt: '2026-08-24T08:00:00.000Z',
  },
];

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');

  return {
    useFocusEffect: callback => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      mode: 'dark',
      background: '#0B1220',
      surface: '#111827',
      card: '#1A2332',
      input: '#0F172A',
      primary: '#06B6D4',
      primaryBg: '#0C2A32',
      primaryText: '#042F2E',
      text: '#F8FAFC',
      subtext: '#94A3B8',
      border: '#1F2937',
      inactive: '#64748B',
      icon: '#E2E8F0',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      tabBar: '#0B1220',
      tabBarBorder: '#1F2937',
      shadow: '#000000',
    },
  }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return function MockScreenContainer({ children, ...props }) {
    mockScreenContainerProps = props;
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/api/parking', () => ({
  fetchParkingStatus: jest.fn(),
}));

jest.mock('../src/services/parkingSocket', () => ({
  subscribeToParkingUpdates: jest.fn(),
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

async function renderScreen() {
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ParkingScreen navigation={{ goBack: jest.fn() }} />,
    );
    await Promise.resolve();
  });

  return renderer;
}

describe('Parking screen contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockScreenContainerProps = undefined;
    mockParkingUpdate = undefined;
    mockParkingConnectionChange = undefined;
    fetchParkingStatus.mockResolvedValue(parkingItems);
    subscribeToParkingUpdates.mockImplementation((listener, onConnection) => {
      mockParkingUpdate = listener;
      mockParkingConnectionChange = onConnection;
      return mockSocketCleanup;
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('keeps stack navigation, card order, dynamic values and calculations', async () => {
    fetchParkingStatus.mockResolvedValueOnce([
      { ...parkingItems[0], type: 'VISITOR' },
      { ...parkingItems[1], type: 'RESIDENT' },
    ]);
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        topBarVariant: 'stack',
        title: 'Parking Slots',
        showBottomNav: true,
      }),
    );
    expect(rendered.indexOf('Resident Parking')).toBeLessThan(
      rendered.indexOf('Visitor Parking'),
    );
    expect(rendered).toContain(
      'Parking spaces reserved for Prime City residents',
    );
    expect(rendered).toContain(
      'Short-term parking spaces for registered visitors',
    );
    expect(rendered).toContain('slots available');
    expect(rendered).toContain('Total');
    expect(rendered).toContain('Occupied');
    expect(rendered).toContain('Maintenance');
    expect(
      findByAccessibilityLabel(root, 'Resident Parking occupancy').props
        .accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 17 });
    expect(rendered).not.toContain('Available now');
    expect(rendered).not.toContain('View parking map');
    expect(rendered).not.toContain('Reserve');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps Live connected to the socket and applies valid updates only', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(
      findByAccessibilityLabel(root, 'Parking updates: Refreshing'),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      mockParkingConnectionChange(true);
    });

    expect(
      findByAccessibilityLabel(root, 'Parking updates: Live'),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      mockParkingUpdate({ availableSlot: 99 });
    });
    expect(
      findByAccessibilityLabel(root, 'Resident Parking status: Available'),
    ).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      mockParkingUpdate({
        type: 'resident',
        totalSlot: 7,
        usedSlot: 6,
        maintenanceSlot: 1,
        availableSlot: 0,
        updatedAt: '2026-08-24T09:00:00.000Z',
      });
    });

    expect(
      findByAccessibilityLabel(root, 'Resident Parking status: Full'),
    ).toBeTruthy();
    expect(
      findByAccessibilityLabel(root, 'Resident Parking occupancy').props
        .accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 100 });

    await ReactTestRenderer.act(async () => renderer.unmount());
    expect(mockSocketCleanup).toHaveBeenCalledTimes(1);
  });

  test('preserves pull-to-refresh and 30-second focused polling', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const renderer = await renderScreen();
    const refreshControl = renderer.root.findByType(RefreshControl);

    expect(fetchParkingStatus).toHaveBeenCalledTimes(1);
    expect(refreshControl.props.refreshing).toBe(false);

    await ReactTestRenderer.act(async () => {
      refreshControl.props.onRefresh();
      await Promise.resolve();
    });
    expect(fetchParkingStatus).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(fetchParkingStatus).toHaveBeenCalledTimes(3);

    await ReactTestRenderer.act(async () => renderer.unmount());
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test('preserves dynamic errors, Retry and the session-expired guard', async () => {
    fetchParkingStatus
      .mockRejectedValueOnce(new Error('Garage service unavailable'))
      .mockResolvedValueOnce(parkingItems);
    const renderer = await renderScreen();
    const root = renderer.root;

    expect(renderedText(root)).toContain('Garage service unavailable');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Retry loading parking availability',
      ).props.onPress();
      await Promise.resolve();
    });

    expect(fetchParkingStatus).toHaveBeenCalledTimes(2);
    expect(renderedText(root)).not.toContain('Garage service unavailable');
    expect(renderedText(root)).toContain('Resident Parking');

    await ReactTestRenderer.act(async () => renderer.unmount());

    fetchParkingStatus.mockRejectedValueOnce(
      Object.assign(new Error('Session expired'), { sessionExpired: true }),
    );
    const sessionRenderer = await renderScreen();
    expect(renderedText(sessionRenderer.root)).not.toContain(
      'Unable to load parking availability',
    );
    expect(renderedText(sessionRenderer.root)).not.toContain('Session expired');

    await ReactTestRenderer.act(async () => sessionRenderer.unmount());
  });

  test('preserves numeric, timestamp and unconfigured-data fallbacks', async () => {
    fetchParkingStatus.mockResolvedValueOnce([
      {
        type: 'resident',
        totalSlot: 'invalid',
        usedSlot: null,
        maintenanceSlot: undefined,
        availableSlot: 'invalid',
        updatedAt: 'not-a-date',
      },
    ]);
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(
      findByAccessibilityLabel(root, 'Resident Parking occupancy').props
        .accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 0 });
    expect(
      findByAccessibilityLabel(root, 'Resident Parking status: Full'),
    ).toBeTruthy();
    expect(rendered).toContain('Update time unavailable');
    expect(rendered).toContain('Parking data is not configured yet.');

    await ReactTestRenderer.act(async () => renderer.unmount());

    fetchParkingStatus.mockResolvedValueOnce([
      { ...parkingItems[0], updated_at: null },
      parkingItems[1],
    ]);
    const missingTimeRenderer = await renderScreen();
    expect(renderedText(missingTimeRenderer.root)).toContain(
      'Waiting for an update',
    );

    await ReactTestRenderer.act(async () => missingTimeRenderer.unmount());
  });
});
