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
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import {
  createMonthlyBill,
  createMonthlyBillsForAll,
  fetchBillingRooms,
} from '../../api/bills';
import { useTheme } from '../../context/ThemeContext';
import { getBillTheme } from './billTheme';

const ROOM_PRICES = {
  Business: 500000000,
  Office: 1000000000,
  Standard: 200000000,
  Premium: 300000000,
};
const COMMON_COMPONENTS = [
  ['electricity_amount', 'Electricity', 'flash-outline'],
  ['water_amount', 'Water', 'water-outline'],
  ['maintenance_amount', 'Maintenance', 'build-outline'],
  ['service_amount', 'Service fee', 'receipt-outline'],
  ['other_amount', 'Other', 'document-text-outline'],
];
const INSTALLMENT_KEY = 'installment_amount';
const ALL_CATEGORY_KEYS = [
  INSTALLMENT_KEY,
  ...COMMON_COMPONENTS.map(([key]) => key),
];

function money(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value) {
  return `${money(value).toLocaleString('en-US')} MMK`;
}

function defaultDueDate() {
  const value = new Date();
  value.setDate(value.getDate() + 7);
  return value.toISOString().slice(0, 10);
}

function roomFinance(room) {
  if (!room) return null;
  const price = money(room.purchase_price) || ROOM_PRICES[room.room_type] || 0;
  const downPayment = money(room.down_payment_amount) || price * 0.4;
  const financed = money(room.financed_amount) || price - downPayment;
  const installment =
    room.installment_status === 'Paid'
      ? 0
      : money(room.monthly_installment_amount) || financed / 60;
  return { price, downPayment, financed, installment };
}

export default function CreateMonthlyBillScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getBillTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const now = new Date();
  const [target, setTarget] = useState('one');
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [title, setTitle] = useState('');
  const [components, setComponents] = useState({ service_amount: '1000' });
  const [dueDates, setDueDates] = useState(() =>
    Object.fromEntries(ALL_CATEGORY_KEYS.map(key => [key, defaultDueDate()])),
  );
  const [otherDescription, setOtherDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadRooms = useCallback(async () => {
    try {
      setRooms(await fetchBillingRooms());
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to load rooms',
          err.message || 'Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms]),
  );

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(room =>
      [
        room.room_name,
        room.building,
        room.room_type,
        room.resident_id?.fullname,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rooms, search]);

  const commonTotal = useMemo(
    () =>
      COMMON_COMPONENTS.reduce((sum, [key]) => sum + money(components[key]), 0),
    [components],
  );
  const selectedFinance = useMemo(
    () => roomFinance(selectedRoom),
    [selectedRoom],
  );
  const estimatedTotal = useMemo(() => {
    if (target === 'one')
      return commonTotal + money(selectedFinance?.installment);
    return rooms.reduce(
      (sum, room) => sum + commonTotal + money(roomFinance(room)?.installment),
      0,
    );
  }, [commonTotal, rooms, selectedFinance, target]);
  const activeCategoryKeys = useMemo(() => {
    const keys = COMMON_COMPONENTS.filter(
      ([key]) => money(components[key]) > 0,
    ).map(([key]) => key);
    const hasInstallment =
      target === 'one'
        ? money(selectedFinance?.installment) > 0
        : rooms.some(room => money(roomFinance(room)?.installment) > 0);
    return hasInstallment ? [INSTALLMENT_KEY, ...keys] : keys;
  }, [components, rooms, selectedFinance, target]);

  const submit = async () => {
    if (target === 'one' && !selectedRoom) {
      showPrimeAlert(
        'Select room',
        'Choose the resident room for this monthly bill.',
      );
      return;
    }
    if (target === 'all' && !rooms.length) {
      showPrimeAlert(
        'No residents',
        'There are no occupied resident rooms to bill.',
      );
      return;
    }
    if (
      !(Number(month) >= 1 && Number(month) <= 12) ||
      !Number.isInteger(Number(year))
    ) {
      showPrimeAlert('Invalid billing period', 'Enter a valid month and year.');
      return;
    }
    if (!(estimatedTotal > 0)) {
      showPrimeAlert(
        'Invalid total',
        'At least one bill component must be greater than zero.',
      );
      return;
    }
    const invalidDueDate = activeCategoryKeys.find(key => {
      const value = dueDates[key];
      return (
        !/^\d{4}-\d{2}-\d{2}$/.test(value || '') ||
        Number.isNaN(new Date(`${value}T23:59:59+06:30`).getTime())
      );
    });
    if (invalidDueDate) {
      showPrimeAlert(
        'Invalid due date',
        'Enter every selected category due date as YYYY-MM-DD.',
      );
      return;
    }

    const payload = {
      billing_month: Number(month),
      billing_year: Number(year),
      ...(title.trim() ? { title: title.trim() } : {}),
      type: 'General',
      ...Object.fromEntries(
        COMMON_COMPONENTS.map(([key]) => [key, money(components[key])]),
      ),
      other_description: otherDescription.trim(),
      category_due_dates: Object.fromEntries(
        activeCategoryKeys.map(key => [key, dueDates[key]]),
      ),
    };

    setSubmitting(true);
    try {
      if (target === 'all') {
        const response = await createMonthlyBillsForAll(payload);
        showPrimeAlert(
          'Category bills created',
          `${response.created_count || 0} separate category bills created. ${
            response.skipped_count || 0
          } existing room/category bills skipped.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        const response = await createMonthlyBill({
          ...payload,
          room_id: selectedRoom._id,
        });
        showPrimeAlert(
          'Category bills created',
          `${
            response.created_count || response.bills?.length || 0
          } separate bills were created for Room ${
            selectedRoom.room_name
          }. Combined value: ${formatMoney(estimatedTotal)}.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to create bill',
          err.message || 'Please try again.',
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
      title="Create Monthly Bill"
      themeOverride={theme}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.billCard} themeOverride={theme}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons name="people-outline" size={21} color={theme.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Bill recipients
            </Text>
          </View>
          <View style={styles.targetRow}>
            {[
              ['one', 'One resident', 'person-outline'],
              ['all', `All residents (${rooms.length})`, 'people-outline'],
            ].map(([value, label, icon]) => {
              const selected = target === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.targetButton,
                    {
                      backgroundColor: selected ? theme.primary : theme.input,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setTarget(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                >
                  <Ionicons
                    name={icon}
                    size={18}
                    color={selected ? theme.primaryText : theme.text}
                  />
                  <Text
                    style={[
                      styles.targetText,
                      { color: selected ? theme.primaryText : theme.text },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {target === 'one' ? (
            <>
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
                  placeholder="Search room, type or resident"
                  placeholderTextColor={theme.inactive}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              {loading ? (
                <ActivityIndicator
                  color={theme.primary}
                  style={styles.loader}
                />
              ) : (
                <ScrollView style={styles.roomList} nestedScrollEnabled>
                  {filteredRooms.slice(0, 60).map(room => {
                    const selected = selectedRoom?._id === room._id;
                    return (
                      <TouchableOpacity
                        key={room._id}
                        style={[
                          styles.roomRow,
                          {
                            borderColor: selected
                              ? theme.primary
                              : theme.border,
                            backgroundColor: selected
                              ? `${theme.primary}18`
                              : theme.input,
                          },
                        ]}
                        onPress={() => setSelectedRoom(room)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Room ${room.room_name}, ${
                          room.resident_id?.fullname || 'Resident'
                        }`}
                      >
                        <Ionicons
                          name={
                            selected ? 'radio-button-on' : 'radio-button-off'
                          }
                          size={19}
                          color={selected ? theme.primary : theme.inactive}
                        />
                        <View style={styles.flex}>
                          <Text
                            style={[styles.roomName, { color: theme.text }]}
                          >
                            Room {room.room_name} · {room.room_type}
                          </Text>
                          <Text
                            style={[
                              styles.roomResident,
                              { color: theme.subtext },
                            ]}
                          >
                            {room.resident_id?.fullname || 'Resident'} ·{' '}
                            {formatMoney(roomFinance(room)?.installment)}/month
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </>
          ) : (
            <View style={[styles.infoBox, { backgroundColor: theme.input }]}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Each selected fee becomes a separate payable bill for every
                occupied room. Existing room/month/category bills are skipped.
              </Text>
            </View>
          )}
        </Card>

        {target === 'one' && selectedFinance ? (
          <Card style={styles.billCard} themeOverride={theme}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  {
                    backgroundColor: theme.primaryBg,
                    borderColor: theme.goldBorder,
                  },
                ]}
              >
                <Ionicons name="home-outline" size={21} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Room purchase plan
              </Text>
            </View>
            {[
              ['Room price', selectedFinance.price],
              ['40% paid', selectedFinance.downPayment],
              ['60% financed', selectedFinance.financed],
              ['Monthly installment (60 months)', selectedFinance.installment],
            ].map(([label, value]) => (
              <View key={label} style={styles.financeRow}>
                <Text style={[styles.financeLabel, { color: theme.subtext }]}>
                  {label}
                </Text>
                <Text style={[styles.financeValue, { color: theme.text }]}>
                  {formatMoney(value)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.billCard} themeOverride={theme}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={21}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Billing period
            </Text>
          </View>
          <View style={styles.twoColumns}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: theme.subtext }]}>
                Month (1-12)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                  },
                ]}
                value={month}
                onChangeText={setMonth}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: theme.subtext }]}>Year</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                  },
                ]}
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
          <View
            style={[styles.deadlineBox, { backgroundColor: theme.warningBg }]}
          >
            <Ionicons name="time-outline" size={19} color={theme.warning} />
            <View style={styles.flex}>
              <Text style={[styles.deadlineTitle, { color: theme.text }]}>
                Independent payment deadlines
              </Text>
              <Text style={[styles.deadlineText, { color: theme.subtext }]}>
                Set a due date for every non-zero category below. Residents can
                pay each category separately.
              </Text>
            </View>
          </View>
          <Text style={[styles.label, { color: theme.subtext }]}>
            Custom title (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Auto-generated when blank"
            placeholderTextColor={theme.inactive}
          />
        </Card>

        <Card
          style={[styles.billCard, styles.categoriesCard]}
          themeOverride={theme}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={21}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Separate bill categories
            </Text>
          </View>
          {COMMON_COMPONENTS.map(([key, label, icon]) => (
            <View key={key} style={styles.categoryBlock}>
              <View style={styles.amountRow}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: theme.primaryBg },
                  ]}
                >
                  <Ionicons name={icon} size={20} color={theme.primary} />
                </View>
                <Text style={[styles.componentLabel, { color: theme.text }]}>
                  {label}
                </Text>
                <TextInput
                  style={[
                    styles.amountInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                    },
                  ]}
                  value={components[key] || ''}
                  onChangeText={value =>
                    setComponents(current => ({ ...current, [key]: value }))
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.inactive}
                />
              </View>
              {money(components[key]) > 0 ? (
                <View style={styles.dueInputRow}>
                  <Text style={[styles.dueLabel, { color: theme.subtext }]}>
                    {label} due date
                  </Text>
                  <TextInput
                    style={[
                      styles.dueInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.input,
                        borderColor: theme.border,
                      },
                    ]}
                    value={dueDates[key]}
                    onChangeText={value =>
                      setDueDates(current => ({ ...current, [key]: value }))
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.inactive}
                  />
                </View>
              ) : null}
            </View>
          ))}
          <View style={[styles.automaticRow, { backgroundColor: theme.input }]}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: theme.primaryBg },
              ]}
            >
              <Ionicons name="home-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.componentLabel, { color: theme.text }]}>
                Apartment installment
              </Text>
              <Text style={[styles.autoHint, { color: theme.subtext }]}>
                Automatic by room type
              </Text>
            </View>
            <Text style={[styles.financeValue, { color: theme.text }]}>
              {target === 'one'
                ? formatMoney(selectedFinance?.installment)
                : 'Per room'}
            </Text>
          </View>
          {activeCategoryKeys.includes(INSTALLMENT_KEY) ? (
            <View style={styles.dueInputRow}>
              <Text style={[styles.dueLabel, { color: theme.subtext }]}>
                Installment due date
              </Text>
              <TextInput
                style={[
                  styles.dueInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                  },
                ]}
                value={dueDates[INSTALLMENT_KEY]}
                onChangeText={value =>
                  setDueDates(current => ({
                    ...current,
                    [INSTALLMENT_KEY]: value,
                  }))
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.inactive}
              />
            </View>
          ) : null}
          {money(components.other_amount) > 0 ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                },
              ]}
              value={otherDescription}
              onChangeText={setOtherDescription}
              placeholder="Describe other charge"
              placeholderTextColor={theme.inactive}
              maxLength={240}
            />
          ) : null}
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.subtext }]}>
              {target === 'all'
                ? 'Estimated value across separate bills'
                : `${activeCategoryKeys.length} separately payable bill${
                    activeCategoryKeys.length === 1 ? '' : 's'
                  }`}
            </Text>
            <Text style={[styles.total, { color: theme.primary }]}>
              {formatMoney(estimatedTotal)}
            </Text>
          </View>
        </Card>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: theme.primary },
            submitting && styles.submitDisabled,
          ]}
          onPress={submit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitting }}
          accessibilityLabel={
            target === 'all'
              ? 'Create category bills for all'
              : 'Create separate category bills'
          }
        >
          {submitting ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Ionicons
              name="receipt-outline"
              size={20}
              color={theme.primaryText}
            />
          )}
          <Text style={[styles.submitText, { color: theme.primaryText }]}>
            {target === 'all'
              ? 'Create category bills for all'
              : 'Create separate category bills'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 52,
      gap: 16,
    },
    billCard: {
      borderColor: theme.deepBorder,
      borderRadius: 22,
      padding: 17,
      marginBottom: 0,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 4,
    },
    categoriesCard: {
      borderColor: theme.softGoldBorder,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 16,
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { flex: 1, fontSize: 18, fontWeight: '900' },
    targetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 9,
      marginBottom: 14,
    },
    targetButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 13,
      minWidth: 135,
      minHeight: 48,
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    targetText: { fontSize: 12, fontWeight: '900' },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 13,
      minHeight: 48,
      paddingHorizontal: 13,
    },
    searchInput: { flex: 1, paddingVertical: 12 },
    loader: { margin: 20 },
    roomList: { maxHeight: 320, marginTop: 12 },
    roomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderRadius: 13,
      minHeight: 66,
      padding: 12,
      marginBottom: 8,
    },
    flex: { flex: 1 },
    roomName: { fontSize: 14, fontWeight: '800' },
    roomResident: { fontSize: 12, lineHeight: 17, marginTop: 3 },
    infoBox: {
      flexDirection: 'row',
      gap: 9,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.deepBorder,
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 19 },
    financeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.deepBorder,
      paddingBottom: 11,
      marginBottom: 11,
    },
    financeLabel: { flex: 1, fontSize: 12, lineHeight: 18 },
    financeValue: { fontSize: 12, fontWeight: '900', textAlign: 'right' },
    twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 9 },
    input: {
      borderWidth: 1,
      borderRadius: 13,
      minHeight: 48,
      paddingHorizontal: 13,
      paddingVertical: 12,
    },
    deadlineBox: {
      flexDirection: 'row',
      gap: 9,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      marginTop: 14,
    },
    deadlineTitle: { fontSize: 13, fontWeight: '900' },
    deadlineText: { fontSize: 11, lineHeight: 18, marginTop: 3 },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryBlock: {
      borderBottomWidth: 1,
      borderBottomColor: theme.deepBorder,
      paddingBottom: 13,
      marginBottom: 13,
    },
    componentLabel: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: '800' },
    amountInput: {
      width: 130,
      borderWidth: 1,
      borderRadius: 12,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlign: 'right',
    },
    automaticRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 13,
      borderWidth: 1,
      borderColor: theme.deepBorder,
      padding: 13,
      marginBottom: 11,
    },
    autoHint: { fontSize: 11, marginTop: 2 },
    dueInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 9,
    },
    dueLabel: { flex: 1, fontSize: 11, fontWeight: '700' },
    dueInput: {
      width: 150,
      borderWidth: 1,
      borderRadius: 11,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 12,
      textAlign: 'center',
    },
    totalRow: {
      borderTopWidth: 1,
      marginTop: 10,
      paddingTop: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    totalLabel: { flex: 1, fontSize: 13, fontWeight: '800', lineHeight: 18 },
    total: {
      fontSize: 18,
      fontWeight: '900',
      textAlign: 'right',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      minHeight: 52,
      padding: 15,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    submitDisabled: { opacity: 0.58 },
    submitText: { fontSize: 15, fontWeight: '900' },
  });
