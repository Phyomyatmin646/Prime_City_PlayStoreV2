/* eslint-env jest */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AnnouncementDetailScreen from '../src/screens/announcements/AnnouncementDetailScreen';

let mockUser = { id: 'resident-1', role: 'Resident' };

const announcement = {
  id: 'maintenance-1',
  title: 'ရေစုပ်စက် ပြုပြင်ခြင်း',
  message:
    'မနက်ဖြန် နံနက်ပိုင်းတွင် ရေစုပ်စက် ပြုပြင်မည်ဖြစ်သောကြောင့် ရေပြတ်တောက်မှု ခေတ္တရှိနိုင်ပါသည်။ အဆင်မပြေမှုအတွက် တောင်းပန်ပါသည်။',
  type: 'Maintenance',
  status: 'Active',
  audienceType: 'Block A Residents',
  date: 'Aug 24',
};

const mockNavigation = {
  goBack: jest.fn(),
};

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('../src/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#05080A',
      text: '#F5F3EF',
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

async function renderDetail(
  route = {
    params: { announcementId: announcement.id, announcement },
  },
) {
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AnnouncementDetailScreen navigation={mockNavigation} route={route} />,
    );
  });

  return renderer;
}

describe('Announcement detail screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'resident-1', role: 'Resident' };
  });

  test('renders the complete Myanmar announcement without list-preview clipping', async () => {
    const renderer = await renderDetail();
    const root = renderer.root;
    const rendered = getVisibleText(root);

    expect(rendered).toContain(announcement.title);
    expect(rendered).toContain(announcement.message);
    expect(rendered).toContain('Maintenance');
    expect(rendered).toContain('Aug 24');
    expect(
      root
        .findAll(node => node.props.children === announcement.message)
        .every(node => node.props.numberOfLines === undefined),
    ).toBe(true);
    expect(rendered).not.toContain('Lifecycle information');
    expect(rendered).not.toContain('Block A Residents');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps lifecycle metadata role-protected for Admin and Staff', async () => {
    mockUser = { id: 'staff-1', role: 'Staff' };
    const renderer = await renderDetail();
    const rendered = getVisibleText(renderer.root);

    expect(rendered).toContain('Lifecycle information');
    expect(rendered).toContain('Active');
    expect(rendered).toContain('Block A Residents');

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('shows a safe fallback when route data is unavailable', async () => {
    const renderer = await renderDetail({ params: {} });
    const root = renderer.root;
    expect(getVisibleText(root)).toContain('Announcement unavailable');

    const backButton = root.find(
      node => node.props.accessibilityLabel === 'Go back to announcements',
    );
    await ReactTestRenderer.act(async () => backButton.props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
