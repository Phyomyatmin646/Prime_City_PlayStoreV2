import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ThemeProvider, { useTheme } from './src/context/ThemeContext';
import AuthProvider, { useAuth } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import { NotificationProvider } from './src/context/NotificationContext';
import FloatingChat from './src/components/FloatingChat';
import PrimeAlertProvider from './src/components/PrimeAlertProvider';
import {
  cleanupPushNotifications,
  registerForPushNotifications,
  setupForegroundNotificationHandler,
} from './src/services/pushNotifications';

function AppContent() {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || user?._id || null;

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    registerForPushNotifications();
    setupForegroundNotificationHandler();
    return cleanupPushNotifications;
  }, [isAuthenticated]);

  return (
    <ChatProvider userId={userId}>
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor={theme.background}
      />
      <AppNavigator />
      {isAuthenticated && <FloatingChat />}
    </ChatProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <PrimeAlertProvider>
            <AuthProvider>
              <NotificationProvider>
                <AppContent />
              </NotificationProvider>
            </AuthProvider>
          </PrimeAlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
