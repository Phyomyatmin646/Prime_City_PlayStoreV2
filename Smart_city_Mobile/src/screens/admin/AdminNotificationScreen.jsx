import React, { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import {
  buildNotificationRecipientPayload,
  fetchResidentsForNotifications,
  sendAdminNotification,
} from '../../api/adminNotifications';
import { useTheme } from '../../context/ThemeContext';
import { getNotificationTheme } from '../notifications/notificationTheme';

const TARGETS = [
  { id: 'all', label: 'All residents', icon: 'people-outline' },
  { id: 'selected', label: 'Select residents', icon: 'people-circle-outline' },
];

const NOTIFICATION_TYPES = ['General', 'Announcement', 'Emergency'];

export default function AdminNotificationScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [target, setTarget] = useState('all');
  const [residents, setResidents] = useState([]);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('General');
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadResidents = useCallback(async () => {
    setLoadingResidents(true);
    setError(null);
    try {
      const data = await fetchResidentsForNotifications();
      setResidents(data);
    } catch (err) {
      if (!err.sessionExpired) {
        setError(err.message || 'Unable to load residents');
      }
    } finally {
      setLoadingResidents(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadResidents();
    }, [loadResidents]),
  );

  const filteredResidents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return residents;

    return residents.filter(resident => {
      const text = [
        resident.fullname,
        resident.email,
        resident.phone,
        resident.room_number,
        resident.room_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });
  }, [residents, search]);

  const onSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      showPrimeAlert('Missing fields', 'Please enter a title and message.');
      return;
    }

    if (target === 'selected' && selectedResidentIds.length === 0) {
      showPrimeAlert(
        'Select residents',
        'Please choose at least one resident first.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendAdminNotification({
        ...buildNotificationRecipientPayload(target, selectedResidentIds),
        title: title.trim(),
        message: message.trim(),
        type,
      });

      const sentCount = Number(res.sent_count || 0);
      const pushDelivery = res.push_delivery;
      const pushMessage = pushDelivery?.success
        ? ` Push delivered to ${pushDelivery.successCount || 0} device(s).`
        : pushDelivery?.skipped
        ? ` In-app notification sent; device push skipped (${pushDelivery.reason}).`
        : '';

      showPrimeAlert(
        'Notification sent',
        `${sentCount} resident${
          sentCount === 1 ? '' : 's'
        } received it in the app.${pushMessage}`,
      );
      setTitle('');
      setMessage('');
      if (target === 'selected') setSelectedResidentIds([]);
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Send failed',
          err.message || 'Unable to send notification.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Send Notification"
      showBottomNav
      themeOverride={theme}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.subtext }]}>Send to</Text>
          <View style={styles.segmentRow}>
            {TARGETS.map(item => {
              const selected = target === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setTarget(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={selected ? theme.primaryText : theme.icon}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: selected ? theme.primaryText : theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {target === 'selected' ? (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.subtext }]}>
              Residents (choose one or more)
            </Text>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.inactive}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search name, room, phone..."
                placeholderTextColor={theme.inactive}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View style={styles.selectionSummary}>
              <Text style={[styles.selectionText, { color: theme.subtext }]}>
                {selectedResidentIds.length}{' '}
                {selectedResidentIds.length === 1 ? 'resident' : 'residents'}{' '}
                selected
              </Text>
              {selectedResidentIds.length ? (
                <TouchableOpacity
                  onPress={() => setSelectedResidentIds([])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.clearText, { color: theme.primary }]}>
                    Clear all
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingResidents ? (
              <View style={styles.residentLoading}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : error ? (
              <Card style={styles.feedbackCard} themeOverride={theme}>
                <Text style={[styles.errorText, { color: theme.danger }]}>
                  {error}
                </Text>
              </Card>
            ) : (
              filteredResidents.map(resident => {
                const residentId = String(resident._id);
                const selected = selectedResidentIds.includes(residentId);
                return (
                  <TouchableOpacity
                    key={resident._id}
                    style={[
                      styles.residentRow,
                      {
                        backgroundColor: selected
                          ? theme.primary + '18'
                          : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() =>
                      setSelectedResidentIds(current =>
                        current.includes(residentId)
                          ? current.filter(item => item !== residentId)
                          : [...current, residentId],
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.residentIcon,
                        { backgroundColor: theme.primary + '18' },
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={theme.primary}
                      />
                    </View>
                    <View style={styles.residentCopy}>
                      <Text
                        style={[styles.residentName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {resident.fullname || 'Resident'}
                      </Text>
                      <Text
                        style={[styles.residentMeta, { color: theme.subtext }]}
                        numberOfLines={1}
                      >
                        {[
                          resident.room_number || resident.room_id,
                          resident.phone,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
            {!loadingResidents && !error && filteredResidents.length === 0 ? (
              <Card style={styles.feedbackCard} themeOverride={theme}>
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  No residents found
                </Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.subtext }]}>Type</Text>
          <View style={styles.typeRow}>
            {NOTIFICATION_TYPES.map(item => {
              const selected = type === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setType(item)}
                >
                  <Text
                    style={[
                      styles.typeText,
                      { color: selected ? theme.primaryText : theme.text },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.subtext }]}>Title</Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: theme.input, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Notification title"
              placeholderTextColor={theme.inactive}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.subtext }]}>Message</Text>
          <View
            style={[
              styles.textAreaWrap,
              { backgroundColor: theme.input, borderColor: theme.border },
            ]}
          >
            <TextInput
              style={[styles.textArea, { color: theme.text }]}
              placeholder="Write the message residents will receive..."
              placeholderTextColor={theme.inactive}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: theme.primary },
            submitting && styles.disabled,
          ]}
          onPress={onSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <>
              <Ionicons
                name="send-outline"
                size={18}
                color={theme.primaryText}
              />
              <Text style={[styles.sendText, { color: theme.primaryText }]}>
                {target === 'selected' && selectedResidentIds.length
                  ? `Send to ${selectedResidentIds.length} resident${
                      selectedResidentIds.length === 1 ? '' : 's'
                    }`
                  : 'Send notification'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 44,
    },
    section: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 19,
      padding: 17,
      marginBottom: 14,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.25,
      shadowRadius: 13,
      elevation: 4,
    },
    label: { fontSize: 13, fontWeight: '800', marginBottom: 10 },
    segmentRow: { flexDirection: 'row', gap: 9 },
    segment: {
      flex: 1,
      minHeight: 48,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 9,
    },
    segmentText: { fontSize: 13, fontWeight: '900' },
    searchBox: {
      minHeight: 48,
      borderRadius: 13,
      borderWidth: 1,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 14 },
    selectionSummary: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    selectionText: { fontSize: 12, fontWeight: '800' },
    clearText: { fontSize: 12, fontWeight: '900' },
    residentLoading: { paddingVertical: 20 },
    errorText: { fontSize: 14 },
    feedbackCard: {
      backgroundColor: theme.input,
      borderColor: theme.border,
      borderRadius: 14,
      marginBottom: 0,
    },
    residentRow: {
      minHeight: 66,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 9,
    },
    residentIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 11,
    },
    residentCopy: { flex: 1 },
    residentName: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
    residentMeta: { fontSize: 12 },
    emptyText: { fontSize: 13, textAlign: 'center' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
    typeChip: {
      borderRadius: 19,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    typeText: { fontSize: 13, fontWeight: '800' },
    inputWrap: {
      borderWidth: 1,
      borderRadius: 13,
      minHeight: 50,
      paddingHorizontal: 13,
      justifyContent: 'center',
    },
    input: { fontSize: 15 },
    textAreaWrap: {
      borderWidth: 1,
      borderRadius: 13,
      paddingHorizontal: 13,
    },
    textArea: {
      minHeight: 122,
      fontSize: 15,
      lineHeight: 21,
      paddingVertical: 13,
    },
    sendBtn: {
      minHeight: 52,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    sendText: { fontSize: 15, fontWeight: '900' },
    disabled: { opacity: 0.7 },
  });
