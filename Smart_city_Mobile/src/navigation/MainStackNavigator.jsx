import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabNavigator from './BottomTabNavigator';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import NotificationDetailScreen from '../screens/notifications/NotificationDetailScreen';
import AnnouncementDetailScreen from '../screens/announcements/AnnouncementDetailScreen';
import PreRegisterVisitorScreen from '../screens/visitors/PreRegisterVisitorScreen';
import VisitorPassScreen from '../screens/visitors/VisitorPassScreen';
import HelperRequestScreen from '../screens/helpers/HelperRequestScreen';
import HelperListScreen from '../screens/helpers/HelperListScreen';
import AdminNotificationScreen from '../screens/admin/AdminNotificationScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminAiReviewScreen from '../screens/admin/AdminAiReviewScreen';
import ReportIssueScreen from '../screens/reports/ReportIssueScreen';
import ResidentActivityHistoryScreen from '../screens/history/ResidentActivityHistoryScreen';
import ProfileSettingsScreen from '../screens/profile/ProfileSettingsScreen';
import BillPaymentScreen from '../screens/bills/BillPaymentScreen';
import CreateMonthlyBillScreen from '../screens/bills/CreateMonthlyBillScreen';
import AdminPaymentReviewScreen from '../screens/bills/AdminPaymentReviewScreen';
import ParkingScreen from '../screens/parking/ParkingScreen';
import RfidCardScreen from '../screens/rfid/RfidCardScreen';
import PlaygroundScreen from '../screens/playground/PlaygroundScreen';

const Stack = createNativeStackNavigator();

export default function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
      />
      <Stack.Screen
        name="AnnouncementDetail"
        component={AnnouncementDetailScreen}
      />
      <Stack.Screen name="PreRegister" component={PreRegisterVisitorScreen} />
      <Stack.Screen name="VisitorPass" component={VisitorPassScreen} />
      <Stack.Screen name="Helpers" component={HelperListScreen} />
      <Stack.Screen name="HelperRequest" component={HelperRequestScreen} />
      <Stack.Screen
        name="AdminNotifications"
        component={AdminNotificationScreen}
      />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminAiReview" component={AdminAiReviewScreen} />
      <Stack.Screen name="ReportIssue" component={ReportIssueScreen} />
      <Stack.Screen
        name="ActivityHistory"
        component={ResidentActivityHistoryScreen}
      />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="BillPayment" component={BillPaymentScreen} />
      <Stack.Screen
        name="CreateMonthlyBill"
        component={CreateMonthlyBillScreen}
      />
      <Stack.Screen
        name="AdminPaymentReview"
        component={AdminPaymentReviewScreen}
      />
      <Stack.Screen name="Parking" component={ParkingScreen} />
      <Stack.Screen name="RfidCard" component={RfidCardScreen} />
      <Stack.Screen name="Playground" component={PlaygroundScreen} />
    </Stack.Navigator>
  );
}
