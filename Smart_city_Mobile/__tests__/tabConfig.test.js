import {
  APP_TABS,
  getParentTabForRoute,
  getTabBarMetrics,
} from '../src/navigation/tabConfig';

describe('shared bottom-tab configuration', () => {
  it('preserves the five approved destinations and order', () => {
    expect(APP_TABS.map(tab => tab.name)).toEqual([
      'Home',
      'Bills',
      'SOS',
      'Announcements',
      'Profile',
    ]);
    expect(APP_TABS.find(tab => tab.name === 'SOS')).toEqual(
      expect.objectContaining({
        accessibilityLabel: 'Emergency SOS',
        activeIcon: 'warning',
        inactiveIcon: 'warning-outline',
      }),
    );
  });

  it('maps stack flows to their established parent tab', () => {
    expect(getParentTabForRoute('ProfileSettings')).toBe('Profile');
    expect(getParentTabForRoute('BillPayment')).toBe('Bills');
    expect(getParentTabForRoute('AdminPaymentReview')).toBe('Bills');
    expect(getParentTabForRoute('HelperRequest')).toBe('Home');
    expect(getParentTabForRoute('Notifications')).toBeNull();
    expect(getParentTabForRoute('AnnouncementDetail')).toBe('Announcements');
  });

  it('uses identical safe-area metrics for native and custom bars', () => {
    expect(getTabBarMetrics(34, 'ios')).toEqual({
      height: 92,
      paddingBottom: 34,
      paddingTop: 8,
    });
    expect(getTabBarMetrics(0, 'android')).toEqual({
      height: 68,
      paddingBottom: 10,
      paddingTop: 8,
    });
  });
});
