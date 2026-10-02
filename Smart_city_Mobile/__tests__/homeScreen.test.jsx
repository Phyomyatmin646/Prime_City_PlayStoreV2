/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import HomeScreen, {
  AD_ADVANCE_INTERVAL,
  AD_WINDOW_SIZE,
  getAdvertisementIndex,
  getAdvertisementWindow,
  getHomeIdentity,
  getHomeQuickActions,
  getOverdueBills,
  getTimeGreeting,
  isHomeResident,
  QUICK_ACTIONS,
} from '../src/screens/home/HomeScreen';
import { fetchAnnouncements } from '../src/api/announcements';
import { fetchAdvertisements } from '../src/api/advertisements';
import { fetchBills } from '../src/api/bills';
import { fetchProfile } from '../src/api/profile';

let mockUser = {
  id: 'resident-1',
  role: 'Resident',
  fullname: 'Phyo Myat Min',
  room_number: 'A-S53',
};
const mockSetUser = jest.fn();
let mockScreenProps;

const mockNavigation = {
  navigate: jest.fn(),
};

const announcements = [
  {
    _id: 'announcement-1',
    title: 'ရေစုပ်စက် ပြုပြင်ခြင်း',
    message:
      'မနက်ဖြန် နံနက်ပိုင်းတွင် ရေစုပ်စက် ပြုပြင်မည်ဖြစ်သောကြောင့် ရေပြတ်တောက်မှု ခေတ္တရှိနိုင်ပါသည်။',
    type: 'Maintenance',
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

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, setUser: mockSetUser }),
}));

jest.mock('../src/components/ScreenContainer', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return function MockScreenContainer(props) {
    mockScreenProps = props;
    return ReactModule.createElement(View, null, props.children);
  };
});

jest.mock('../src/api/announcements', () => ({
  fetchAnnouncements: jest.fn(),
}));

jest.mock('../src/api/advertisements', () => ({
  fetchAdvertisements: jest.fn(),
}));

jest.mock('../src/api/bills', () => ({
  fetchBills: jest.fn(),
}));

jest.mock('../src/api/profile', () => ({
  fetchProfile: jest.fn(),
}));

function findByAccessibilityLabel(root, label) {
  return root.find(node => node.props.accessibilityLabel === label);
}

function getVisibleText(root) {
  return root
    .findAll(
      node =>
        typeof node.props.children === 'string' ||
        typeof node.props.children === 'number',
    )
    .map(node => String(node.props.children))
    .join('\n');
}

async function renderHome() {
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <HomeScreen navigation={mockNavigation} />,
    );
  });

  return renderer;
}

describe('Home screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScreenProps = undefined;
    mockUser = {
      id: 'resident-1',
      role: 'Resident',
      fullname: 'Phyo Myat Min',
      room_number: 'A-S53',
    };
    fetchProfile.mockResolvedValue({ phone: '09793575214' });
    fetchAnnouncements.mockResolvedValue(announcements);
    fetchAdvertisements.mockResolvedValue([]);
    fetchBills.mockResolvedValue([
      {
        _id: 'overdue-1',
        status: 'Pending',
        due_date: '2026-01-01T00:00:00.000Z',
      },
      {
        _id: 'paid-1',
        status: 'Paid',
        due_date: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  test('keeps deterministic identity, greeting, bill, ad and role rules', () => {
    expect(getTimeGreeting(new Date(2026, 0, 1, 5))).toBe('Good morning');
    expect(getTimeGreeting(new Date(2026, 0, 1, 12))).toBe('Good afternoon');
    expect(getTimeGreeting(new Date(2026, 0, 1, 17))).toBe('Good evening');
    expect(getTimeGreeting(new Date(2026, 0, 1, 23))).toBe('Good night');

    expect(
      getHomeIdentity({
        fullname: ' Resident One ',
        name: 'Ignored Name',
        role: 'Resident',
        room_number: 'B-12',
      }),
    ).toEqual({
      displayName: 'Resident One',
      residenceLabel: 'Unit B-12 · Smart Residential',
    });
    expect(
      getHomeIdentity({ email: 'fallback@example.com', role: 'Admin' }),
    ).toEqual({
      displayName: 'fallback',
      residenceLabel: 'Administrator',
    });
    expect(getHomeIdentity({ role: 'Staff' }).residenceLabel).toBe('Staff');

    expect(isHomeResident('Resident')).toBe(true);
    expect(isHomeResident('Admin')).toBe(false);
    expect(isHomeResident('Staff')).toBe(false);

    const bills = [
      { id: 'overdue', status: 'Pending', due_date: '2026-08-23' },
      { id: 'future', status: 'Pending', due_date: '2026-08-25' },
      { id: 'paid', status: 'Paid', due_date: '2026-08-23' },
      { id: 'invalid', status: 'Pending', due_date: 'not-a-date' },
    ];
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(getOverdueBills(bills, now, 'Resident')).toEqual([bills[0]]);
    expect(getOverdueBills(bills, now, 'Admin')).toEqual([]);

    const ads = Array.from({ length: 9 }, (_, index) => ({ id: index }));
    expect(AD_WINDOW_SIZE).toBe(7);
    expect(AD_ADVANCE_INTERVAL).toBe(4500);
    expect(getAdvertisementWindow(ads, 5).map(item => item.id)).toEqual([
      5, 6, 7, 8, 0, 1, 2,
    ]);
    expect(getAdvertisementIndex(210, 100, 3)).toBe(2);
    expect(getAdvertisementIndex(-90, 100, 3)).toBe(0);

    expect(getHomeQuickActions('Resident')).toBe(QUICK_ACTIONS);
    expect(getHomeQuickActions('Staff')).toBe(QUICK_ACTIONS);
    expect(getHomeQuickActions('Admin').map(action => action.label)).toEqual([
      'Send Noti',
      'Bills',
      'Helper Requests',
      'Visitor',
      'Alerts',
      'Parking Slots',
      'Wallet & Shops',
      'Playground',
      'Announcements',
      'Resident Reports',
      'AI Feedback & RAG',
    ]);
  });

  test('resident keeps live API calls, all existing actions and exact navigation', async () => {
    const renderer = await renderHome();
    const root = renderer.root;
    const rendered = getVisibleText(root);

    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(fetchAnnouncements).toHaveBeenCalledWith({ limit: 5 });
    expect(fetchAdvertisements).toHaveBeenCalledWith({ status: 'all' });
    expect(fetchBills).toHaveBeenCalledTimes(1);
    expect(mockSetUser).toHaveBeenCalledTimes(1);
    expect(mockSetUser.mock.calls[0][0]({ preserved: true })).toEqual({
      preserved: true,
      phone: '09793575214',
    });

    expect(mockScreenProps.themeOverride.background).toBe('#05080A');
    expect(mockScreenProps.topBarBrandImage).toBeTruthy();
    expect(mockScreenProps.topBarBrandLabel).toBe('Prime City');
    expect(
      root.find(node => node.props.accessibilityRole === 'header').props
        .children,
    ).toEqual(['Welcome, ', 'Phyo Myat Min']);
    expect(rendered).toContain('Unit A-S53 · Smart Residential');
    expect(rendered).toContain('Payment overdue');
    expect(rendered).toContain('Quick actions');
    expect(rendered).toContain('My History');
    expect(rendered).toContain('Submit a report');
    expect(rendered).toContain('Latest announcements');
    expect(rendered).toContain('ရေစုပ်စက် ပြုပြင်ခြင်း');
    expect(rendered).not.toContain('Residence is secure');
    expect(rendered).not.toContain('View all');
    expect(rendered).not.toContain('AYA Bank');

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(root, 'Bills quick action').props.onPress();
      findByAccessibilityLabel(root, 'Report now').props.onPress();
      root
        .find(
          node =>
            typeof node.props.accessibilityLabel === 'string' &&
            node.props.accessibilityLabel.startsWith('Open overdue bills.'),
        )
        .props.onPress();
    });

    expect(mockNavigation.navigate).toHaveBeenNthCalledWith(1, 'Bills');
    expect(mockNavigation.navigate).toHaveBeenNthCalledWith(2, 'ReportIssue');
    expect(mockNavigation.navigate).toHaveBeenNthCalledWith(3, 'Bills');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test.each([
    {
      role: 'Admin',
      visibleActions: [
        'Send Noti quick action',
        'Helper Requests quick action',
        'Wallet & Shops quick action',
        'Resident Reports quick action',
        'AI Feedback & RAG quick action',
      ],
      hiddenText: ['My History', 'Submit a report'],
    },
    {
      role: 'Staff',
      visibleActions: ['Helpers quick action', 'My History quick action'],
      hiddenText: ['Send Noti', 'Submit a report'],
    },
  ])(
    '$role keeps its original action visibility and skips resident bill loading',
    async ({ role, visibleActions, hiddenText }) => {
      mockUser = { id: `${role.toLowerCase()}-1`, role, fullname: role };
      const renderer = await renderHome();
      const root = renderer.root;
      const rendered = getVisibleText(root);

      expect(fetchBills).not.toHaveBeenCalled();
      visibleActions.forEach(label => {
        expect(findByAccessibilityLabel(root, label)).toBeTruthy();
      });
      hiddenText.forEach(text => expect(rendered).not.toContain(text));

      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
});
