import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { AppText as Text } from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

const DEFAULT_BRAND_IMAGE = require('../assets/app-icon-master.png');

export default function TopBar({
  navigation,
  variant = 'main',
  title,
  themeOverride,
  onBackPress,
  brandImageSource = DEFAULT_BRAND_IMAGE,
  brandLabel = 'Prime City',
}) {
  const { theme: appTheme } = useTheme();
  const theme = themeOverride || appTheme;
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const isStack = variant === 'stack';
  const resolvedBrandImage = brandImageSource || DEFAULT_BRAND_IMAGE;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top,
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <View style={[styles.row, !isStack && styles.brandedRow]}>
        {isStack ? (
          <TouchableOpacity
            style={[
              styles.backBtn,
              themeOverride && styles.billBackBtn,
              themeOverride && {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => (onBackPress ? onBackPress() : navigation?.goBack())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brand}>
            <View
              style={[
                styles.logoImageFrame,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.primary,
                },
              ]}
            >
              <Image
                source={resolvedBrandImage}
                style={styles.logoImage}
                resizeMode="contain"
                accessible
                accessibilityLabel={`${brandLabel} logo`}
                accessibilityIgnoresInvertColors
              />
            </View>
            <Text
              style={[
                styles.logo,
                styles.brandedLogo,
                { color: theme.text },
              ]}
            >
              {brandLabel}
            </Text>
          </View>
        )}

        {isStack && (
          <Text
            style={[styles.stackTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}

        <View style={styles.actions}>
          {!isStack && (
            <>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                  themeOverride && styles.billControlBorder,
                ]}
                onPress={() => navigation?.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.icon}
                />
                {unreadCount > 0 ? (
                  <View
                    style={[styles.badge, { backgroundColor: theme.danger }]}
                  >
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                  themeOverride && styles.billControlBorder,
                ]}
                onPress={() => navigation?.navigate('PreRegister')}
                accessibilityRole="button"
                accessibilityLabel="Pre-register a visitor"
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={theme.icon}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  row: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandedRow: { height: 68, paddingHorizontal: 18 },
  brand: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImageFrame: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: 43, height: 43 },
  logo: {
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  brandedLogo: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  backBtn: {
    marginRight: 4,
  },
  billBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billControlBorder: {
    borderWidth: 1,
  },
  stackTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
