/* eslint-env jest */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PlaygroundScreen from '../src/screens/playground/PlaygroundScreen';
import {
  createPlaygroundRegistration,
  fetchMyPlaygroundRegistrations,
  fetchPlaygroundConfig,
  updatePlaygroundRegistrationStatus,
} from '../src/api/playground';
import { showPrimeAlert } from '../src/services/primeAlert';
import {
  buildPlaygroundRegistrationPayload,
  getPlaygroundSlotIcon,
  getPlaygroundStatusTone,
  getPlaygroundValidation,
  normalizePlaygroundSlots,
} from '../src/screens/playground/playgroundUi';
import {
  containsMyanmarText,
  getMyanmarTextStyle,
} from '../src/theme/typography';

let mockUserRole = 'Resident';
let mockScreenContainerProps;
let mockAppTheme = {
  mode: 'dark',
  danger: '#EF4444',
  dangerBg: '#3B1118',
  success: '#10B981',
  successBg: '#052E1C',
  warning: '#F59E0B',
  warningBg: '#3B2506',
};

const paidConfig = {
  time_slots: ['Early session', 'Late session'],
  pricing_configured: true,
  discounted_fee_mmk: 12000,
  resident_discount_percent: 20,
};

const residentRegistration = {
  _id: 'registration-1',
  child_name: 'Ma Thiri',
  child_age: 8,
  requested_date: '2026-08-28T00:00:00.000Z',
  time_slot: 'Early session',
  status: 'Pending',
  payment_status: 'Unpaid',
  payment_method: 'Pay at desk',
  pricing_status: 'Final',
  amount_due_mmk: 12000,
  notes: 'Bring water',
  user_id: { fullname: 'Resident One' },
  room_id: { room_name: 'A-101' },
};

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');
  return {
    useFocusEffect: callback => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockUserRole } }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({ theme: mockAppTheme }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return function MockScreenContainer({ children, ...props }) {
    mockScreenContainerProps = props;
    return ReactModule.createElement(View, null, children);
  };
});

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

jest.mock('../src/api/playground', () => ({
  createPlaygroundRegistration: jest.fn(),
  fetchMyPlaygroundRegistrations: jest.fn(),
  fetchPlaygroundConfig: jest.fn(),
  updatePlaygroundRegistrationStatus: jest.fn(),
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

function visibleText(root) {
  return root
    .findAll(node => flattenText(node.props.children))
    .map(node => flattenText(node.props.children))
    .join('\n');
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderScreen() {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <PlaygroundScreen navigation={navigation} />,
    );
    await flushPromises();
  });
  return { navigation, renderer };
}

async function enterValidChild(root, values = {}) {
  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Child name').props.onChangeText(
      values.name || '  Su Su  ',
    );
    findByAccessibilityLabel(root, 'Child age').props.onChangeText(
      values.age || '8',
    );
    findByAccessibilityLabel(root, 'Requested date').props.onChangeText(
      values.date || '2026-08-30',
    );
  });
}

async function goToSession(root, values) {
  await enterValidChild(root, values);
  await ReactTestRenderer.act(async () => {
    findByAccessibilityLabel(root, 'Continue to session').props.onPress();
  });
}

describe('Playground resident and management flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRole = 'Resident';
    mockScreenContainerProps = undefined;
    mockAppTheme = {
      mode: 'dark',
      danger: '#EF4444',
      dangerBg: '#3B1118',
      success: '#10B981',
      successBg: '#052E1C',
      warning: '#F59E0B',
      warningBg: '#3B2506',
    };
    fetchPlaygroundConfig.mockResolvedValue(paidConfig);
    fetchMyPlaygroundRegistrations.mockResolvedValue([]);
    createPlaygroundRegistration.mockResolvedValue({ _id: 'created-1' });
    updatePlaygroundRegistrationStatus.mockResolvedValue({});
  });

  test('keeps slot, validation, status, payload, and Myanmar typography rules deterministic', () => {
    expect(normalizePlaygroundSlots(['Morning', 'Custom'])).toEqual([
      'Morning',
      'Custom',
    ]);
    expect(normalizePlaygroundSlots([])).toEqual([
      'Morning',
      'Afternoon',
      'Evening',
    ]);
    expect(getPlaygroundSlotIcon('Morning')).toBe('partly-sunny-outline');
    expect(getPlaygroundSlotIcon('Unknown')).toBe('time-outline');
    expect(getPlaygroundStatusTone('Waitlisted')).toBe('warning');
    expect(getPlaygroundStatusTone('Completed')).toBe('success');
    expect(
      getPlaygroundValidation({
        childName: '',
        childAge: '8',
        date: '2026-08-30',
      }),
    ).toEqual({
      title: 'Child name required',
      message: 'Enter the child name for this registration.',
    });
    expect(
      buildPlaygroundRegistrationPayload({
        childName: '  မောင်မောင်  ',
        childAge: '9',
        date: ' 2026-08-30 ',
        timeSlot: 'Morning',
        paymentMethod: 'RFID Wallet',
        hasPaidPrice: false,
        notes: '  မြန်မာမှတ်စု  ',
      }),
    ).toEqual({
      child_name: 'မောင်မောင်',
      child_age: 9,
      requested_date: '2026-08-30',
      time_slot: 'Morning',
      payment_method: 'Pay at desk',
      notes: 'မြန်မာမှတ်စု',
    });
    expect(containsMyanmarText('မောင်မောင်')).toBe(true);
    expect(getMyanmarTextStyle('မောင်မောင်')?.fontFamily).toContain('Walone');
  });

  test('shows exactly three local stages and preserves the existing Step 1 alerts without submitting', async () => {
    const { renderer } = await renderScreen();
    const root = renderer.root;

    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        title: 'Playground',
        topBarVariant: 'stack',
        showBottomNav: true,
      }),
    );
    expect(visibleText(root)).toContain('Child');
    expect(visibleText(root)).toContain('Session');
    expect(visibleText(root)).toContain('Review');
    expect(visibleText(root)).not.toContain('View guidelines');
    expect(visibleText(root)).not.toContain('8 AM');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue to session').props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Child name required',
      'Enter the child name for this registration.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Child name').props.onChangeText('Child');
      findByAccessibilityLabel(root, 'Child age').props.onChangeText('18');
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue to session').props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Invalid age',
      'Child age must be between 1 and 17.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Child age').props.onChangeText('8');
      findByAccessibilityLabel(root, 'Requested date').props.onChangeText(
        '30/08/2026',
      );
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue to session').props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Invalid date',
      'Use the YYYY-MM-DD date format.',
    );
    expect(createPlaygroundRegistration).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('uses real config sessions, preserves edits, submits one exact paid payload, then resets and reloads', async () => {
    let resolveCreate;
    createPlaygroundRegistration.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreate = resolve;
        }),
    );
    const { renderer } = await renderScreen();
    const root = renderer.root;

    await goToSession(root);
    expect(createPlaygroundRegistration).not.toHaveBeenCalled();
    expect(visibleText(root)).toContain('Early session');
    expect(visibleText(root)).toContain('Late session');
    expect(visibleText(root)).not.toContain('Morning');
    expect(visibleText(root)).not.toContain('12–4 PM');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Session Late session').props.onPress();
      findByAccessibilityLabel(root, 'RFID Wallet').props.onPress();
      findByAccessibilityLabel(root, 'Playground notes').props.onChangeText(
        '  Bring a hat  ',
      );
      findByAccessibilityLabel(root, 'Continue to review').props.onPress();
    });

    expect(visibleText(root)).toContain('Su Su · Age 8');
    expect(visibleText(root)).toContain('Late session');
    expect(visibleText(root)).toContain('RFID Wallet');
    expect(visibleText(root)).toContain('12,000 MMK');
    expect(visibleText(root)).toContain('Bring a hat');
    expect(createPlaygroundRegistration).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Edit child details').props.onPress();
    });
    expect(findByAccessibilityLabel(root, 'Child name').props.value).toBe(
      '  Su Su  ',
    );
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue to session').props.onPress();
    });
    expect(
      findByAccessibilityLabel(root, 'Session Late session').props
        .accessibilityState.selected,
    ).toBe(true);
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Continue to review').props.onPress();
    });

    const submit = findByAccessibilityLabel(root, 'Submit registration');
    await ReactTestRenderer.act(async () => {
      submit.props.onPress();
      submit.props.onPress();
      await Promise.resolve();
    });
    expect(createPlaygroundRegistration).toHaveBeenCalledTimes(1);
    expect(createPlaygroundRegistration).toHaveBeenCalledWith({
      child_name: 'Su Su',
      child_age: 8,
      requested_date: '2026-08-30',
      time_slot: 'Late session',
      payment_method: 'RFID Wallet',
      notes: 'Bring a hat',
    });

    await ReactTestRenderer.act(async () => {
      resolveCreate({ _id: 'created-1' });
      await flushPromises();
    });
    expect(fetchPlaygroundConfig).toHaveBeenCalledTimes(2);
    expect(fetchMyPlaygroundRegistrations).toHaveBeenCalledTimes(2);
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Registration submitted',
      'Admin can now review the playground booking.',
    );
    expect(visibleText(root)).toContain('Child details');
    expect(findByAccessibilityLabel(root, 'Child name').props.value).toBe('');
    expect(findByAccessibilityLabel(root, 'Child age').props.value).toBe('');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('uses fallback sessions, hides payment options, and preserves values after a failed final submission', async () => {
    fetchPlaygroundConfig.mockResolvedValue({
      time_slots: [],
      pricing_configured: false,
    });
    createPlaygroundRegistration.mockRejectedValue(new Error('Network down'));
    const { renderer } = await renderScreen();
    const root = renderer.root;

    await goToSession(root, { name: 'Mya', age: '6', date: '2026-09-01' });
    expect(visibleText(root)).toContain('Morning');
    expect(visibleText(root)).toContain('Afternoon');
    expect(visibleText(root)).toContain('Evening');
    expect(visibleText(root)).not.toContain('RFID Wallet');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Session Evening').props.onPress();
      findByAccessibilityLabel(root, 'Playground notes').props.onChangeText(
        'Needs support',
      );
      findByAccessibilityLabel(root, 'Continue to review').props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Submit registration').props.onPress();
      await flushPromises();
    });

    expect(createPlaygroundRegistration).toHaveBeenCalledWith({
      child_name: 'Mya',
      child_age: 6,
      requested_date: '2026-09-01',
      time_slot: 'Evening',
      payment_method: 'Pay at desk',
      notes: 'Needs support',
    });
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Unable to register',
      'Network down',
    );
    expect(visibleText(root)).toContain('Review registration');
    expect(visibleText(root)).toContain('Needs support');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps resident history, pull-to-refresh, shared light mode, and Myanmar layout safeguards', async () => {
    mockAppTheme = {
      ...mockAppTheme,
      mode: 'light',
      danger: '#ED2933',
      dangerBg: '#FFF0F1',
      success: '#299B42',
      successBg: '#EDF9F0',
      warning: '#B87508',
      warningBg: '#FFF5DE',
    };
    fetchMyPlaygroundRegistrations.mockResolvedValue([
      { ...residentRegistration, child_name: 'မသီရိ', notes: 'ရေဘူးယူလာမည်' },
    ]);
    const { renderer } = await renderScreen();
    const root = renderer.root;

    expect(mockScreenContainerProps.themeOverride).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAF9F6',
        card: '#FFFFFF',
        text: '#151310',
      }),
    );
    expect(visibleText(root)).toContain('မသီရိ');
    expect(visibleText(root)).toContain('ရေဘူးယူလာမည်');
    const myanmarText = root
      .findAll(node => flattenText(node.props.children) === 'မသီရိ')
      .find(node =>
        StyleSheet.flatten(node.props.style)?.fontFamily?.includes('Walone'),
      );
    expect(myanmarText).toBeTruthy();
    expect(StyleSheet.flatten(myanmarText.props.style).fontFamily).toContain(
      'Walone',
    );
    expect(
      StyleSheet.flatten(myanmarText.props.style).lineHeight,
    ).toBeGreaterThan(17);

    const scroll = root.findByType(ScrollView);
    await ReactTestRenderer.act(async () => {
      scroll.props.refreshControl.props.onRefresh();
      await flushPromises();
    });
    expect(fetchPlaygroundConfig).toHaveBeenCalledTimes(2);
    expect(fetchMyPlaygroundRegistrations).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test.each(['Admin', 'Staff'])(
    '%s does not see the resident wizard and retains exact status management',
    async role => {
      mockUserRole = role;
      fetchMyPlaygroundRegistrations.mockResolvedValue([residentRegistration]);
      const { renderer } = await renderScreen();
      const root = renderer.root;

      expect(visibleText(root)).not.toContain('Child details');
      expect(visibleText(root)).not.toContain('Resident children offer');
      expect(visibleText(root)).toContain('Resident registrations');
      expect(visibleText(root)).toContain('Resident One');
      expect(visibleText(root)).toContain('A-101');
      expect(visibleText(root)).toContain('12,000 MMK');

      await ReactTestRenderer.act(async () => {
        findByAccessibilityLabel(
          root,
          'Set Ma Thiri to Confirmed',
        ).props.onPress();
      });
      const confirmation = showPrimeAlert.mock.calls.find(
        call => call[0] === 'Confirmed registration',
      );
      expect(confirmation).toBeTruthy();
      await ReactTestRenderer.act(async () => {
        await confirmation[2][1].onPress();
        await flushPromises();
      });
      expect(updatePlaygroundRegistrationStatus).toHaveBeenCalledWith(
        'registration-1',
        'Confirmed',
      );

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test('shows role-specific empty copy and recovers from a real loading error with Retry', async () => {
    fetchPlaygroundConfig.mockRejectedValueOnce(new Error('Service offline'));
    const { renderer } = await renderScreen();
    const root = renderer.root;

    expect(visibleText(root)).toContain('Service offline');
    expect(visibleText(root)).toContain('No playground registrations yet.');
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Retry playground').props.onPress();
      await flushPromises();
    });
    expect(fetchPlaygroundConfig).toHaveBeenCalledTimes(2);
    expect(visibleText(root)).toContain('Child details');

    await ReactTestRenderer.act(async () => renderer.unmount());

    mockUserRole = 'Admin';
    const admin = await renderScreen();
    expect(visibleText(admin.renderer.root)).toContain(
      'No resident registrations yet.',
    );
    await ReactTestRenderer.act(async () => admin.renderer.unmount());
  });
});
