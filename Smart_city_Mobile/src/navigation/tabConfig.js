export const APP_TABS = Object.freeze([
  {
    name: 'Home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    name: 'Bills',
    label: 'Bills',
    activeIcon: 'receipt',
    inactiveIcon: 'receipt-outline',
  },
  {
    name: 'SOS',
    label: '',
    accessibilityLabel: 'Emergency SOS',
    activeIcon: 'warning',
    inactiveIcon: 'warning-outline',
    isFloatingAction: true,
  },
  {
    name: 'Announcements',
    label: 'Announcements',
    activeIcon: 'megaphone',
    inactiveIcon: 'megaphone-outline',
  },
  {
    name: 'Profile',
    label: 'Profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
]);

export const TAB_LAYOUT = Object.freeze({
  contentHeight: 50,
  paddingTop: 8,
  iosMinimumBottomInset: 18,
  androidMinimumBottomInset: 10,
  iconSize: 22,
  labelSize: 10,
  sosSize: 58,
  sosIconSize: 28,
  sosOffset: 0,
});

export const STACK_PARENT_TABS = Object.freeze({
  ProfileSettings: 'Profile',
  HelperRequest: 'Home',
  Helpers: 'Home',
  PreRegister: 'Home',
  VisitorPass: 'Home',
  ReportIssue: 'Home',
  ActivityHistory: 'Home',
  AdminNotifications: 'Home',
  AdminReports: 'Home',
  AdminAiReview: 'Home',
  Parking: 'Home',
  RfidCard: 'Home',
  Playground: 'Home',
  BillPayment: 'Bills',
  CreateMonthlyBill: 'Bills',
  AdminPaymentReview: 'Bills',
  Notifications: null,
  NotificationDetail: null,
  AnnouncementDetail: 'Announcements',
});

export function getTabDefinition(name) {
  return APP_TABS.find(tab => tab.name === name);
}

export function getParentTabForRoute(routeName) {
  if (APP_TABS.some(tab => tab.name === routeName)) return routeName;
  if (Object.prototype.hasOwnProperty.call(STACK_PARENT_TABS, routeName)) {
    return STACK_PARENT_TABS[routeName];
  }
  return null;
}

export function getTabBarMetrics(bottomInset = 0, platform = 'ios') {
  const minimumBottomInset =
    platform === 'ios'
      ? TAB_LAYOUT.iosMinimumBottomInset
      : TAB_LAYOUT.androidMinimumBottomInset;
  const paddingBottom = Math.max(bottomInset, minimumBottomInset);

  return {
    height: TAB_LAYOUT.paddingTop + TAB_LAYOUT.contentHeight + paddingBottom,
    paddingBottom,
    paddingTop: TAB_LAYOUT.paddingTop,
  };
}
