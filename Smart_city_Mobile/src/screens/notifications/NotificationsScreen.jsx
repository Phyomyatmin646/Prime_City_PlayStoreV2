import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useNotifications } from '../../context/NotificationContext';
import { fetchNotifications } from '../../api/notifications';
import { useTheme } from '../../context/ThemeContext';
import {
  containsMyanmarText,
  getMyanmarTextStyle,
} from '../../theme/typography';
import { getNotificationTheme } from './notificationTheme';
import {
  mapNotification,
  notificationAccent,
  NOTIFICATION_TYPE_ICONS,
} from './notificationPresentation';

export default function NotificationsScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { markAllRead, markOneRead, refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lastOpenRef = useRef({ id: null, at: 0 });
  const unreadCount = items.filter(item => !item.is_read).length;

  const loadNotifications = useCallback(
    async (mode = 'initial') => {
      const isRefresh = mode === true || mode === 'refresh';
      const isSilent = mode === 'silent';

      if (isRefresh) setRefreshing(true);
      else if (!isSilent) setLoading(true);
      if (!isSilent) setError(null);

      try {
        const data = await fetchNotifications({ limit: 100 });
        setItems(data.map(mapNotification));
        await refreshUnreadCount();
      } catch (err) {
        if (err.sessionExpired) return;
        if (!isSilent) setError(err.message || 'Failed to load notifications');
      } finally {
        if (!isSilent) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [refreshUnreadCount],
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      const timer = setInterval(() => loadNotifications('silent'), 30000);
      return () => clearInterval(timer);
    }, [loadNotifications]),
  );

  const onMarkAllRead = async () => {
    try {
      await markAllRead();
      setItems(current => current.map(item => ({ ...item, is_read: true })));
    } catch (err) {
      if (!err.sessionExpired)
        setError(err.message || 'Unable to update notifications');
    }
  };

  const onOpenNotification = async item => {
    const now = Date.now();
    if (
      lastOpenRef.current.id === item.id &&
      now - lastOpenRef.current.at < 750
    ) {
      return;
    }
    lastOpenRef.current = { id: item.id, at: now };

    const openedNotification = item.is_read ? item : { ...item, is_read: true };

    if (!item.is_read) {
      setItems(current =>
        current.map(entry =>
          entry.id === item.id ? { ...entry, is_read: true } : entry,
        ),
      );
    }

    navigation.navigate('NotificationDetail', {
      notificationId: item.id,
      notification: openedNotification,
    });

    if (!item.is_read) {
      try {
        await markOneRead(item.id);
      } catch (err) {
        if (!err.sessionExpired) {
          setError(err.message || 'Unable to mark notification as read');
        }
        await refreshUnreadCount();
      }
    }
  };

  const renderItem = ({ item }) => {
    const accentColor = notificationAccent(item.type, theme);
    const source = item.data?.source;
    const roomName = source?.room_name || item.data?.room_name;
    const residentName = source?.resident_name || item.data?.resident_name;
    const sourceText = roomName
      ? `Room ${roomName}${residentName ? ` · ${residentName}` : ''}`
      : null;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onOpenNotification(item)}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint="Opens notification details"
      >
        <Card
          themeOverride={theme}
          style={[
            styles.notificationCard,
            !item.is_read && styles.unreadCard,
            !item.is_read && { borderColor: accentColor },
          ]}
        >
          <View style={styles.row}>
            <View
              style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}
            >
              <Ionicons
                name={
                  NOTIFICATION_TYPE_ICONS[item.type] ||
                  NOTIFICATION_TYPE_ICONS.General
                }
                size={24}
                color={accentColor}
              />
            </View>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.title,
                    containsMyanmarText(item.title) && styles.myanmarTitle,
                    getMyanmarTextStyle(item.title, 'bold'),
                    { color: theme.text },
                  ]}
                >
                  {item.title}
                </Text>
                {!item.is_read && (
                  <View
                    style={[styles.unreadDot, { backgroundColor: accentColor }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.body,
                  containsMyanmarText(item.body) && styles.myanmarBody,
                  getMyanmarTextStyle(item.body),
                  { color: theme.subtext },
                ]}
              >
                {item.body}
              </Text>
              {sourceText ? (
                <View style={styles.sourceLine}>
                  <Ionicons name="home-outline" size={13} color={accentColor} />
                  <Text
                    style={[
                      styles.sourceText,
                      containsMyanmarText(sourceText) &&
                        styles.myanmarSourceText,
                      getMyanmarTextStyle(sourceText, 'bold'),
                      { color: accentColor },
                    ]}
                  >
                    {sourceText}
                  </Text>
                </View>
              ) : null}
              <View style={styles.footerRow}>
                <Text style={[styles.time, { color: theme.inactive }]}>
                  {item.time}
                </Text>
                <View style={styles.detailLink}>
                  {source ? (
                    <Text
                      style={[styles.detailsHint, { color: theme.primary }]}
                    >
                      View details
                    </Text>
                  ) : null}
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.icon}
                  />
                </View>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Notifications"
      showBottomNav
      themeOverride={theme}
    >
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={[styles.heading, { color: theme.text }]}>Inbox</Text>
              <Text style={[styles.sub, { color: theme.subtext }]}>
                {unreadCount ? `${unreadCount} unread` : 'All caught up'}
              </Text>
            </View>
            {unreadCount > 0 ? (
              <TouchableOpacity
                style={[styles.markBtn, { borderColor: theme.goldBorder }]}
                onPress={onMarkAllRead}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={16}
                  color={theme.primary}
                />
                <Text style={[styles.markText, { color: theme.primary }]}>
                  Mark all
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <Ionicons
                name="alert-circle-outline"
                size={36}
                color={theme.danger}
              />
              <Text
                style={[
                  styles.emptyText,
                  containsMyanmarText(error) && styles.myanmarEmptyText,
                  getMyanmarTextStyle(error),
                  { color: theme.text },
                ]}
              >
                {error}
              </Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: theme.primary }]}
                onPress={() => loadNotifications()}
              >
                <Text style={[styles.retryText, { color: theme.primaryText }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons
                name="notifications-outline"
                size={36}
                color={theme.inactive}
              />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                No notifications yet
              </Text>
            </View>
          )
        }
        renderItem={renderItem}
      />
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 36,
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 19,
      padding: 17,
      marginBottom: 18,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.26,
      shadowRadius: 14,
      elevation: 4,
    },
    heading: {
      fontSize: 25,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: 5,
    },
    sub: { fontSize: 14, fontWeight: '600' },
    markBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 12,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    markText: { fontSize: 13, fontWeight: '900' },
    notificationCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 17,
      marginBottom: 13,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 4,
    },
    unreadCard: { borderLeftWidth: 3 },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    content: { flex: 1 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 5,
    },
    title: { fontSize: 16, fontWeight: '900', lineHeight: 21, flex: 1 },
    myanmarTitle: { lineHeight: 29 },
    unreadDot: { width: 9, height: 9, borderRadius: 5 },
    body: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
    myanmarBody: { lineHeight: 26 },
    sourceLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginBottom: 8,
    },
    sourceText: { flex: 1, fontSize: 12, fontWeight: '800' },
    myanmarSourceText: { lineHeight: 22 },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 22,
    },
    detailLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    detailsHint: { fontSize: 11, fontWeight: '800' },
    time: { fontSize: 12, fontWeight: '600' },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 52,
      gap: 12,
    },
    emptyText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
    myanmarEmptyText: { lineHeight: 27 },
    retryBtn: {
      marginTop: 4,
      paddingHorizontal: 18,
      minHeight: 44,
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 12,
    },
    retryText: { fontSize: 14, fontWeight: '800' },
  });
