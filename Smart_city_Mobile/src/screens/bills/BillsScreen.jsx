import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fetchBills } from '../../api/bills';
import { getBillTheme } from './billTheme';

const SERVICE_ICONS = {
  Water: 'water-outline',
  Electricity: 'flash-outline',
  Maintenance: 'build-outline',
  Installment: 'home-outline',
  Service: 'construct-outline',
  Other: 'receipt-outline',
  General: 'receipt-outline',
};

function getBillCategory(bill) {
  if (bill?.category && bill.category !== 'Combined') return bill.category;
  if (Number(bill?.installment_amount) > 0) return 'Apartment Installment';
  if (Number(bill?.electricity_amount) > 0) return 'Electricity';
  if (Number(bill?.water_amount) > 0) return 'Water';
  if (Number(bill?.maintenance_amount) > 0) return 'Maintenance';
  if (Number(bill?.service_amount) > 0) return 'Service Fee';
  if (Number(bill?.other_amount) > 0) return 'Other';
  return 'Service Bill';
}

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('en-US')} MMK`;
}

function formatDate(value) {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusTheme(status, theme) {
  if (status === 'Paid') {
    return {
      color: theme.success,
      background: theme.successBg,
      icon: 'checkmark-circle',
    };
  }
  if (status === 'Overdue' || status === 'Rejected') {
    return {
      color: theme.danger,
      background: theme.dangerBg,
      icon: 'alert-circle',
    };
  }
  if (
    ['Payment Submitted', 'Under Review', 'Pending Verification'].includes(
      status,
    )
  ) {
    return {
      color: theme.primary,
      background: theme.primaryBg,
      icon: 'shield-checkmark-outline',
    };
  }

  return {
    color: theme.warning,
    background: theme.warningBg,
    icon: 'time-outline',
  };
}

export default function BillsScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getBillTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const isAdmin = ['Admin', 'Staff'].includes(user?.role);

  const loadBills = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      setBills(await fetchBills());
    } catch (err) {
      if (!err.sessionExpired) {
        setError(err.message || 'Unable to load service bills');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBills();
    }, [loadBills]),
  );

  const outstandingTotal = useMemo(
    () =>
      bills
        .filter(bill => bill.status !== 'Paid')
        .reduce((sum, bill) => sum + Number(bill.amount || 0), 0),
    [bills],
  );

  const renderBill = ({ item }) => {
    const room =
      item.room_id && typeof item.room_id === 'object' ? item.room_id : null;
    const resident = room?.resident_id;
    const service = item.type || item.service || 'General';
    const category = getBillCategory(item);
    const statusTheme = getStatusTheme(item.status, theme);

    return (
      <TouchableOpacity
        onPress={() => setSelectedBill(item)}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.title || `${service} bill`} details`}
      >
        <Card
          style={[styles.billCard, isAdmin && styles.adminBillCard]}
          themeOverride={theme}
        >
          <View style={styles.row}>
            <View
              style={[
                styles.serviceIcon,
                { backgroundColor: theme.primary + '18' },
              ]}
            >
              <Ionicons
                name={SERVICE_ICONS[service] || SERVICE_ICONS.General}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.details}>
              <Text
                style={[styles.service, { color: theme.text }]}
                numberOfLines={2}
              >
                {item.title || `${service} bill`}
              </Text>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: theme.primaryBg },
                ]}
              >
                <Text style={[styles.categoryText, { color: theme.primary }]}>
                  {category}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={theme.subtext}
                />
                <Text style={[styles.due, { color: theme.subtext }]}>
                  Due {formatDate(item.due_date)}
                </Text>
              </View>
              {isAdmin ? (
                <View style={styles.metaRow}>
                  <Ionicons
                    name="home-outline"
                    size={13}
                    color={theme.subtext}
                  />
                  <Text
                    style={[styles.due, { color: theme.subtext }]}
                    numberOfLines={1}
                  >
                    Room {room?.room_name || 'Unassigned'}
                    {resident?.fullname || room?.owner_name
                      ? ` · ${resident?.fullname || room?.owner_name}`
                      : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.amount, { color: theme.text }]}>
                {formatAmount(item.amount)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusTheme.background },
                ]}
              >
                <Ionicons
                  name={statusTheme.icon}
                  size={12}
                  color={statusTheme.color}
                />
                <Text style={[styles.status, { color: statusTheme.color }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[styles.detailsAction, { borderTopColor: theme.border }]}
          >
            <Text style={[styles.detailsHint, { color: theme.primary }]}>
              View bill details
            </Text>
            <Ionicons name="chevron-forward" size={17} color={theme.primary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const componentRows = selectedBill
    ? [
        ['Electricity', selectedBill.electricity_amount],
        ['Water', selectedBill.water_amount],
        ['Apartment installment', selectedBill.installment_amount],
        ['Maintenance', selectedBill.maintenance_amount],
        ['Service fee', selectedBill.service_amount],
        [selectedBill.other_description || 'Other', selectedBill.other_amount],
      ].filter(([, amount]) => Number(amount || 0) > 0)
    : [];

  return (
    <ScreenContainer navigation={navigation} themeOverride={theme}>
      <FlatList
        data={bills}
        keyExtractor={item => String(item._id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBills(true)}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.heading, { color: theme.text }]}>
              Category Bills
            </Text>
            <Text style={[styles.sub, { color: theme.subtext }]}>
              {isAdmin
                ? 'Room and fee category shown for every payment'
                : user?.room_number
                ? `Pay each Unit ${user.room_number} fee separately`
                : 'Pay each fee separately for your linked room'}
            </Text>
            {!loading && bills.length > 0 ? (
              <View
                style={[
                  styles.summary,
                  { backgroundColor: theme.card, borderColor: theme.primary },
                ]}
              >
                <View style={styles.summaryContent}>
                  <View
                    style={[
                      styles.summaryIcon,
                      {
                        backgroundColor: theme.primaryBg,
                        borderColor: theme.goldBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="wallet-outline"
                      size={27}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.summaryCopy}>
                    <Text
                      style={[styles.summaryLabel, { color: theme.subtext }]}
                    >
                      Outstanding
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: theme.text }]}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      numberOfLines={1}
                    >
                      {formatAmount(outstandingTotal)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            {isAdmin ? (
              <View style={styles.adminActions}>
                <TouchableOpacity
                  style={[
                    styles.adminButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => navigation.navigate('CreateMonthlyBill')}
                  accessibilityRole="button"
                  accessibilityLabel="Create bill"
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[
                      styles.adminButtonText,
                      { color: theme.primaryText },
                    ]}
                  >
                    Create bill
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.adminButton,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => navigation.navigate('AdminPaymentReview')}
                  accessibilityRole="button"
                  accessibilityLabel="Verify payments"
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={theme.primary}
                  />
                  <Text style={[styles.adminButtonText, { color: theme.text }]}>
                    Verify payments
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {error ? (
              <View style={[styles.errorBanner, { borderColor: theme.danger }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={theme.danger}
                />
                <Text style={[styles.errorText, { color: theme.text }]}>
                  {error}
                </Text>
              </View>
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
                name="receipt-outline"
                size={38}
                color={theme.inactive}
              />
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                No service bills found
              </Text>
              {error ? (
                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => loadBills()}
                >
                  <Text
                    style={[styles.retryText, { color: theme.primaryText }]}
                  >
                    Retry
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
        renderItem={renderBill}
      />

      <Modal
        visible={Boolean(selectedBill)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBill(null)}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.card, borderColor: theme.primary },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.details}>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>
                  Bill details
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.subtext }]}>
                  {selectedBill?.title || 'Service bill'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedBill(null)}
                accessibilityRole="button"
                accessibilityLabel="Close bill details"
              >
                <Ionicons name="close" size={26} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              <View
                style={[styles.detailSummary, { backgroundColor: theme.input }]}
              >
                <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                  Category amount due
                </Text>
                <Text style={[styles.detailTotal, { color: theme.text }]}>
                  {formatAmount(selectedBill?.amount)}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: theme.subtext }]}>
                  Due {formatDate(selectedBill?.due_date)} ·{' '}
                  {selectedBill?.status}
                </Text>
                <Text
                  style={[styles.categorySummary, { color: theme.primary }]}
                >
                  {getBillCategory(selectedBill)} · separately payable
                </Text>
              </View>

              {selectedBill?.status !== 'Paid' ? (
                <View
                  style={[
                    styles.cutoffWarning,
                    { backgroundColor: theme.warningBg },
                  ]}
                >
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color={theme.warning}
                  />
                  <View style={styles.details}>
                    <Text style={[styles.warningTitle, { color: theme.text }]}>
                      Payment deadline warning
                    </Text>
                    <Text
                      style={[styles.warningText, { color: theme.subtext }]}
                    >
                      {selectedBill?.service_cutoff_warning ||
                        'Pay within 7 days. Electricity and water services may be suspended after the due date if this bill remains unpaid.'}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.breakdownTitle, { color: theme.text }]}>
                This category bill
              </Text>
              {componentRows.length ? (
                componentRows.map(([label, amount]) => (
                  <View
                    key={label}
                    style={[
                      styles.breakdownRow,
                      { borderBottomColor: theme.border },
                    ]}
                  >
                    <Text
                      style={[styles.breakdownLabel, { color: theme.subtext }]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[styles.breakdownAmount, { color: theme.text }]}
                    >
                      {formatAmount(amount)}
                    </Text>
                  </View>
                ))
              ) : (
                <View
                  style={[
                    styles.breakdownRow,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <Text
                    style={[styles.breakdownLabel, { color: theme.subtext }]}
                  >
                    {selectedBill?.type || 'Service charge'}
                  </Text>
                  <Text style={[styles.breakdownAmount, { color: theme.text }]}>
                    {formatAmount(selectedBill?.amount)}
                  </Text>
                </View>
              )}

              {isAdmin ? (
                <View
                  style={[styles.adminDetail, { backgroundColor: theme.input }]}
                >
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    Fee category
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    {getBillCategory(selectedBill)}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    Resident account
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    Room {selectedBill?.room_id?.room_name || 'Unknown'} ·{' '}
                    {selectedBill?.room_id?.resident_id?.fullname ||
                      'Unknown resident'}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    Latest payment
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    {selectedBill?.latest_payment?.status ||
                      'No screenshot submitted'}
                  </Text>
                </View>
              ) : null}

              {selectedBill?.room_id?.purchase_price ? (
                <View
                  style={[styles.adminDetail, { backgroundColor: theme.input }]}
                >
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    Room purchase plan
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    {selectedBill.room_id.room_type} ·{' '}
                    {formatAmount(selectedBill.room_id.purchase_price)}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    40% paid
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    {formatAmount(selectedBill.room_id.down_payment_amount)}
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.subtext }]}>
                    60-month plan
                  </Text>
                  <Text style={[styles.adminDetailText, { color: theme.text }]}>
                    {formatAmount(
                      selectedBill.room_id.monthly_installment_amount,
                    )}{' '}
                    monthly · {selectedBill.room_id.installments_paid || 0}/
                    {selectedBill.room_id.installment_months || 60} paid
                  </Text>
                </View>
              ) : null}

              {!isAdmin && selectedBill?.status !== 'Paid' ? (
                <TouchableOpacity
                  style={[styles.payButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    const bill = selectedBill;
                    setSelectedBill(null);
                    navigation.navigate('BillPayment', {
                      billId: bill._id,
                      bill,
                    });
                  }}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[styles.payButtonText, { color: theme.primaryText }]}
                  >
                    Pay {getBillCategory(selectedBill)}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 44,
      flexGrow: 1,
    },
    header: { marginBottom: 12 },
    heading: {
      fontSize: 32,
      fontWeight: '900',
      letterSpacing: -0.8,
      marginBottom: 7,
    },
    sub: { fontSize: 14, lineHeight: 20, marginBottom: 18 },
    billCard: {
      borderRadius: 22,
      padding: 16,
      marginBottom: 15,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 4,
    },
    adminBillCard: { borderColor: theme.deepBorder },
    categoryBadge: {
      alignSelf: 'flex-start',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 6,
    },
    categoryText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.2 },
    categorySummary: { fontSize: 12, fontWeight: '900', marginTop: 8 },
    summary: {
      borderRadius: 22,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 19,
      marginBottom: 16,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
    summaryContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    summaryIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryCopy: { flex: 1, minWidth: 0 },
    summaryLabel: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
      marginBottom: 5,
    },
    summaryValue: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
    adminActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    adminButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'transparent',
      borderRadius: 13,
      minWidth: 142,
      minHeight: 52,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    adminButtonText: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 14,
      padding: 13,
      marginBottom: 14,
      backgroundColor: theme.dangerBg,
    },
    errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    serviceIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    details: { flex: 1, minWidth: 0 },
    service: { fontSize: 16, fontWeight: '900', lineHeight: 21 },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    due: { flex: 1, fontSize: 12, lineHeight: 17 },
    right: { alignItems: 'flex-end', maxWidth: '38%', minWidth: 84 },
    amount: {
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 8,
      textAlign: 'right',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 9,
    },
    status: { fontSize: 11, fontWeight: '800' },
    detailsAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 13,
      paddingTop: 12,
    },
    detailsHint: { fontSize: 12, fontWeight: '900' },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.overlay || '#000000AA',
    },
    sheet: {
      maxHeight: '88%',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.4 },
    sheetSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 4 },
    sheetContent: { paddingHorizontal: 20, paddingBottom: 42 },
    detailSummary: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      padding: 17,
    },
    detailLabel: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
    detailTotal: { fontSize: 29, fontWeight: '900', letterSpacing: -0.5 },
    breakdownTitle: {
      fontSize: 17,
      fontWeight: '900',
      marginTop: 22,
      marginBottom: 5,
    },
    breakdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: 1,
      paddingVertical: 13,
    },
    breakdownLabel: { flex: 1, fontSize: 13 },
    breakdownAmount: { fontSize: 13, fontWeight: '800' },
    adminDetail: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.deepBorder,
      padding: 15,
      marginTop: 14,
    },
    adminDetailText: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
    cutoffWarning: {
      flexDirection: 'row',
      gap: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      padding: 14,
      marginTop: 12,
    },
    warningTitle: { fontSize: 13, fontWeight: '800' },
    warningText: { fontSize: 12, lineHeight: 18, marginTop: 3 },
    payButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      minHeight: 52,
      padding: 15,
      marginTop: 20,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    payButtonText: { fontSize: 16, fontWeight: '900' },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 10,
    },
    emptyText: { fontSize: 15, textAlign: 'center' },
    retryButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: { fontSize: 14, fontWeight: '700' },
  });
