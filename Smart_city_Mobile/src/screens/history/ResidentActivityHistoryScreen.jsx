import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AppText as Text } from '../../components/AppText';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useTheme } from '../../context/ThemeContext';
import { fetchVisitorHistory } from '../../api/visitors';
import { fetchMyHelperRequests } from '../../api/helpers';
import { fetchMyReports } from '../../api/reports';
import { fetchMyPaymentSubmissions } from '../../api/bills';
import { getAccessToken } from '../../api/client';
import { API_BASE_URL } from '../../config/api';
import { getHistoryTheme } from './historyTheme';

const HISTORY_TABS = [
  ['visitors', 'Visitors', 'person-outline'],
  ['helpers', 'Helpers', 'people-outline'],
  ['reports', 'Reports', 'document-text-outline'],
  ['payments', 'Payments', 'wallet-outline'],
];

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString();
}

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('en-US')} MMK`;
}

function paymentCategory(item) {
  const bill = item?.bill_id;
  if (bill?.category && bill.category !== 'Combined') return bill.category;
  return bill?.type || 'Service Bill';
}

function paymentStatusColor(status, theme) {
  if (status === 'Approved') return theme.success;
  if (['Rejected', 'Resubmission Required'].includes(status)) {
    return theme.danger;
  }
  return theme.warning;
}

export default function ResidentActivityHistoryScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getHistoryTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('visitors');
  const [visitors, setVisitors] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [reports, setReports] = useState([]);
  const [payments, setPayments] = useState([]);
  const [authToken, setAuthToken] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [visitorResult, helperResult, reportResult, paymentResult] =
        await Promise.all([
          fetchVisitorHistory({ limit: 100 }),
          fetchMyHelperRequests(),
          fetchMyReports({ limit: 100 }),
          fetchMyPaymentSubmissions({ limit: 100 }),
        ]);
      setVisitors(visitorResult.data || []);
      setHelpers(Array.isArray(helperResult) ? helperResult : []);
      setReports(Array.isArray(reportResult) ? reportResult : []);
      setPayments(Array.isArray(paymentResult) ? paymentResult : []);
      setAuthToken((await getAccessToken()) || '');
    } catch (err) {
      if (!err.sessionExpired)
        setError(err.message || 'Unable to load activity history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const data =
    tab === 'visitors'
      ? visitors
      : tab === 'helpers'
      ? helpers
      : tab === 'reports'
      ? reports
      : payments;

  const renderDate = value => (
    <View style={styles.dateRow}>
      <Ionicons name="time-outline" size={14} color={theme.inactive} />
      <Text style={styles.date}>{formatDate(value)}</Text>
    </View>
  );

  const renderStatus = (status, color = theme.primary) => (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: `${color}16`, borderColor: `${color}55` },
      ]}
    >
      <Text style={[styles.status, { color }]}>{status}</Text>
    </View>
  );

  const renderVisitor = ({ item }) => (
    <Card style={styles.historyCard} themeOverride={theme}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="person-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.fullname}</Text>
          <View style={styles.metaStack}>
            <Text style={styles.meta}>
              Purpose: {item.purpose || 'General'}
            </Text>
            <Text style={styles.meta}>
              Badge: {item.badgeNumber || 'Pending'}
            </Text>
          </View>
          {renderDate(item.createdAt || item.visitDate)}
          {item.registration_type === 'PreRegistered' ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('VisitorPass', { visitorId: item._id })
              }
              style={styles.passButton}
              activeOpacity={0.76}
              accessibilityRole="button"
              accessibilityLabel={`View visitor QR for ${item.fullname}`}
              hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
            >
              <Ionicons
                name="qr-code-outline"
                size={17}
                color={theme.primary}
              />
              <Text style={styles.passButtonText}>View visitor QR</Text>
              <Ionicons
                name="chevron-forward"
                size={15}
                color={theme.primary}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Card>
  );

  const renderHelper = ({ item }) => (
    <Card style={styles.historyCard} themeOverride={theme}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="people-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.titleWithStatus]}>
              {item.type}
            </Text>
            {renderStatus(item.status)}
          </View>
          <View style={styles.metaStack}>
            <Text style={styles.meta}>
              Preference: {item.gender_preferred || 'No Preference'}
            </Text>
            {item.helper_id?.fullname ? (
              <Text style={styles.meta}>Helper: {item.helper_id.fullname}</Text>
            ) : null}
            {item.quoted_price_mmk != null ? (
              <Text style={styles.meta}>
                Price: {Number(item.quoted_price_mmk).toLocaleString('en-US')}{' '}
                MMK{item.service_window ? ` · ${item.service_window}` : ''}
              </Text>
            ) : null}
          </View>
          {item.note ? (
            <View style={styles.notePanel}>
              <Text style={styles.note}>{item.note}</Text>
            </View>
          ) : null}
          {renderDate(item.created_at)}
        </View>
      </View>
    </Card>
  );

  const renderReport = ({ item }) => (
    <Card style={styles.historyCard} themeOverride={theme}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <Ionicons
            name="document-text-outline"
            size={24}
            color={theme.primary}
          />
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, styles.titleWithStatus]}>
              {item.title}
            </Text>
            {renderStatus(item.status)}
          </View>
          <Text style={styles.meta}>
            {item.type} · {item.location}
          </Text>
          <View style={styles.notePanel}>
            <Text style={styles.note}>{item.message}</Text>
          </View>
          {item.submitted_at ? (
            <View style={styles.acknowledgedRow}>
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={theme.success}
              />
              <Text style={styles.acknowledgedText}>
                Acknowledged by administration
              </Text>
            </View>
          ) : null}
          {renderDate(item.created_at)}
        </View>
      </View>
    </Card>
  );

  const renderPayment = ({ item }) => {
    const proofUri = item.proof_url ? `${API_BASE_URL}${item.proof_url}` : null;
    const statusColor = paymentStatusColor(item.status, theme);
    return (
      <Card
        style={[styles.historyCard, styles.paymentCard]}
        themeOverride={theme}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.icon}>
            <Ionicons name="wallet-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, styles.titleWithStatus]}>
                {paymentCategory(item)}
              </Text>
              {renderStatus(item.status, statusColor)}
            </View>
            <Text style={styles.meta}>
              {item.bill_id?.title || 'Bill payment'}
            </Text>
            <Text style={styles.paymentAmount}>
              {formatAmount(item.submitted_amount)}
            </Text>
            <Text style={styles.meta}>
              Room {item.room_id?.room_name || 'Unknown'} · Expected{' '}
              {formatAmount(item.expected_amount)}
            </Text>
          </View>
        </View>

        {proofUri && authToken ? (
          <TouchableOpacity
            style={styles.proofFrame}
            onPress={() => setSelectedPayment(item)}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel={`View payment screenshot for ${paymentCategory(
              item,
            )}`}
            accessibilityHint="Opens the payment proof in full screen"
          >
            <Image
              source={{
                uri: proofUri,
                headers: { Authorization: `Bearer ${authToken}` },
              }}
              style={styles.proofImage}
              resizeMode="cover"
            />
            <View style={styles.proofOverlay}>
              <Ionicons name="expand-outline" size={17} color="#FFFFFF" />
              <Text style={styles.proofOverlayText}>
                View payment screenshot
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.paymentDates}>
          <Text style={styles.meta}>
            Submitted: {formatDate(item.submitted_at || item.created_at)}
          </Text>
          <Text style={styles.meta}>
            {item.reviewed_at
              ? `Reviewed: ${formatDate(item.reviewed_at)}`
              : 'Reviewed: Waiting for Admin verification'}
          </Text>
          {item.bill_id?.paid_at ? (
            <Text style={styles.paidText}>
              Paid: {formatDate(item.bill_id.paid_at)}
            </Text>
          ) : null}
          {item.rejection_reason || item.admin_note ? (
            <View style={styles.notePanel}>
              <Text style={styles.note}>
                Admin: {item.rejection_reason || item.admin_note}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    );
  };

  const selectedProofUri = selectedPayment?.proof_url
    ? `${API_BASE_URL}${selectedPayment.proof_url}`
    : null;
  const emptyIcon =
    HISTORY_TABS.find(([value]) => value === tab)?.[2] || 'time-outline';

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="My Activity History"
      showBottomNav
      themeOverride={theme}
    >
      <FlatList
        data={data}
        keyExtractor={item => item._id}
        renderItem={
          tab === 'visitors'
            ? renderVisitor
            : tab === 'helpers'
            ? renderHelper
            : tab === 'reports'
            ? renderReport
            : renderPayment
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.card}
          />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.tabsShell}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabs}
              >
                {HISTORY_TABS.map(([value, label, icon]) => {
                  const active = tab === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.tab, active && styles.activeTab]}
                      onPress={() => setTab(value)}
                      activeOpacity={0.76}
                      accessibilityRole="button"
                      accessibilityLabel={`${label} history`}
                      accessibilityState={{ selected: active }}
                    >
                      <Ionicons
                        name={icon}
                        size={18}
                        color={active ? theme.primaryText : theme.subtext}
                      />
                      <Text
                        style={[styles.tabText, active && styles.activeTabText]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <View style={styles.errorIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={21}
                    color={theme.danger}
                  />
                </View>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loader} accessibilityLiveRegion="polite">
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <View style={styles.emptyState} accessibilityLiveRegion="polite">
              <View style={styles.emptyIcon}>
                <Ionicons name={emptyIcon} size={30} color={theme.primary} />
              </View>
              <Text style={styles.empty}>No {tab} history yet</Text>
            </View>
          )
        }
      />
      <Modal
        visible={Boolean(selectedPayment)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPayment(null)}
      >
        <View
          style={[
            styles.modalBackdrop,
            {
              paddingTop: Math.max(insets.top, 16) + 64,
              paddingBottom: Math.max(insets.bottom, 16) + 16,
            },
          ]}
          accessibilityViewIsModal
        >
          <TouchableOpacity
            style={[styles.modalClose, { top: Math.max(insets.top, 16) + 8 }]}
            onPress={() => setSelectedPayment(null)}
            activeOpacity={0.74}
            accessibilityRole="button"
            accessibilityLabel="Close payment screenshot"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={25} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.modalImageShell}>
            {selectedProofUri && authToken ? (
              <Image
                source={{
                  uri: selectedProofUri,
                  headers: { Authorization: `Bearer ${authToken}` },
                }}
                style={styles.fullProof}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <View style={styles.modalCaption}>
            <Text style={styles.modalTitle}>
              {paymentCategory(selectedPayment)} ·{' '}
              {formatAmount(selectedPayment?.submitted_amount)}
            </Text>
            <Text style={styles.modalMeta}>
              Submitted {formatDate(selectedPayment?.submitted_at)}
            </Text>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 40,
      flexGrow: 1,
    },
    tabsShell: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 4,
      marginBottom: 18,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 3,
    },
    tabs: { gap: 4 },
    tab: {
      minWidth: 112,
      minHeight: 46,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 7,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 11,
    },
    activeTab: { backgroundColor: theme.primary },
    tabText: {
      color: theme.subtext,
      fontSize: 13,
      fontWeight: '800',
    },
    activeTabText: { color: theme.primaryText },
    historyCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 17,
      marginBottom: 13,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 4,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    icon: {
      width: 52,
      height: 52,
      flexShrink: 0,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      backgroundColor: theme.iconSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    copy: { flex: 1, minWidth: 0 },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 9,
      marginBottom: 3,
    },
    title: {
      flexShrink: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 22,
      marginBottom: 5,
    },
    titleWithStatus: { flex: 1 },
    statusPill: {
      flexShrink: 1,
      minHeight: 26,
      justifyContent: 'center',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    status: {
      fontSize: 11,
      fontWeight: '900',
      lineHeight: 16,
      textAlign: 'center',
    },
    metaStack: { gap: 2 },
    meta: { color: theme.subtext, fontSize: 13, lineHeight: 20 },
    notePanel: {
      backgroundColor: theme.elevated,
      borderWidth: 1,
      borderColor: theme.divider,
      borderRadius: 12,
      marginTop: 9,
      paddingHorizontal: 11,
      paddingVertical: 9,
    },
    note: { color: theme.text, fontSize: 13, lineHeight: 20 },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 10,
    },
    date: {
      flex: 1,
      color: theme.inactive,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
    },
    passButton: {
      alignSelf: 'flex-start',
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: theme.primaryBg,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginTop: 12,
    },
    passButtonText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
    },
    acknowledgedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    acknowledgedText: {
      flex: 1,
      color: theme.success,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 18,
    },
    paymentCard: { paddingBottom: 16 },
    paymentHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    paymentAmount: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '900',
      lineHeight: 29,
      marginVertical: 7,
      letterSpacing: -0.25,
    },
    proofFrame: {
      minHeight: 190,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      overflow: 'hidden',
      marginTop: 15,
      backgroundColor: theme.input,
    },
    proofImage: { width: '100%', height: 190 },
    proofOverlay: {
      position: 'absolute',
      right: 9,
      bottom: 9,
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    proofOverlayText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },
    paymentDates: {
      borderTopWidth: 1,
      borderTopColor: theme.divider,
      marginTop: 14,
      paddingTop: 12,
      gap: 2,
    },
    paidText: {
      color: theme.success,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 20,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.dangerBg,
      borderWidth: 1,
      borderColor: `${theme.danger}66`,
      borderRadius: 15,
      padding: 13,
      marginBottom: 14,
    },
    errorIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.danger}16`,
    },
    error: {
      flex: 1,
      color: theme.danger,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 20,
    },
    loader: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 58,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      marginTop: 5,
      paddingHorizontal: 20,
      paddingVertical: 44,
    },
    emptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.iconSurface,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      marginBottom: 14,
    },
    empty: {
      color: theme.subtext,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
      textAlign: 'center',
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.overlay,
      paddingHorizontal: 16,
    },
    modalClose: {
      position: 'absolute',
      right: 18,
      zIndex: 2,
      width: 46,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.elevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 23,
    },
    modalImageShell: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: '#05080A',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
    },
    fullProof: { width: '100%', height: '100%' },
    modalCaption: {
      backgroundColor: theme.elevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      paddingHorizontal: 16,
      paddingVertical: 13,
      marginTop: 12,
    },
    modalTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '900',
      lineHeight: 22,
      textAlign: 'center',
    },
    modalMeta: {
      color: theme.subtext,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 4,
    },
  });
