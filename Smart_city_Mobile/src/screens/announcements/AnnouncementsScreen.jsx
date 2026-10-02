import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  archiveAnnouncement,
  completeMaintenanceAnnouncement,
  fetchAnnouncements,
} from '../../api/announcements';
import { getNotificationTheme } from '../notifications/notificationTheme';

export const ANNOUNCEMENT_TYPE_META = Object.freeze({
  General: { icon: 'information-circle-outline', colorKey: 'primary' },
  Maintenance: { icon: 'construct-outline', colorKey: 'warning' },
  Event: { icon: 'calendar-outline', colorKey: 'danger' },
});

export function formatAnnouncementDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function mapAnnouncement(item) {
  return {
    id: item._id,
    title: item.title,
    message: item.message,
    type: item.type,
    status: item.status || 'Active',
    audienceType: item.audience_type || 'All Residents',
    date: formatAnnouncementDate(item.created_at),
  };
}

export function getAnnouncementTypeMeta(type) {
  return ANNOUNCEMENT_TYPE_META[type] || ANNOUNCEMENT_TYPE_META.General;
}

export function isAnnouncementAdmin(role) {
  return ['Admin', 'Staff'].includes(role);
}

export function canCompleteAnnouncement(item) {
  return item.type === 'Maintenance' && item.status === 'Active';
}

export function canArchiveAnnouncement(item) {
  return item.status !== 'Archived';
}

export function getAnnouncementLifecycleMessage(count) {
  return count
    ? `${count} affected resident${
        count === 1 ? '' : 's'
      } received a notification.`
    : 'The announcement lifecycle was updated.';
}

export function getAnnouncementStatusPresentation(status, theme) {
  if (status === 'Completed') {
    return {
      color: theme.success,
      backgroundColor: theme.successBg,
      icon: 'checkmark-circle-outline',
    };
  }
  if (status === 'Archived') {
    return {
      color: theme.inactive,
      backgroundColor: theme.elevated,
      icon: 'archive-outline',
    };
  }
  return {
    color: theme.primary,
    backgroundColor: theme.primaryBg,
    icon: 'radio-button-on-outline',
  };
}

export default function AnnouncementsScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const isAdmin = isAnnouncementAdmin(user?.role);

  const loadAnnouncements = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await fetchAnnouncements({
          limit: 50,
          includeArchived: isAdmin,
        });
        setItems(data.map(mapAnnouncement));
      } catch (err) {
        if (err.sessionExpired) return;
        setError(err.message || 'Failed to load announcements');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin],
  );

  const runAction = async (item, action) => {
    setActionId(item.id);
    setActionType(action);
    try {
      const response =
        action === 'complete'
          ? await completeMaintenanceAnnouncement(item.id)
          : await archiveAnnouncement(item.id);
      const count = Number(response.delivery?.recipientCount || 0);
      showPrimeAlert(
        action === 'complete'
          ? 'Maintenance completed'
          : 'Announcement archived',
        getAnnouncementLifecycleMessage(count),
      );
      await loadAnnouncements(true);
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert('Unable to update', err.message || 'Please try again.');
      }
    } finally {
      setActionId(null);
      setActionType(null);
    }
  };

  const confirmAction = (item, action) => {
    const completing = action === 'complete';
    showPrimeAlert(
      completing ? 'Complete maintenance?' : 'Archive announcement?',
      completing
        ? 'Residents affected by this maintenance will be notified and the notice will stop appearing in their active list.'
        : 'This removes the notice from resident lists while retaining its audit history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: completing ? 'Complete' : 'Archive',
          style: completing ? 'default' : 'destructive',
          onPress: () => runAction(item, action),
        },
      ],
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements]),
  );

  const renderItem = ({ item }) => {
    const meta = getAnnouncementTypeMeta(item.type);
    const accentColor = theme[meta.colorKey];
    const statusMeta = getAnnouncementStatusPresentation(item.status, theme);
    const itemBusy = actionId === item.id;
    const showComplete = isAdmin && canCompleteAnnouncement(item);
    const showArchive = isAdmin && canArchiveAnnouncement(item);

    return (
      <View
        style={[
          styles.announcementCard,
          { borderLeftColor: accentColor },
          item.status === 'Archived' && styles.archivedCard,
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Open announcement: ${item.title}`}
          accessibilityHint="Opens the full announcement"
          activeOpacity={0.82}
          onPress={() =>
            navigation.navigate('AnnouncementDetail', {
              announcementId: item.id,
              announcement: item,
            })
          }
        >
          <View style={styles.cardTop}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: accentColor + '18',
                  borderColor: accentColor + '55',
                },
              ]}
            >
              <Ionicons name={meta.icon} size={23} color={accentColor} />
            </View>

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.cardTitle, { color: theme.text }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.title}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    {
                      backgroundColor: accentColor + '18',
                      borderColor: accentColor + '55',
                    },
                  ]}
                >
                  <Text
                    style={[styles.typeText, { color: accentColor }]}
                    numberOfLines={1}
                  >
                    {item.type || 'General'}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.cardText, { color: theme.subtext }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.message}
              </Text>

              <View style={styles.previewFooter}>
                <View style={styles.dateRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={theme.inactive}
                  />
                  <Text style={[styles.date, { color: theme.inactive }]}>
                    {item.date}
                  </Text>
                </View>
                <View style={styles.detailLink}>
                  <Text style={[styles.detailText, { color: theme.primary }]}>
                    View details
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={theme.icon}
                  />
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {isAdmin ? (
          <View style={[styles.adminMeta, { borderTopColor: theme.border }]}>
            <View style={styles.lifecycleRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusMeta.backgroundColor },
                ]}
              >
                <Ionicons
                  name={statusMeta.icon}
                  size={14}
                  color={statusMeta.color}
                />
                <Text
                  style={[styles.lifecycleText, { color: statusMeta.color }]}
                >
                  {item.status}
                </Text>
              </View>
              <View style={styles.audienceRow}>
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={theme.subtext}
                />
                <Text style={[styles.audienceText, { color: theme.subtext }]}>
                  {item.audienceType}
                </Text>
              </View>
            </View>

            {showComplete || showArchive ? (
              <View style={styles.actionRow}>
                {showComplete ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Complete maintenance: ${item.title}`}
                    accessibilityState={{
                      disabled: itemBusy,
                      busy: itemBusy && actionType === 'complete',
                    }}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.successBg,
                        borderColor: theme.success,
                      },
                      itemBusy && styles.disabled,
                    ]}
                    onPress={() => confirmAction(item, 'complete')}
                    disabled={itemBusy}
                    activeOpacity={0.78}
                  >
                    {itemBusy && actionType === 'complete' ? (
                      <ActivityIndicator size="small" color={theme.success} />
                    ) : (
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={17}
                        color={theme.success}
                      />
                    )}
                    <Text style={[styles.actionText, { color: theme.success }]}>
                      Complete
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {showArchive ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Archive announcement: ${item.title}`}
                    accessibilityState={{
                      disabled: itemBusy,
                      busy: itemBusy && actionType === 'archive',
                    }}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.dangerBg,
                        borderColor: theme.danger,
                      },
                      itemBusy && styles.disabled,
                    ]}
                    onPress={() => confirmAction(item, 'archive')}
                    disabled={itemBusy}
                    activeOpacity={0.78}
                  >
                    {itemBusy && actionType === 'archive' ? (
                      <ActivityIndicator size="small" color={theme.danger} />
                    ) : (
                      <Ionicons
                        name="archive-outline"
                        size={17}
                        color={theme.danger}
                      />
                    )}
                    <Text style={[styles.actionText, { color: theme.danger }]}>
                      Archive
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenContainer navigation={navigation} themeOverride={theme}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAnnouncements(true)}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="megaphone-outline"
                size={25}
                color={theme.primary}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text
                accessibilityRole="header"
                style={[styles.heading, { color: theme.text }]}
              >
                Announcements
              </Text>
              <Text style={[styles.sub, { color: theme.subtext }]}>
                Community updates and notices
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View
              style={styles.centered}
              accessibilityRole="progressbar"
              accessibilityLabel="Loading announcements"
            >
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.stateText, { color: theme.subtext }]}>
                Loading announcements…
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <View
                style={[styles.stateIcon, { backgroundColor: theme.dangerBg }]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={34}
                  color={theme.danger}
                />
              </View>
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {error}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry loading announcements"
                style={[styles.retryBtn, { backgroundColor: theme.primary }]}
                onPress={() => loadAnnouncements()}
              >
                <Text style={[styles.retryText, { color: theme.primaryText }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centered}>
              <View
                style={[styles.stateIcon, { backgroundColor: theme.elevated }]}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={34}
                  color={theme.inactive}
                />
              </View>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                No announcements yet
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
      paddingBottom: 116,
      flexGrow: 1,
    },
    header: {
      minHeight: 88,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
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
    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    heading: {
      fontSize: 25,
      lineHeight: 31,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    sub: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600',
    },
    announcementCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderLeftWidth: 3,
      borderRadius: 20,
      padding: 15,
      marginBottom: 13,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 4,
    },
    archivedCard: {
      backgroundColor: theme.elevated,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconWrap: {
      width: 48,
      height: 48,
      flexShrink: 0,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardContent: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    cardTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
      lineHeight: 23,
      fontWeight: '900',
    },
    typeBadge: {
      maxWidth: '42%',
      flexShrink: 1,
      minHeight: 28,
      justifyContent: 'center',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
      borderWidth: 1,
    },
    typeText: {
      flexShrink: 1,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
      textAlign: 'center',
    },
    cardText: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 21,
      flexShrink: 1,
    },
    previewFooter: {
      minHeight: 22,
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    dateRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    date: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    detailLink: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    detailText: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
    },
    adminMeta: {
      marginTop: 15,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 12,
    },
    lifecycleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 9,
    },
    statusBadge: {
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 9,
    },
    lifecycleText: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
    },
    audienceRow: {
      flex: 1,
      minWidth: 120,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    audienceText: {
      flex: 1,
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
    },
    actionButton: {
      minWidth: 118,
      minHeight: 46,
      flexGrow: 1,
      flexBasis: '44%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    actionText: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
    },
    disabled: {
      opacity: 0.58,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 52,
      paddingHorizontal: 20,
      gap: 12,
    },
    stateIcon: {
      width: 68,
      height: 68,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateText: {
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    emptyText: {
      maxWidth: 310,
      fontSize: 15,
      lineHeight: 23,
      textAlign: 'center',
    },
    retryBtn: {
      minHeight: 46,
      minWidth: 108,
      marginTop: 4,
      paddingHorizontal: 18,
      paddingVertical: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
    },
    retryText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
    },
  });
