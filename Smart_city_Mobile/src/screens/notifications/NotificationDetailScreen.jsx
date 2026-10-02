import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { submitNotification } from '../../api/notifications';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';
import {
  containsMyanmarText,
  getMyanmarTextStyle,
} from '../../theme/typography';
import { getNotificationTheme } from './notificationTheme';
import {
  notificationAccent,
  NOTIFICATION_TYPE_ICONS,
} from './notificationPresentation';

export default function NotificationDetailScreen({ navigation, route }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const { markOneRead, refreshUnreadCount } = useNotifications();
  const notificationId = route.params?.notificationId;
  const [notification, setNotification] = useState(
    route.params?.notification || null,
  );
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const markingReadRef = useRef(false);

  useEffect(() => {
    if (
      !notificationId ||
      !notification ||
      notification.is_read ||
      markingReadRef.current
    ) {
      return;
    }

    markingReadRef.current = true;
    setNotification(current =>
      current ? { ...current, is_read: true } : current,
    );

    markOneRead(notificationId)
      .catch(async err => {
        if (!err.sessionExpired) {
          showPrimeAlert(
            'Unable to mark notification as read',
            err.message || 'The notification will be updated on refresh.',
          );
        }
        await refreshUnreadCount();
      })
      .finally(() => {
        markingReadRef.current = false;
      });
  }, [markOneRead, notification, notificationId, refreshUnreadCount]);

  const onSubmit = async () => {
    if (!notification?.id || submitting) return;

    setSubmitting(true);
    try {
      await submitNotification(notification.id, {
        message: replyText || '',
      });
      setNotification(current =>
        current
          ? { ...current, action_status: 'Submitted', is_read: true }
          : current,
      );
      await refreshUnreadCount();
      showPrimeAlert('Submitted', 'The resident has been notified.');
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert('Unable to submit', err.message || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!notificationId || !notification) {
    return (
      <ScreenContainer
        navigation={navigation}
        topBarVariant="stack"
        title="Notification Details"
        themeOverride={theme}
      >
        <View style={styles.unavailable}>
          <View style={styles.unavailableIcon}>
            <Ionicons
              name="notifications-off-outline"
              size={34}
              color={theme.inactive}
            />
          </View>
          <Text style={[styles.unavailableTitle, { color: theme.text }]}>
            Notification unavailable
          </Text>
          <Text style={[styles.unavailableText, { color: theme.subtext }]}>
            This notification could not be opened. Return to the notification
            list and try again.
          </Text>
          <TouchableOpacity
            style={[styles.backAction, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={[styles.backActionText, { color: theme.primaryText }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const source = notification.data?.source;
  const roomName = source?.room_name || notification.data?.room_name;
  const residentName =
    source?.resident_name || notification.data?.resident_name;
  const accentColor = notificationAccent(notification.type, theme);
  const sourceRows = [
    [
      'Room',
      roomName
        ? `${roomName}${residentName ? ` · ${residentName}` : ''}`
        : null,
    ],
    ['Request', source?.request_type],
    ['Report', source?.report_type],
    ['Location', source?.location],
    ['Preferred', source?.preferred_gender],
    ['Helper', source?.helper_name],
    ['Phone', source?.resident_phone],
    ['Status', source?.status],
  ].filter(([, value]) => Boolean(value));
  const sourceMessage = source?.note || source?.details;
  const canSubmit =
    ['Admin', 'Staff'].includes(user?.role) &&
    source &&
    ['helper_request', 'resident_report', 'sos', 'emergency'].includes(
      source.kind || notification.type?.toLowerCase(),
    );
  const submitted = notification.action_status === 'Submitted';

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Notification Details"
      themeOverride={theme}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Card
          themeOverride={theme}
          style={[
            styles.detailCard,
            { borderColor: notification.is_read ? theme.border : accentColor },
          ]}
        >
          <View style={styles.identityRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: accentColor + '18',
                  borderColor: accentColor + '55',
                },
              ]}
            >
              <Ionicons
                name={
                  NOTIFICATION_TYPE_ICONS[notification.type] ||
                  NOTIFICATION_TYPE_ICONS.General
                }
                size={28}
                color={accentColor}
              />
            </View>
            <View style={styles.identityCopy}>
              <Text
                style={[
                  styles.type,
                  containsMyanmarText(notification.type) && styles.myanmarType,
                  getMyanmarTextStyle(notification.type, 'bold'),
                  { color: accentColor },
                ]}
              >
                {notification.type}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: notification.is_read
                      ? theme.input
                      : theme.primaryBg,
                  },
                ]}
              >
                <Ionicons
                  name={notification.is_read ? 'mail-open-outline' : 'mail'}
                  size={13}
                  color={notification.is_read ? theme.subtext : accentColor}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: notification.is_read ? theme.subtext : accentColor,
                    },
                  ]}
                >
                  {notification.is_read ? 'Read' : 'Unread'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text
            style={[
              styles.title,
              containsMyanmarText(notification.title) && styles.myanmarTitle,
              getMyanmarTextStyle(notification.title, 'bold'),
              { color: theme.text },
            ]}
          >
            {notification.title}
          </Text>
          <Text
            style={[
              styles.body,
              containsMyanmarText(notification.body) && styles.myanmarBody,
              getMyanmarTextStyle(notification.body),
              { color: theme.subtext },
            ]}
          >
            {notification.body}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={15} color={theme.inactive} />
            <Text style={[styles.time, { color: theme.inactive }]}>
              {notification.time}
            </Text>
          </View>
        </Card>

        {sourceRows.length || sourceMessage ? (
          <Card style={styles.supportingCard} themeOverride={theme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Details
            </Text>
            {sourceRows.map(([label, value]) => (
              <View
                key={label}
                style={[styles.detailRow, { borderBottomColor: theme.border }]}
              >
                <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                  {label}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    containsMyanmarText(value) && styles.myanmarDetailValue,
                    getMyanmarTextStyle(value, 'bold'),
                    { color: theme.text },
                  ]}
                >
                  {value}
                </Text>
              </View>
            ))}
            {sourceMessage ? (
              <Text
                style={[
                  styles.sourceMessage,
                  containsMyanmarText(sourceMessage) &&
                    styles.myanmarSourceMessage,
                  getMyanmarTextStyle(sourceMessage),
                  { color: theme.subtext },
                ]}
              >
                {sourceMessage}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {canSubmit ? (
          <Card style={styles.supportingCard} themeOverride={theme}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Resident response
            </Text>
            {!submitted ? (
              <TextInput
                style={[
                  styles.input,
                  containsMyanmarText(replyText) && styles.myanmarInput,
                  getMyanmarTextStyle(replyText),
                  {
                    color: theme.text,
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter note or reply to resident"
                placeholderTextColor={theme.inactive}
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
            ) : null}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: submitted ? theme.successBg : theme.primary,
                },
              ]}
              disabled={submitted || submitting}
              onPress={onSubmit}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <Ionicons
                  name={submitted ? 'checkmark-done-outline' : 'send-outline'}
                  size={18}
                  color={submitted ? theme.success : theme.primaryText}
                />
              )}
              <Text
                style={[
                  styles.submitText,
                  { color: submitted ? theme.success : theme.primaryText },
                ]}
              >
                {submitted ? 'Submitted' : 'Submit & notify resident'}
              </Text>
            </TouchableOpacity>
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 46,
      gap: 14,
    },
    detailCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 21,
      padding: 19,
      marginBottom: 0,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 5,
    },
    supportingCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 19,
      padding: 18,
      marginBottom: 0,
    },
    identityRow: { flexDirection: 'row', alignItems: 'center' },
    iconWrap: {
      width: 58,
      height: 58,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    identityCopy: { flex: 1, alignItems: 'flex-start' },
    type: {
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 7,
    },
    myanmarType: { lineHeight: 22 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    statusText: { fontSize: 11, fontWeight: '800' },
    divider: { height: 1, marginVertical: 18 },
    title: {
      fontSize: 25,
      lineHeight: 32,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    myanmarTitle: { lineHeight: 40 },
    body: { fontSize: 16, lineHeight: 25, marginTop: 12 },
    myanmarBody: { lineHeight: 30 },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 17,
    },
    time: { fontSize: 12, fontWeight: '600' },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 14,
      borderBottomWidth: 1,
      paddingVertical: 11,
    },
    detailLabel: { flex: 0.36, fontSize: 12, lineHeight: 18 },
    detailValue: {
      flex: 0.64,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      textAlign: 'right',
    },
    myanmarDetailValue: { lineHeight: 24 },
    sourceMessage: { fontSize: 13, lineHeight: 20, marginTop: 14 },
    myanmarSourceMessage: { lineHeight: 24 },
    input: {
      minHeight: 96,
      borderWidth: 1,
      borderRadius: 13,
      padding: 13,
      fontSize: 14,
      lineHeight: 20,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    myanmarInput: { lineHeight: 26 },
    submitButton: {
      minHeight: 50,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
    },
    submitText: { fontSize: 14, fontWeight: '900' },
    unavailable: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    unavailableIcon: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    unavailableTitle: { fontSize: 21, fontWeight: '900', marginBottom: 8 },
    unavailableText: {
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      marginBottom: 20,
    },
    backAction: {
      minHeight: 48,
      borderRadius: 13,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    backActionText: { fontSize: 14, fontWeight: '900' },
  });
