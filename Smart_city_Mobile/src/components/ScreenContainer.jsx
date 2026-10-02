import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import TopBar from './TopBar';
import BottomNavBar from './BottomNavBar';
import { getParentTabForRoute } from '../navigation/tabConfig';

export default function ScreenContainer({
  navigation,
  children,
  showTopBar = true,
  topBarVariant = 'main',
  title,
  showBottomNav = false,
  activeRoute,
  themeOverride,
  onBackPress,
  topBarBrandImage,
  topBarBrandLabel,
}) {
  const { theme: appTheme } = useTheme();
  const theme = themeOverride || appTheme;
  const navigationState = navigation?.getState?.();
  const currentRouteName =
    navigationState?.routes?.[navigationState.index]?.name || null;
  const resolvedActiveRoute =
    activeRoute === undefined
      ? getParentTabForRoute(currentRouteName)
      : activeRoute;
  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      {showTopBar && (
        <TopBar
          navigation={navigation}
          variant={topBarVariant}
          title={title}
          themeOverride={themeOverride}
          onBackPress={onBackPress}
          brandImageSource={topBarBrandImage}
          brandLabel={topBarBrandLabel}
        />
      )}
      <View style={styles.content}>{children}</View>
      {showBottomNav && (
        <BottomNavBar
          navigation={navigation}
          activeRoute={resolvedActiveRoute}
          themeOverride={themeOverride}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
