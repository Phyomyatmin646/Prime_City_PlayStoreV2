import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useTheme } from '../../context/ThemeContext';
import {
  fetchReports,
  submitReportAcknowledgement,
} from '../../api/reports';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || '').trim());
}

function getRoomName(item) {
  if (item.source_room?.room_name) return item.source_room.room_name;

  const residentRoom = item.user_id?.room_number || item.user_id?.room_id;
  if (residentRoom && !isObjectId(residentRoom)) return residentRoom;

  const location = String(item.location || '')
    .replace(/^unit\s+/i, '')
    .trim();
  return location && !isObjectId(location) ? location : 'Unknown';
}

export default function AdminReportsScreen({ navigation }) {
  const { theme } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);

  const loadReports = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setReports(await fetchReports({ limit: 100 }));
    } catch (err) {
      if (!err.sessionExpired)
        setError(err.message || 'Unable to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports]),
  );

  const submitReport = async item => {
    setSubmittingId(item._id);
    try {
      const updated = await submitReportAcknowledgement(item._id);
      setReports(current =>
        current.map(report => (report._id === item._id ? updated : report)),
      );
      showPrimeAlert('Submitted', 'The resident has been notified.');
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert('Unable to submit', err.message || 'Please try again.');
      }
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Resident Reports"
      showBottomNav
    >
      <FlatList
        data={reports}
        keyExtractor={item => String(item._id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReports(true)}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.heading, { color: theme.text }]}>
              Resident reports
            </Text>
            <Text style={[styles.sub, { color: theme.subtext }]}>
              Room, resident, location, and issue details
            </Text>
            {error ? (
              <Text style={[styles.error, { color: theme.danger }]}>
                {error}
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons
                name="document-text-outline"
                size={38}
                color={theme.inactive}
              />
              <Text style={[styles.empty, { color: theme.subtext }]}>
                No resident reports found
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const resident = item.user_id;
          const isResolved = item.status === 'Resolved';
          const statusColor = isResolved ? theme.success : theme.warning;
          const statusBackground = isResolved
            ? theme.successBg
            : theme.warningBg;

          return (
            <Card>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: theme.primary + '18' },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.titleCopy}>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.meta, { color: theme.subtext }]}>
                    Room {getRoomName(item)} ·{' '}
                    {resident?.fullname || 'Unknown resident'}
                  </Text>
                </View>
                <View
                  style={[styles.badge, { backgroundColor: statusBackground }]}
                >
                  <Text style={[styles.badgeText, { color: statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="pricetag-outline"
                  size={14}
                  color={theme.subtext}
                />
                <Text style={[styles.detail, { color: theme.subtext }]}>
                  {item.type}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={theme.subtext}
                />
                <Text style={[styles.detail, { color: theme.subtext }]}>
                  {item.location}
                </Text>
              </View>
              <Text style={[styles.message, { color: theme.text }]}>
                {item.message}
              </Text>
              <Text style={[styles.date, { color: theme.inactive }]}> 
                {formatDate(item.created_at)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: item.submitted_at
                      ? theme.successBg
                      : theme.primary,
                  },
                ]}
                disabled={Boolean(item.submitted_at) || submittingId === item._id}
                onPress={() => submitReport(item)}>
                {submittingId === item._id ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <Ionicons
                    name={item.submitted_at ? 'checkmark-done-outline' : 'send-outline'}
                    size={16}
                    color={item.submitted_at ? theme.success : theme.primaryText}
                  />
                )}
                <Text
                  style={[
                    styles.submitText,
                    { color: item.submitted_at ? theme.success : theme.primaryText },
                  ]}>
                  {item.submitted_at ? 'Submitted' : 'Submit & notify resident'}
                </Text>
              </TouchableOpacity>
            </Card>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 36, flexGrow: 1 },
  header: { marginBottom: 12 },
  heading: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 8 },
  error: { fontSize: 13 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  empty: { fontSize: 15 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleCopy: { flex: 1, paddingRight: 8 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  meta: { fontSize: 12, lineHeight: 17 },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  detail: { flex: 1, fontSize: 13 },
  message: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  date: { fontSize: 11, marginTop: 10 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 12,
  },
  submitText: { fontSize: 13, fontWeight: '800' },
});
