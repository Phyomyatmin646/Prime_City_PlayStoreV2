import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
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
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  createPrimeCityMerchant,
  creditRfidWallet,
  fetchMyRfidWallet,
  fetchPrimeCityMerchantLedger,
  fetchPrimeCityMerchants,
  payPrimeCityMerchant,
  settlePrimeCityMerchant,
} from '../../api/rfidWallet';
import { fetchResidentsForNotifications } from '../../api/adminNotifications';
import { getResidentWalletTheme } from './residentWalletTheme';

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('en-US')} MMK`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function ResidentRfidCardScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getResidentWalletTheme(appTheme);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paying, setPaying] = useState(false);

  const loadWallet = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [walletData, merchantData] = await Promise.all([
        fetchMyRfidWallet(),
        fetchPrimeCityMerchants(),
      ]);
      setData(walletData);
      setMerchants(merchantData);
    } catch (err) {
      if (!err.sessionExpired)
        setError(err.message || 'Unable to load RFID card');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet]),
  );

  const card = data?.card;
  const wallet = data?.wallet;
  const activeCard = card?.assigned && card?.status === 'active';

  const submitPayment = () => {
    const value = Number(paymentAmount);
    if (!selectedMerchant?._id) {
      showPrimeAlert(
        'Choose a shop',
        'Select the Prime City shop you are paying.',
      );
      return;
    }
    if (!activeCard || wallet?.status !== 'Active') {
      showPrimeAlert(
        'Wallet unavailable',
        'An active RFID card and wallet are required.',
      );
      return;
    }
    if (!Number.isInteger(value) || value <= 0) {
      showPrimeAlert('Invalid amount', 'Enter a positive whole MMK amount.');
      return;
    }
    if (value > Number(wallet?.balance_mmk || 0)) {
      showPrimeAlert(
        'Insufficient balance',
        'Your wallet does not have enough credit.',
      );
      return;
    }
    showPrimeAlert(
      'Confirm shop payment',
      `Pay ${formatAmount(value)} to ${
        selectedMerchant.name
      }? This cannot be undone by the resident.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm payment',
          onPress: async () => {
            setPaying(true);
            try {
              const transaction = await payPrimeCityMerchant({
                merchant_id: selectedMerchant._id,
                amount_mmk: value,
                note: paymentNote.trim(),
                idempotency_key: `wallet-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 12)}`,
              });
              showPrimeAlert(
                'Payment successful',
                `${formatAmount(value)} paid to ${
                  selectedMerchant.name
                }.\nReference: ${transaction.payment_reference}`,
              );
              setPaymentAmount('');
              setPaymentNote('');
              setSelectedMerchant(null);
              await loadWallet(true);
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Payment failed',
                  err.message || 'Please try again.',
                );
              }
            } finally {
              setPaying(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="My Wallet"
      showBottomNav
      themeOverride={theme}
    >
      {loading && !data ? (
        <View style={residentWalletStyles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={residentWalletStyles.container}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadWallet(true)}
              tintColor={theme.primary}
            />
          }
        >
          {error ? (
            <Card
              themeOverride={theme}
              style={[
                residentWalletStyles.errorCard,
                { borderColor: theme.danger },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={theme.danger}
              />
              <Text
                style={[residentWalletStyles.errorText, { color: theme.text }]}
              >
                {error}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry loading wallet"
                hitSlop={8}
                onPress={() => loadWallet()}
                style={residentWalletStyles.retryButton}
              >
                <Text
                  style={[
                    residentWalletStyles.retryText,
                    { color: theme.primary },
                  ]}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </Card>
          ) : null}

          <View
            accessible
            accessibilityLabel={`RFID access and wallet. ${
              card?.masked_uid || 'No card assigned'
            }. Status ${String(card?.status || 'unassigned').toUpperCase()}.`}
            style={[
              residentWalletStyles.digitalCard,
              { shadowColor: theme.shadow },
            ]}
          >
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={residentWalletStyles.rfidDecoration}
            >
              <View
                style={[
                  residentWalletStyles.rfidWave,
                  residentWalletStyles.rfidWaveOne,
                ]}
              />
              <View
                style={[
                  residentWalletStyles.rfidWave,
                  residentWalletStyles.rfidWaveTwo,
                ]}
              />
              <View
                style={[
                  residentWalletStyles.rfidWave,
                  residentWalletStyles.rfidWaveThree,
                ]}
              />
              <View style={residentWalletStyles.rfidFineLineOne} />
              <View style={residentWalletStyles.rfidFineLineTwo} />
            </View>

            <View style={residentWalletStyles.cardHeader}>
              <View style={residentWalletStyles.brandLockup}>
                <View style={residentWalletStyles.cardLogoFrame}>
                  <Image
                    accessible={false}
                    source={require('../../assets/app-icon-master.png')}
                    resizeMode="cover"
                    style={residentWalletStyles.cardLogo}
                  />
                </View>
                <View style={residentWalletStyles.cardHeaderCopy}>
                  <Text style={residentWalletStyles.cardEyebrow}>
                    PRIME CITY RESIDENT
                  </Text>
                  <Text style={residentWalletStyles.cardTitle}>
                    RFID Access & Wallet
                  </Text>
                </View>
              </View>
              <View style={residentWalletStyles.rfidIconSurface}>
                <Ionicons name="radio-outline" size={29} color="#0D4F8B" />
              </View>
            </View>

            <View style={residentWalletStyles.cardIdentity}>
              <Text style={residentWalletStyles.cardNumber}>
                {card?.masked_uid || 'No card assigned'}
              </Text>
            </View>

            <View style={residentWalletStyles.cardFooter}>
              <View
                style={[
                  residentWalletStyles.cardStatusBadge,
                  activeCard
                    ? residentWalletStyles.cardStatusBadgeActive
                    : residentWalletStyles.cardStatusBadgeInactive,
                ]}
              >
                <Ionicons
                  name={
                    activeCard
                      ? 'checkmark-circle'
                      : 'information-circle-outline'
                  }
                  size={17}
                  color={activeCard ? '#076157' : '#A35E00'}
                />
                <Text
                  style={[
                    residentWalletStyles.cardStatus,
                    activeCard
                      ? residentWalletStyles.cardStatusActive
                      : residentWalletStyles.cardStatusInactive,
                  ]}
                >
                  {String(card?.status || 'unassigned').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          <Card
            themeOverride={theme}
            style={[
              residentWalletStyles.sectionCard,
              { borderColor: theme.border },
            ]}
          >
            <View style={residentWalletStyles.balanceHeader}>
              <View style={residentWalletStyles.balanceCopy}>
                <Text
                  style={[
                    residentWalletStyles.sectionLabel,
                    { color: theme.subtext },
                  ]}
                >
                  MY WALLET BALANCE
                </Text>
                <Text
                  accessibilityLabel={`Wallet balance ${formatAmount(
                    wallet?.balance_mmk,
                  )}`}
                  style={[residentWalletStyles.balance, { color: theme.text }]}
                >
                  {formatAmount(wallet?.balance_mmk)}
                </Text>
              </View>
              <View
                style={[
                  residentWalletStyles.goldIconSurface,
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
            </View>
            <View
              style={[
                residentWalletStyles.infoBox,
                {
                  backgroundColor: theme.primaryBg,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={19}
                color={theme.primary}
              />
              <Text
                style={[residentWalletStyles.infoText, { color: theme.text }]}
              >
                Wallet credits are added by authorized Admin/Staff only. Every
                payment is recorded in your private transaction history.
              </Text>
            </View>
          </Card>

          <Text style={[residentWalletStyles.heading, { color: theme.text }]}>
            Pay at Prime City
          </Text>
          <Card
            themeOverride={theme}
            style={[
              residentWalletStyles.sectionCard,
              { borderColor: theme.border },
            ]}
          >
            <Text
              style={[
                residentWalletStyles.paymentIntro,
                { color: theme.subtext },
              ]}
            >
              Choose an approved shop and confirm the exact amount shown by the
              merchant. Every payment creates a private receipt.
            </Text>
            <Text
              style={[residentWalletStyles.formLabel, { color: theme.subtext }]}
            >
              Shop
            </Text>
            <View style={residentWalletStyles.merchantList}>
              {merchants.length ? (
                merchants.map(merchant => {
                  const selected = selectedMerchant?._id === merchant._id;
                  return (
                    <TouchableOpacity
                      key={merchant._id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${merchant.name}, ${
                        merchant.location || 'Prime City'
                      }, ${merchant.merchant_code}`}
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedMerchant(merchant)}
                      style={[
                        residentWalletStyles.merchantOption,
                        {
                          borderColor: selected ? theme.primary : theme.border,
                          backgroundColor: selected
                            ? theme.primaryBg
                            : theme.card,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selected ? 'checkmark-circle' : 'storefront-outline'
                        }
                        size={21}
                        color={selected ? theme.primary : theme.inactive}
                      />
                      <View style={residentWalletStyles.merchantCopy}>
                        <Text
                          style={[
                            residentWalletStyles.merchantName,
                            { color: theme.text },
                          ]}
                        >
                          {merchant.name}
                        </Text>
                        <Text
                          style={[
                            residentWalletStyles.merchantMeta,
                            { color: theme.subtext },
                          ]}
                        >
                          {merchant.location || 'Prime City'} ·{' '}
                          {merchant.merchant_code}
                        </Text>
                      </View>
                      <View
                        style={[
                          residentWalletStyles.selectionRing,
                          {
                            borderColor: selected
                              ? theme.primary
                              : theme.inactive,
                          },
                          selected && { backgroundColor: theme.primary },
                        ]}
                      >
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={13}
                            color={theme.primaryText}
                          />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View
                  style={[
                    residentWalletStyles.inlineEmpty,
                    { borderColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={22}
                    color={theme.inactive}
                  />
                  <Text
                    style={[
                      residentWalletStyles.emptyText,
                      { color: theme.subtext },
                    ]}
                  >
                    No approved shops are available yet.
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[residentWalletStyles.formLabel, { color: theme.subtext }]}
            >
              Exact amount (MMK)
            </Text>
            <TextInput
              accessibilityLabel="Exact amount in MMK"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="number-pad"
              placeholder="Enter exact purchase amount"
              placeholderTextColor={theme.inactive}
              style={[
                residentWalletStyles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                },
              ]}
            />
            <Text
              style={[residentWalletStyles.formLabel, { color: theme.subtext }]}
            >
              Note (optional)
            </Text>
            <TextInput
              accessibilityLabel="Payment note, optional"
              value={paymentNote}
              onChangeText={setPaymentNote}
              maxLength={160}
              placeholder="Order or counter reference"
              placeholderTextColor={theme.inactive}
              style={[
                residentWalletStyles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                },
              ]}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Confirm shop payment"
              accessibilityState={{
                disabled: paying || !activeCard,
                busy: paying,
              }}
              onPress={submitPayment}
              disabled={paying || !activeCard}
              style={[
                residentWalletStyles.paymentButton,
                {
                  backgroundColor: theme.primary,
                  shadowColor: theme.shadow,
                },
                (paying || !activeCard) && [
                  residentWalletStyles.paymentButtonDisabled,
                  {
                    backgroundColor: theme.primaryBg,
                    borderColor: theme.goldBorder,
                  },
                ],
              ]}
            >
              {paying ? (
                <ActivityIndicator
                  color={
                    paying || !activeCard ? theme.primary : theme.primaryText
                  }
                />
              ) : (
                <>
                  <Ionicons
                    name="wallet-outline"
                    size={19}
                    color={activeCard ? theme.primaryText : theme.inactive}
                  />
                  <Text
                    style={[
                      residentWalletStyles.paymentButtonText,
                      {
                        color: activeCard ? theme.primaryText : theme.inactive,
                      },
                    ]}
                  >
                    Confirm shop payment
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Card>

          <Text style={[residentWalletStyles.heading, { color: theme.text }]}>
            Recent transactions
          </Text>
          {(data?.transactions || []).length ? (
            data.transactions.map(item => (
              <Card
                key={item._id}
                themeOverride={theme}
                style={[
                  residentWalletStyles.transactionCard,
                  { borderColor: theme.border },
                ]}
              >
                <View style={residentWalletStyles.transactionRow}>
                  <View
                    style={[
                      residentWalletStyles.transactionIcon,
                      {
                        backgroundColor:
                          item.type === 'Payment'
                            ? theme.warningBg
                            : theme.successBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.type === 'Payment'
                          ? 'arrow-up-outline'
                          : 'arrow-down-outline'
                      }
                      size={19}
                      color={
                        item.type === 'Payment' ? theme.warning : theme.success
                      }
                    />
                  </View>
                  <View style={residentWalletStyles.transactionCopy}>
                    <View style={residentWalletStyles.transactionTitleRow}>
                      <Text
                        style={[
                          residentWalletStyles.transactionTitle,
                          { color: theme.text },
                        ]}
                      >
                        {item.description}
                      </Text>
                      <Text
                        style={[
                          residentWalletStyles.transactionAmount,
                          {
                            color:
                              item.type === 'Payment'
                                ? theme.warning
                                : theme.success,
                          },
                        ]}
                      >
                        {item.type === 'Payment' ? '-' : '+'}
                        {formatAmount(item.amount_mmk)}
                      </Text>
                    </View>
                    {item.merchant_id?.name ? (
                      <Text
                        style={[
                          residentWalletStyles.transactionMeta,
                          { color: theme.subtext },
                        ]}
                      >
                        {item.merchant_id.name} ·{' '}
                        {item.payment_reference || 'Receipt recorded'}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        residentWalletStyles.transactionMeta,
                        { color: theme.subtext },
                      ]}
                    >
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Card
              themeOverride={theme}
              style={[
                residentWalletStyles.transactionEmptyCard,
                { borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  residentWalletStyles.emptyIconSurface,
                  {
                    backgroundColor: theme.primaryBg,
                    borderColor: theme.goldBorder,
                  },
                ]}
              >
                <Ionicons
                  name="receipt-outline"
                  size={25}
                  color={theme.primary}
                />
              </View>
              <Text
                style={[
                  residentWalletStyles.emptyText,
                  { color: theme.subtext },
                ]}
              >
                No RFID wallet transactions yet.
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

function AdminRfidWalletScreen({ navigation }) {
  const { theme } = useTheme();
  const [residents, setResidents] = useState([]);
  const [selectedResident, setSelectedResident] = useState(null);
  const [search, setSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('RFID wallet top-up');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [merchantName, setMerchantName] = useState('');
  const [merchantLocation, setMerchantLocation] = useState('');
  const [creatingMerchant, setCreatingMerchant] = useState(false);
  const [settlementMerchant, setSettlementMerchant] = useState(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementReference, setSettlementReference] = useState('');
  const [settling, setSettling] = useState(false);
  const [merchantLedger, setMerchantLedger] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [residentData, merchantData] = await Promise.all([
        fetchResidentsForNotifications(),
        fetchPrimeCityMerchants(),
      ]);
      setResidents(residentData);
      setMerchants(merchantData);
    } catch (err) {
      if (!err.sessionExpired) {
        setError(err.message || 'Unable to load residents');
      }
    } finally {
      setLoading(false);
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
    return residents.filter(resident =>
      [resident.fullname, resident.email, resident.phone, resident.room_number]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [residents, search]);

  const submitCredit = async () => {
    const creditAmount = Number(amount);
    if (!selectedResident?._id) {
      showPrimeAlert(
        'Select resident',
        'Choose one resident for this wallet credit.',
      );
      return;
    }
    if (!Number.isInteger(creditAmount) || creditAmount <= 0) {
      showPrimeAlert('Invalid amount', 'Enter a positive whole MMK amount.');
      return;
    }
    if (!description.trim()) {
      showPrimeAlert(
        'Description required',
        'Enter the reason for this wallet credit.',
      );
      return;
    }

    showPrimeAlert(
      'Confirm RFID wallet credit',
      `Add ${formatAmount(creditAmount)} to ${selectedResident.fullname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add credit',
          onPress: async () => {
            setSubmitting(true);
            try {
              const result = await creditRfidWallet({
                resident_id: selectedResident._id,
                amount_mmk: creditAmount,
                description: description.trim(),
              });
              showPrimeAlert(
                'Wallet updated',
                `New balance: ${formatAmount(result.balance_mmk)}`,
              );
              setAmount('');
              setDescription('RFID wallet top-up');
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Unable to add credit',
                  err.message || 'Please try again.',
                );
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const submitMerchant = async () => {
    if (!merchantName.trim() || !merchantLocation.trim()) {
      showPrimeAlert(
        'Shop details required',
        'Enter the shop name and Prime City location.',
      );
      return;
    }
    setCreatingMerchant(true);
    try {
      await createPrimeCityMerchant({
        name: merchantName.trim(),
        location: merchantLocation.trim(),
      });
      setMerchantName('');
      setMerchantLocation('');
      await loadResidents();
      showPrimeAlert(
        'Shop created',
        'Residents can now select this approved Prime City shop.',
      );
    } catch (err) {
      if (!err.sessionExpired)
        showPrimeAlert('Unable to create shop', err.message);
    } finally {
      setCreatingMerchant(false);
    }
  };

  const submitSettlement = async () => {
    const value = Number(settlementAmount);
    if (
      !settlementMerchant?._id ||
      !Number.isInteger(value) ||
      value <= 0 ||
      !settlementReference.trim()
    ) {
      showPrimeAlert(
        'Settlement details required',
        'Choose a shop, enter a whole MMK amount, and add the external settlement reference.',
      );
      return;
    }
    if (value > Number(settlementMerchant.wallet_balance_mmk || 0)) {
      showPrimeAlert(
        'Invalid amount',
        'Settlement cannot exceed the shop wallet balance.',
      );
      return;
    }
    showPrimeAlert(
      'Confirm settlement',
      `Record ${formatAmount(value)} settled to ${settlementMerchant.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record settlement',
          onPress: async () => {
            setSettling(true);
            try {
              await settlePrimeCityMerchant(settlementMerchant._id, {
                amount_mmk: value,
                reference: settlementReference.trim(),
              });
              setSettlementAmount('');
              setSettlementReference('');
              setSettlementMerchant(null);
              await loadResidents();
              showPrimeAlert(
                'Settlement recorded',
                'The merchant ledger and Admin audit log were updated.',
              );
            } catch (err) {
              if (!err.sessionExpired)
                showPrimeAlert('Settlement failed', err.message);
            } finally {
              setSettling(false);
            }
          },
        },
      ],
    );
  };

  const chooseSettlementMerchant = async merchant => {
    setSettlementMerchant(merchant);
    setMerchantLedger(null);
    setLedgerLoading(true);
    try {
      setMerchantLedger(await fetchPrimeCityMerchantLedger(merchant._id));
    } catch (err) {
      if (!err.sessionExpired)
        showPrimeAlert('Unable to load ledger', err.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Wallet & Shops"
      showBottomNav
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={[styles.heading, { color: theme.text }]}>
            Credit resident wallet
          </Text>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            Only residents with an active RFID card can receive wallet credit.
            Each adjustment is recorded in the Admin audit log and resident
            transaction history.
          </Text>

          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Resident
          </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, room, phone, or email"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : error ? (
            <TouchableOpacity onPress={loadResidents} style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color={theme.danger}
              />
              <Text style={[styles.errorText, { color: theme.text }]}>
                {error} · Retry
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView 
              style={styles.residentList}
              contentContainerStyle={styles.residentListContent}
              nestedScrollEnabled={true}
            >
              {filteredResidents.slice(0, 50).map(resident => {
                const selected = selectedResident?._id === resident._id;
                return (
                  <TouchableOpacity
                    key={resident._id}
                    onPress={() => setSelectedResident(resident)}
                    style={[
                      styles.residentOption,
                      {
                        borderColor: selected ? theme.primary : theme.border,
                        backgroundColor: selected
                          ? theme.primaryBg
                          : theme.card,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selected
                          ? 'radio-button-on'
                          : 'radio-button-off-outline'
                      }
                      size={18}
                      color={selected ? theme.primary : theme.inactive}
                    />
                    <View style={styles.residentCopy}>
                      <Text
                        style={[styles.residentName, { color: theme.text }]}
                      >
                        {resident.fullname}
                      </Text>
                      <Text
                        style={[styles.residentMeta, { color: theme.subtext }]}
                      >
                        Room {resident.room_number || 'Unassigned'} ·{' '}
                        {resident.phone || 'No phone'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Amount (MMK)
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Enter exact amount"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={240}
            placeholder="Reason for wallet credit"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={submitCredit}
            disabled={submitting}
            style={[
              styles.creditButton,
              { backgroundColor: theme.primary },
              submitting && styles.disabled,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <>
                <Ionicons
                  name="add-circle-outline"
                  size={19}
                  color={theme.primaryText}
                />
                <Text style={[styles.creditText, { color: theme.primaryText }]}>
                  Add RFID wallet credit
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        <Card>
          <Text style={[styles.heading, { color: theme.text }]}>
            Prime City shops
          </Text>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            Only approved shops below are visible in resident wallets. Shop
            balances are ledger balances; external cash settlement must be
            recorded with a verifiable reference.
          </Text>
          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            New shop name
          </Text>
          <TextInput
            value={merchantName}
            onChangeText={setMerchantName}
            placeholder="Example: Prime City Café"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Location
          </Text>
          <TextInput
            value={merchantLocation}
            onChangeText={setMerchantLocation}
            placeholder="Example: Ground floor, Block A"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={submitMerchant}
            disabled={creatingMerchant}
            style={[
              styles.secondaryButton,
              { borderColor: theme.primary },
              creatingMerchant && styles.disabled,
            ]}
          >
            {creatingMerchant ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Ionicons
                  name="storefront-outline"
                  size={19}
                  color={theme.primary}
                />
                <Text
                  style={[styles.secondaryButtonText, { color: theme.primary }]}
                >
                  Create approved shop
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Merchant ledger
          </Text>
          <View style={styles.merchantList}>
            {merchants.map(merchant => {
              const selected = settlementMerchant?._id === merchant._id;
              return (
                <TouchableOpacity
                  key={merchant._id}
                  onPress={() => chooseSettlementMerchant(merchant)}
                  style={[
                    styles.merchantOption,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? theme.primaryBg : theme.card,
                    },
                  ]}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'storefront-outline'}
                    size={19}
                    color={selected ? theme.primary : theme.inactive}
                  />
                  <View style={styles.transactionCopy}>
                    <Text style={[styles.residentName, { color: theme.text }]}>
                      {merchant.name}
                    </Text>
                    <Text
                      style={[styles.residentMeta, { color: theme.subtext }]}
                    >
                      {merchant.location} · {merchant.merchant_code}
                    </Text>
                    <Text
                      style={[styles.merchantBalance, { color: theme.text }]}
                    >
                      Available to settle:{' '}
                      {formatAmount(merchant.wallet_balance_mmk)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {ledgerLoading ? (
            <ActivityIndicator
              color={theme.primary}
              style={styles.ledgerLoading}
            />
          ) : merchantLedger ? (
            <View style={[styles.ledgerPanel, { borderColor: theme.border }]}>
              <Text style={[styles.residentName, { color: theme.text }]}>
                Recent shop receipts
              </Text>
              {(merchantLedger.payments || []).slice(0, 10).map(payment => (
                <View
                  key={payment._id}
                  style={[
                    styles.ledgerRow,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <View style={styles.transactionCopy}>
                    <Text
                      style={[styles.transactionTitle, { color: theme.text }]}
                    >
                      {payment.user_id?.fullname || 'Resident purchase'}
                    </Text>
                    <Text
                      style={[styles.transactionMeta, { color: theme.subtext }]}
                    >
                      {payment.payment_reference} ·{' '}
                      {formatDate(payment.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.transactionAmount, { color: theme.success }]}
                  >
                    {formatAmount(payment.amount_mmk)}
                  </Text>
                </View>
              ))}
              {!(merchantLedger.payments || []).length ? (
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  No shop payments recorded.
                </Text>
              ) : null}
            </View>
          ) : null}
          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            Settlement amount (MMK)
          </Text>
          <TextInput
            value={settlementAmount}
            onChangeText={setSettlementAmount}
            keyboardType="number-pad"
            placeholder="Exact amount transferred externally"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <Text style={[styles.formLabel, { color: theme.subtext }]}>
            External reference
          </Text>
          <TextInput
            value={settlementReference}
            onChangeText={setSettlementReference}
            placeholder="Bank/KPay transfer reference"
            placeholderTextColor={theme.inactive}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
          />
          <TouchableOpacity
            onPress={submitSettlement}
            disabled={settling}
            style={[
              styles.secondaryButton,
              { borderColor: theme.primary },
              settling && styles.disabled,
            ]}
          >
            {settling ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Text
                style={[styles.secondaryButtonText, { color: theme.primary }]}
              >
                Record merchant settlement
              </Text>
            )}
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

export default function RfidCardScreen({ navigation }) {
  const { user } = useAuth();
  return ['Admin', 'Staff'].includes(user?.role) ? (
    <AdminRfidWalletScreen navigation={navigation} />
  ) : (
    <ResidentRfidCardScreen navigation={navigation} />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, fontSize: 13 },
  retryText: { fontSize: 13, fontWeight: '700' },
  digitalCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    marginBottom: 16,
    minHeight: 190,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { fontSize: 19, fontWeight: '800', marginTop: 5 },
  cardNumber: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 42,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  cardStatus: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  balance: { fontSize: 31, fontWeight: '800', marginTop: 8 },
  infoBox: {
    flexDirection: 'row',
    gap: 9,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  heading: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 12 },
  transactionRow: { flexDirection: 'row', alignItems: 'center' },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  transactionCopy: { flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '700' },
  transactionMeta: { fontSize: 12, marginTop: 3 },
  transactionAmount: { fontSize: 13, fontWeight: '800', marginLeft: 8 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 12 },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
  },
  residentList: { maxHeight: 310 },
  residentListContent: { gap: 7 },
  residentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
  },
  residentCopy: { flex: 1 },
  residentName: { fontSize: 14, fontWeight: '700' },
  residentMeta: { fontSize: 12, marginTop: 3 },
  merchantList: { gap: 8, marginTop: 2 },
  merchantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderRadius: 11,
  },
  merchantBalance: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  ledgerLoading: { marginVertical: 14 },
  ledgerPanel: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  creditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 15,
    marginTop: 18,
  },
  creditText: { fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 14,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.65 },
});

const residentWalletStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 42,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 58,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  retryButton: {
    minWidth: 54,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
  digitalCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 226,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#F7FBFF',
    borderWidth: 1,
    borderColor: '#94C7E6',
    borderRadius: 23,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 5,
  },
  rfidDecoration: {
    ...StyleSheet.absoluteFillObject,
  },
  rfidWave: {
    position: 'absolute',
    borderRadius: 180,
    transform: [{ rotate: '-15deg' }],
  },
  rfidWaveOne: {
    width: 430,
    height: 112,
    right: -205,
    top: 44,
    backgroundColor: '#20B7DB',
  },
  rfidWaveTwo: {
    width: 460,
    height: 104,
    right: -185,
    top: 113,
    backgroundColor: '#186FC0',
  },
  rfidWaveThree: {
    width: 430,
    height: 76,
    left: -102,
    bottom: -38,
    backgroundColor: '#0D4F9F',
  },
  rfidFineLineOne: {
    position: 'absolute',
    width: 330,
    height: 1,
    right: -40,
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.52)',
    transform: [{ rotate: '-12deg' }],
  },
  rfidFineLineTwo: {
    position: 'absolute',
    width: 320,
    height: 1,
    right: -38,
    bottom: 50,
    backgroundColor: 'rgba(255,255,255,0.32)',
    transform: [{ rotate: '-12deg' }],
  },
  cardHeader: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  brandLockup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(13, 79, 139, 0.18)',
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  cardLogoFrame: {
    width: 40,
    height: 40,
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(17, 73, 122, 0.24)',
    backgroundColor: '#05080A',
  },
  cardLogo: {
    width: '100%',
    height: '100%',
  },
  cardHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardEyebrow: {
    color: '#0D4F8B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    lineHeight: 14,
  },
  cardTitle: {
    color: '#123A60',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 3,
  },
  rfidIconSurface: {
    width: 43,
    height: 43,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(13, 79, 139, 0.3)',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  cardIdentity: {
    zIndex: 1,
    alignSelf: 'flex-start',
    paddingTop: 32,
    paddingBottom: 18,
    maxWidth: '82%',
  },
  cardNumber: {
    color: '#102F4C',
    backgroundColor: 'rgba(255,255,255,0.84)',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 31,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardFooter: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardStatusBadge: {
    minHeight: 34,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 18,
  },
  cardStatusBadgeActive: {
    backgroundColor: '#E3F6F3',
    borderColor: 'rgba(7, 97, 87, 0.38)',
  },
  cardStatusBadgeInactive: {
    backgroundColor: '#FFF1D4',
    borderColor: 'rgba(163, 94, 0, 0.36)',
  },
  cardStatus: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    lineHeight: 15,
  },
  cardStatusActive: {
    color: '#075A51',
  },
  cardStatusInactive: {
    color: '#8A5000',
  },
  sectionCard: {
    padding: 18,
    borderRadius: 19,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  balanceCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    lineHeight: 16,
  },
  balance: {
    flexShrink: 1,
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 40,
    marginTop: 5,
  },
  goldIconSurface: {
    width: 54,
    height: 54,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 13,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  heading: {
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 27,
    marginTop: 5,
    marginBottom: 12,
  },
  paymentIntro: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  merchantList: {
    gap: 9,
  },
  merchantOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 14,
  },
  merchantCopy: {
    flex: 1,
    minWidth: 0,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  merchantMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  selectionRing: {
    width: 22,
    height: 22,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 11,
    backgroundColor: 'transparent',
  },
  inlineEmpty: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderWidth: 1,
    borderRadius: 14,
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  paymentButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 15,
    marginTop: 20,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  paymentButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  paymentButtonText: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  transactionCard: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 10,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    marginRight: 11,
  },
  transactionCopy: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  transactionTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  transactionMeta: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  transactionAmount: {
    maxWidth: '46%',
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  transactionEmptyCard: {
    minHeight: 138,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 18,
  },
  emptyIconSurface: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
});
