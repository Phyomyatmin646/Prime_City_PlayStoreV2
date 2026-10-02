/* eslint-env jest */

import React from 'react';
import { RefreshControl } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AnnouncementsScreen, {
  canArchiveAnnouncement,
  canCompleteAnnouncement,
  getAnnouncementLifecycleMessage,
  getAnnouncementTypeMeta,
  isAnnouncementAdmin,
  mapAnnouncement,
} from '../src/screens/announcements/AnnouncementsScreen';
import {
  archiveAnnouncement,
  completeMaintenanceAnnouncement,
  fetchAnnouncements,
} from '../src/api/announcements';
import { showPrimeAlert } from '../src/services/primeAlert';

let mockUser = { id: 'resident-1', role: 'Resident' };
const mockNavigation = { navigate: jest.fn() };

const announcements = [
  {
    _id: 'general-1',
    title: 'Community update',
    message: 'The lobby will remain open during normal hours.',
    type: 'General',
    status: 'Active',
    audience_type: 'All Residents',
    created_at: '2026-08-24T08:00:00.000Z',
  },
  {
    _id: 'maintenance-1',
    title: 'ရေစုပ်စက် ပြုပြင်ခြင်း',
    message:
      'မနက်ဖြန် နံနက်ပိုင်းတွင် ရေစုပ်စက် ပြုပြင်မည်ဖြစ်သောကြောင့် ရေပြတ်တောက်မှု ခေတ္တရှိနိုင်ပါသည်။',
    type: 'Maintenance',
    status: 'Active',
    audience_type: 'Block A Residents',
    created_at: '2026-08-23T08:00:00.000Z',
  },
  {
    _id: 'event-1',
    title: 'Resident gathering',
    message: 'The event has ended.',
    type: 'Event',
    status: 'Archived',
    audience_type: 'All Residents',
    created_at: '2026-08-22T08:00:00.000Z',
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

jest.mock('../src/api/announcements', () => ({
  archiveAnnouncement: jest.fn(),
  completeMaintenanceAnnouncement: jest.fn(),
  fetchAnnouncements: jest.fn(),
}));

jest.mock('../src/services/primeAlert', () => ({
  showPrimeAlert: jest.fn(),
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

function getAlertButton(title, buttonText) {
  const call = showPrimeAlert.mock.calls.find(
    ([alertTitle]) => alertTitle === title,
  );
  return call?.[2]?.find(button => button.text === buttonText);
}

async function renderScreen() {
  let renderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <AnnouncementsScreen navigation={mockNavigation} />,
    );
  });

  return renderer;
}

describe('Announcements screen contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'resident-1', role: 'Resident' };
    fetchAnnouncements.mockResolvedValue(announcements);
    completeMaintenanceAnnouncement.mockResolvedValue({
      delivery: { recipientCount: 1 },
    });
    archiveAnnouncement.mockResolvedValue({
      delivery: { recipientCount: 2 },
    });
  });

  test('keeps mapping, role and lifecycle rules unchanged', () => {
    expect(
      mapAnnouncement({
        _id: 'a-1',
        title: 'Title',
        message: 'Message',
        type: 'Unknown',
        created_at: 'invalid-date',
      }),
    ).toEqual({
      id: 'a-1',
      title: 'Title',
      message: 'Message',
      type: 'Unknown',
      status: 'Active',
      audienceType: 'All Residents',
      date: '',
    });
    expect(getAnnouncementTypeMeta('Unknown')).toEqual(
      getAnnouncementTypeMeta('General'),
    );
    expect(isAnnouncementAdmin('Resident')).toBe(false);
    expect(isAnnouncementAdmin('Admin')).toBe(true);
    expect(isAnnouncementAdmin('Staff')).toBe(true);
    expect(
      canCompleteAnnouncement({ type: 'Maintenance', status: 'Active' }),
    ).toBe(true);
    expect(
      canCompleteAnnouncement({ type: 'Maintenance', status: 'Completed' }),
    ).toBe(false);
    expect(canArchiveAnnouncement({ status: 'Archived' })).toBe(false);
    expect(canArchiveAnnouncement({ status: 'Completed' })).toBe(true);
    expect(getAnnouncementLifecycleMessage(1)).toBe(
      '1 affected resident received a notification.',
    );
    expect(getAnnouncementLifecycleMessage(2)).toBe(
      '2 affected residents received a notification.',
    );
    expect(getAnnouncementLifecycleMessage(0)).toBe(
      'The announcement lifecycle was updated.',
    );
  });

  test('resident sees compact previews that open the full announcement without administrative controls', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = getVisibleText(root);

    expect(fetchAnnouncements).toHaveBeenCalledWith({
      limit: 50,
      includeArchived: false,
    });
    expect(rendered).toContain('Announcements');
    expect(rendered).toContain('Community updates and notices');
    expect(rendered).toContain('Community update');
    expect(rendered).toContain('ရေစုပ်စက် ပြုပြင်ခြင်း');
    expect(rendered).toContain('ရေပြတ်တောက်မှု ခေတ္တရှိနိုင်ပါသည်။');
    expect(rendered).toContain('Resident gathering');
    expect(rendered).not.toContain('Mark all as read');
    expect(rendered).not.toContain('Unread');
    expect(rendered).toContain('View details');
    expect(
      root
        .findAll(node => node.props.children === announcements[1].message)
        .some(node => node.props.numberOfLines === 2),
    ).toBe(true);
    expect(
      root.findAll(
        node =>
          typeof node.props.accessibilityLabel === 'string' &&
          (node.props.accessibilityLabel.startsWith('Complete maintenance:') ||
            node.props.accessibilityLabel.startsWith('Archive announcement:')),
      ),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Open announcement: ရေစုပ်စက် ပြုပြင်ခြင်း',
      ).props.onPress();
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('AnnouncementDetail', {
      announcementId: 'maintenance-1',
      announcement: expect.objectContaining({
        id: 'maintenance-1',
        title: 'ရေစုပ်စက် ပြုပြင်ခြင်း',
        message: announcements[1].message,
        type: 'Maintenance',
        status: 'Active',
        audienceType: 'Block A Residents',
      }),
    });

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('Admin keeps lifecycle metadata and exact complete/archive API flows', async () => {
    mockUser = { id: 'admin-1', role: 'Admin' };
    const renderer = await renderScreen();
    const root = renderer.root;
    const rendered = getVisibleText(root);

    expect(fetchAnnouncements).toHaveBeenCalledWith({
      limit: 50,
      includeArchived: true,
    });
    expect(rendered).toContain('Block A Residents');
    expect(rendered).toContain('Archived');
    expect(
      findByAccessibilityLabel(
        root,
        'Complete maintenance: ရေစုပ်စက် ပြုပြင်ခြင်း',
      ),
    ).toBeTruthy();
    expect(
      root.findAll(
        node =>
          node.props.accessibilityLabel ===
          'Archive announcement: Resident gathering',
      ),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Complete maintenance: ရေစုပ်စက် ပြုပြင်ခြင်း',
      ).props.onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Complete maintenance?',
      'Residents affected by this maintenance will be notified and the notice will stop appearing in their active list.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Complete', style: 'default' }),
      ]),
    );

    await ReactTestRenderer.act(async () => {
      await getAlertButton('Complete maintenance?', 'Complete').onPress();
    });

    expect(completeMaintenanceAnnouncement).toHaveBeenCalledWith(
      'maintenance-1',
    );
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Maintenance completed',
      '1 affected resident received a notification.',
    );

    await ReactTestRenderer.act(async () => {
      findByAccessibilityLabel(
        root,
        'Archive announcement: Community update',
      ).props.onPress();
    });

    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Archive announcement?',
      'This removes the notice from resident lists while retaining its audit history.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Archive', style: 'destructive' }),
      ]),
    );

    await ReactTestRenderer.act(async () => {
      await getAlertButton('Archive announcement?', 'Archive').onPress();
    });

    expect(archiveAnnouncement).toHaveBeenCalledWith('general-1');
    expect(showPrimeAlert).toHaveBeenCalledWith(
      'Announcement archived',
      '2 affected residents received a notification.',
    );
    expect(fetchAnnouncements).toHaveBeenCalledTimes(3);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('preserves pull-to-refresh, retry and session-expired guards', async () => {
    const renderer = await renderScreen();
    const root = renderer.root;

    await ReactTestRenderer.act(async () => {
      await root.findByType(RefreshControl).props.onRefresh();
    });
    expect(fetchAnnouncements).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => renderer.unmount());

    jest.clearAllMocks();
    fetchAnnouncements
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(announcements);
    const failedRenderer = await renderScreen();
    const failedRoot = failedRenderer.root;
    expect(getVisibleText(failedRoot)).toContain('Network unavailable');

    await ReactTestRenderer.act(async () => {
      await findByAccessibilityLabel(
        failedRoot,
        'Retry loading announcements',
      ).props.onPress();
    });
    expect(fetchAnnouncements).toHaveBeenCalledTimes(2);
    expect(getVisibleText(failedRoot)).toContain('Community update');

    await ReactTestRenderer.act(async () => failedRenderer.unmount());

    jest.clearAllMocks();
    fetchAnnouncements.mockRejectedValue(
      Object.assign(new Error('Session expired'), { sessionExpired: true }),
    );
    const expiredRenderer = await renderScreen();
    expect(getVisibleText(expiredRenderer.root)).not.toContain(
      'Session expired',
    );

    await ReactTestRenderer.act(async () => expiredRenderer.unmount());
  });
});
