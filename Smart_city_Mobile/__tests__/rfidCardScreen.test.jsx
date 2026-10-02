/* eslint-env jest */

import React from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import RfidCardScreen from '../src/screens/rfid/RfidCardScreen';
import {
  fetchMyRfidWallet,
  fetchPrimeCityMerchants,
  payPrimeCityMerchant,
} from '../src/api/rfidWallet';
import { fetchResidentsForNotifications } from '../src/api/adminNotifications';
import { showPrimeAlert } from '../src/services/primeAlert';
import { getResidentWalletTheme } from '../src/screens/rfid/residentWalletTheme';

let mockUserRole = 'Resident';
let mockScreenContainerProps;

const merchant = {
  _id: 'merchant-1',
  name: 'Prime Market',
  location: '',
  merchant_code: 'SHOP-001',
};

const walletData = {
  card: {
    assigned: true,
    status: 'active',
    masked_uid: 'PC-••••-4821',
  },
  wallet: {
    status: 'Active',
    balance_mmk: 2500,
  },
  transactions: [
    {
      _id: 'payment-1',
      type: 'Payment',
      description: 'Lunch payment',
      merchant_id: { name: 'Prime Market' },
      payment_reference: 'PAY-001',
      created_at: '2026-08-24T08:00:00.000Z',
      amount_mmk: 500,
    },
    {
      _id: 'credit-1',
      type: 'Credit',
      description: 'Wallet credit',
      created_at: 'not-a-date',
      amount_mmk: 3000,
    },
  ],
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

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockUserRole } }),
}));

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
      warning: '#F59E0B',
      warningBg: '#3B2506',
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

jest.mock('../src/api/rfidWallet', () => ({
  createPrimeCityMerchant: jest.fn(),
  creditRfidWallet: jest.fn(),
  fetchMyRfidWallet: jest.fn(),
  fetchPrimeCityMerchantLedger: jest.fn(),
  fetchPrimeCityMerchants: jest.fn(),
  payPrimeCityMerchant: jest.fn(),
  settlePrimeCityMerchant: jest.fn(),
}));

jest.mock('../src/api/adminNotifications', () => ({
  fetchResidentsForNotifications: jest.fn(),
}));

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
}));

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

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

async function renderScreen() {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <RfidCardScreen navigation={{ goBack: jest.fn() }} />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

describe('Resident My Wallet contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRole = 'Resident';
    mockScreenContainerProps = undefined;
    fetchMyRfidWallet.mockResolvedValue(walletData);
    fetchPrimeCityMerchants.mockResolvedValue([merchant]);
    fetchResidentsForNotifications.mockResolvedValue([]);
    payPrimeCityMerchant.mockResolvedValue({
      payment_reference: 'PAY-SUCCESS-1',
    });
  });

  test('keeps the resident Wallet palette scoped and light-mode compatible', () => {
    expect(getResidentWalletTheme({ mode: 'dark' })).toEqual(
      expect.objectContaining({
        background: '#05080A',
        primary: '#F5AD27',
        mode: 'dark',
      }),
    );

    const lightTheme = getResidentWalletTheme({
      mode: 'light',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      border: '#D0D5DD',
      text: '#101828',
      primary: '#B87508',
    });
    expect(lightTheme).toEqual(
      expect.objectContaining({
        mode: 'light',
        background: '#FAFAFA',
        card: '#FFFFFF',
        text: '#101828',
        primary: '#B87508',
      }),
    );
  });

  test('keeps resident routing, shared chrome, dynamic wallet data and exact content', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(mockScreenContainerProps).toEqual(
      expect.objectContaining({
        topBarVariant: 'stack',
        title: 'My Wallet',
        showBottomNav: true,
      }),
    );
    expect(mockScreenContainerProps.themeOverride.background).toBe('#05080A');
    expect(fetchMyRfidWallet).toHaveBeenCalledTimes(1);
    expect(fetchPrimeCityMerchants).toHaveBeenCalledTimes(1);
    expect(rendered).toContain('PRIME CITY RESIDENT');
    expect(rendered).toContain('RFID Access & Wallet');
    expect(rendered).toContain('PC-••••-4821');
    expect(rendered).toContain('ACTIVE');
    expect(rendered).toContain('2,500 MMK');
    expect(rendered).toContain(
      'Wallet credits are added by authorized Admin/Staff only. Every payment is recorded in your private transaction history.',
    );
    expect(rendered).toContain('Prime City · SHOP-001');
    expect(rendered).toContain('-500 MMK');
    expect(rendered).toContain('+3,000 MMK');
    expect(rendered).toContain('Prime Market · PAY-001');
    expect(rendered).toContain('—');
    expect(rendered).not.toContain('Request access card');
    expect(rendered).not.toContain('View activity');
    expect(rendered).not.toContain('VALID THRU');
    expect(rendered).not.toContain('NFC');
    expect(rendered).not.toContain('Learn about wallet payments');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test.each(['Admin', 'Staff'])(
    '%s still receives the existing Wallet & Shops screen',
    async role => {
      mockUserRole = role;
      const renderer = await renderScreen();

      expect(mockScreenContainerProps).toEqual(
        expect.objectContaining({
          topBarVariant: 'stack',
          title: 'Wallet & Shops',
          showBottomNav: true,
        }),
      );
      expect(fetchResidentsForNotifications).toHaveBeenCalledTimes(1);
      expect(fetchMyRfidWallet).not.toHaveBeenCalled();

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test('preserves loading, fallback error, Retry and pull-to-refresh behavior', async () => {
    let resolveWallet;
    fetchMyRfidWallet.mockReturnValueOnce(
      new Promise(resolve => {
        resolveWallet = resolve;
      }),
    );
    const loadingRenderer = await renderScreen();
    expect(loadingRenderer.root.findByType(ActivityIndicator)).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      resolveWallet(walletData);
      await Promise.resolve();
    });
    await ReactTestRenderer.act(async () => loadingRenderer.unmount());

    fetchMyRfidWallet.mockClear();
    fetchPrimeCityMerchants.mockClear();
    fetchMyRfidWallet.mockRejectedValueOnce({});
    const errorRenderer = await renderScreen();
    expect(renderedText(errorRenderer.root)).toContain(
      'Unable to load RFID card',
    );

    fetchMyRfidWallet.mockResolvedValueOnce(walletData);
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        errorRenderer.root,
        'Retry loading wallet',
      ).props.onPress();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMyRfidWallet).toHaveBeenCalledTimes(2);

    const refreshControl = errorRenderer.root.findByType(RefreshControl);
    expect(refreshControl.props.refreshing).toBe(false);
    await ReactTestRenderer.act(async () => {
      await refreshControl.props.onRefresh();
    });
    expect(fetchMyRfidWallet).toHaveBeenCalledTimes(3);

    await ReactTestRenderer.act(async () => errorRenderer.unmount());
  });

  test('shows truthful unassigned, empty merchant and empty transaction states', async () => {
    fetchMyRfidWallet.mockResolvedValueOnce({
      card: { assigned: false },
      wallet: { status: 'Active', balance_mmk: 0 },
      transactions: [],
    });
    fetchPrimeCityMerchants.mockResolvedValueOnce([]);
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = renderedText(root);

    expect(rendered).toContain('No card assigned');
    expect(rendered).toContain('UNASSIGNED');
    expect(rendered).toContain('No approved shops are available yet.');
    expect(rendered).toContain('No RFID wallet transactions yet.');
    expect(
      findByAccessibilityLabel(root, 'Confirm shop payment').props.disabled,
    ).toBe(true);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves merchant, card, amount and balance validation order and alerts', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const confirmButton = findByAccessibilityLabel(
      root,
      'Confirm shop payment',
    );

    await ReactTestRenderer.act(async () => confirmButton.props.onPress());
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Choose a shop',
      'Select the Prime City shop you are paying.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Prime Market, Prime City, SHOP-001',
      ).props.onPress();
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.onChangeText(
        '1.5',
      );
    });
    showPrimeAlert.mockClear();
    await ReactTestRenderer.act(async () => confirmButton.props.onPress());
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Invalid amount',
      'Enter a positive whole MMK amount.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.onChangeText(
        '2501',
      );
    });
    showPrimeAlert.mockClear();
    await ReactTestRenderer.act(async () => confirmButton.props.onPress());
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Insufficient balance',
      'Your wallet does not have enough credit.',
    );
    expect(payPrimeCityMerchant).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => renderer.unmount());

    fetchMyRfidWallet.mockResolvedValueOnce({
      ...walletData,
      card: { ...walletData.card, status: 'inactive' },
    });
    const inactiveRenderer = await renderScreen();
    const inactiveRoot = inactiveRenderer.root;
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        inactiveRoot,
        'Prime Market, Prime City, SHOP-001',
      ).props.onPress();
      findByAccessibilityLabel(
        inactiveRoot,
        'Exact amount in MMK',
      ).props.onChangeText('100');
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        inactiveRoot,
        'Confirm shop payment',
      ).props.onPress();
    });
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Wallet unavailable',
      'An active RFID card and wallet are required.',
    );

    await ReactTestRenderer.act(async () => inactiveRenderer.unmount());
  });

  test('keeps confirmation, exact payload, idempotency, success reset and refresh', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Prime Market, Prime City, SHOP-001',
      ).props.onPress();
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.onChangeText(
        '1200',
      );
      findByAccessibilityLabel(
        root,
        'Payment note, optional',
      ).props.onChangeText('  Counter 4  ');
    });

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Confirm shop payment').props.onPress();
    });
    expect(payPrimeCityMerchant).not.toHaveBeenCalled();
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Confirm shop payment',
      'Pay 1,200 MMK to Prime Market? This cannot be undone by the resident.',
      expect.any(Array),
    );

    const confirmButtons = showPrimeAlert.mock.calls.at(-1)[2];
    expect(confirmButtons[0]).toEqual({ text: 'Cancel', style: 'cancel' });
    await ReactTestRenderer.act(async () => {
      await confirmButtons[1].onPress();
    });

    expect(payPrimeCityMerchant).toHaveBeenCalledTimes(1);
    expect(payPrimeCityMerchant).toHaveBeenCalledWith({
      merchant_id: 'merchant-1',
      amount_mmk: 1200,
      note: 'Counter 4',
      idempotency_key: expect.stringMatching(/^wallet-\d+-[a-z0-9]+$/),
    });
    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Payment successful',
      '1,200 MMK paid to Prime Market.\nReference: PAY-SUCCESS-1',
    );
    expect(fetchMyRfidWallet).toHaveBeenCalledTimes(2);
    expect(
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.value,
    ).toBe('');
    expect(
      findByAccessibilityLabel(root, 'Payment note, optional').props.value,
    ).toBe('');
    expect(
      findByAccessibilityLabel(root, 'Prime Market, Prime City, SHOP-001').props
        .accessibilityState,
    ).toEqual({ selected: false });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves form values and backend message after a failed payment', async () => {
    payPrimeCityMerchant.mockRejectedValueOnce(
      new Error('Merchant terminal unavailable'),
    );
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Prime Market, Prime City, SHOP-001',
      ).props.onPress();
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.onChangeText(
        '700',
      );
      findByAccessibilityLabel(
        root,
        'Payment note, optional',
      ).props.onChangeText('Keep this note');
    });
    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Confirm shop payment').props.onPress();
    });
    const confirmButtons = showPrimeAlert.mock.calls.at(-1)[2];
    await ReactTestRenderer.act(async () => {
      await confirmButtons[1].onPress();
    });

    expect(showPrimeAlert).toHaveBeenLastCalledWith(
      'Payment failed',
      'Merchant terminal unavailable',
    );
    expect(
      findByAccessibilityLabel(root, 'Exact amount in MMK').props.value,
    ).toBe('700');
    expect(
      findByAccessibilityLabel(root, 'Payment note, optional').props.value,
    ).toBe('Keep this note');
    expect(
      findByAccessibilityLabel(root, 'Prime Market, Prime City, SHOP-001').props
        .accessibilityState,
    ).toEqual({ selected: true });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
