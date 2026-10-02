import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { getProfileTheme } from '../screens/profile/profileTheme';
import {
  APP_TABS,
  getTabBarMetrics,
  TAB_LAYOUT,
} from '../navigation/tabConfig';

export default function BottomNavBar({
  navigation,
  activeRoute,
  themeOverride,
  onTabPress,
  onTabLongPress,
}) {
  const { theme: appTheme } = useTheme();
  const theme = themeOverride || getProfileTheme(appTheme);
  const insets = useSafeAreaInsets();
  const metrics = getTabBarMetrics(insets.bottom, Platform.OS);
  const wrapperStyle = useMemo(
    () => ({
      height: metrics.height,
      paddingBottom: metrics.paddingBottom,
      paddingTop: metrics.paddingTop,
      backgroundColor: theme.tabBar,
      borderTopColor: theme.tabBarBorder,
    }),
    [metrics.height, metrics.paddingBottom, metrics.paddingTop, theme.tabBar, theme.tabBarBorder],
  );

  const goToTab = name => {
    if (onTabPress) {
      onTabPress(name);
      return;
    }
    navigation?.navigate('Tabs', { screen: name });
  };

  const longPressTab = name => onTabLongPress?.(name);

  return (
    <View style={[styles.wrapper, wrapperStyle]}>
      {APP_TABS.map(tab => {
        const focused = activeRoute === tab.name;

        if (tab.name === 'SOS') {
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.sosSlot}
              onPress={() => goToTab(tab.name)}
              onLongPress={() => longPressTab(tab.name)}
              activeOpacity={0.85}
              hitSlop={{ top: 4, bottom: 4, left: 3, right: 3 }}
              accessibilityRole="tab"
              accessibilityLabel={tab.accessibilityLabel}
              accessibilityHint="Opens emergency assistance"
              accessibilityState={{ selected: focused }}
            >
              <View style={[styles.sosFab, focused && styles.sosFabFocused]}>
                <Ionicons
                  name={focused ? tab.activeIcon : tab.inactiveIcon}
                  size={TAB_LAYOUT.sosIconSize}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => goToTab(tab.name)}
            onLongPress={() => longPressTab(tab.name)}
            activeOpacity={0.75}
            hitSlop={{ top: 4, bottom: 4, left: 3, right: 3 }}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: focused }}
          >
            <Ionicons
              name={focused ? tab.activeIcon : tab.inactiveIcon}
              size={TAB_LAYOUT.iconSize}
              color={focused ? theme.primary : theme.inactive}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.label,
                { color: focused ? theme.primary : theme.inactive },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    height: TAB_LAYOUT.contentHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    width: '100%',
    paddingHorizontal: 2,
    fontSize: TAB_LAYOUT.labelSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  sosSlot: {
    flex: 1,
    minWidth: 0,
    height: TAB_LAYOUT.contentHeight,
    alignItems: 'center',
    justifyContent: 'center',
    top: TAB_LAYOUT.sosOffset,
  },
  sosFab: {
    width: TAB_LAYOUT.sosSize,
    height: TAB_LAYOUT.sosSize,
    borderRadius: TAB_LAYOUT.sosSize / 2,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sosFabFocused: {
    transform: [{ scale: 1.05 }],
  },
});
