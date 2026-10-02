import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { showPrimeAlert } from '../../services/primeAlert';
import { getProfileTheme } from '../profile/profileTheme';
import {
  createPlaygroundRegistration,
  fetchMyPlaygroundRegistrations,
  fetchPlaygroundConfig,
  updatePlaygroundRegistrationStatus,
} from '../../api/playground';
import {
  buildPlaygroundRegistrationPayload,
  getPlaygroundSlotIcon,
  getPlaygroundStatusTone,
  getPlaygroundValidation,
  normalizePlaygroundSlots,
} from './playgroundUi';

const PAYMENT_METHODS = [
  { label: 'Pay at desk', icon: 'business-outline' },
  { label: 'RFID Wallet', icon: 'wallet-outline' },
];

const WIZARD_STEPS = ['Child', 'Session', 'Review'];

function defaultDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('en-US')} MMK`;
}

function formatRegistrationDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function PlaygroundProgress({ step, theme }) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Playground registration, step ${step} of 3`}
      accessibilityValue={{ min: 1, max: 3, now: step }}
      style={[
        styles.progressCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      {WIZARD_STEPS.map((label, index) => {
        const number = index + 1;
        const completed = number < step;
        const current = number === step;
        return (
          <React.Fragment key={label}>
            {index > 0 ? (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor:
                      number <= step ? theme.primary : theme.border,
                  },
                ]}
              />
            ) : null}
            <View
              accessible
              accessibilityLabel={`${label}, ${
                completed
                  ? 'completed'
                  : current
                  ? 'current step'
                  : 'not completed'
              }`}
              style={styles.progressStep}
            >
              <View
                style={[
                  styles.progressCircle,
                  {
                    backgroundColor: current ? theme.primary : theme.card,
                    borderColor:
                      current || completed ? theme.primary : theme.border,
                  },
                ]}
              >
                {completed ? (
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                ) : (
                  <Text
                    style={[
                      styles.progressNumber,
                      {
                        color: current ? theme.primaryText : theme.subtext,
                      },
                    ]}
                  >
                    {number}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.progressLabel,
                  { color: current ? theme.primary : theme.subtext },
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

function IconInput({
  accessibilityLabel,
  compact,
  icon,
  label,
  style,
  theme,
  ...inputProps
}) {
  return (
    <View
      style={[
        styles.inputShell,
        compact && styles.compactInputShell,
        {
          backgroundColor: theme.input,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={25} color={theme.primary} />
      <View style={styles.inputCopy}>
        <Text style={[styles.inputLabel, { color: theme.subtext }]}>
          {label}
        </Text>
        <TextInput
          accessibilityLabel={accessibilityLabel}
          placeholderTextColor={theme.inactive}
          style={[styles.input, { color: theme.text }]}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function SectionTitle({ children, theme }) {
  return (
    <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>
  );
}

function PrimaryButton({
  accessibilityLabel,
  busy = false,
  children,
  disabled = false,
  icon,
  onPress,
  theme,
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, busy }}
      activeOpacity={0.82}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        { backgroundColor: theme.primary },
        disabled && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={theme.primaryText} />
      ) : (
        <>
          {icon ? (
            <Ionicons name={icon} size={21} color={theme.primaryText} />
          ) : null}
          <Text
            style={[styles.primaryButtonText, { color: theme.primaryText }]}
          >
            {children}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.primaryText} />
        </>
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({ accessibilityLabel, children, onPress, theme }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.82}
      onPress={onPress}
      style={[styles.secondaryButton, { borderColor: theme.goldBorder }]}
    >
      <Ionicons name="arrow-back" size={18} color={theme.primary} />
      <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

function ReviewRow({ icon, label, theme, value }) {
  return (
    <View style={[styles.reviewRow, { borderBottomColor: theme.border }]}>
      <View
        style={[
          styles.reviewIcon,
          { backgroundColor: theme.iconSurface, borderColor: theme.goldBorder },
        ]}
      >
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.reviewCopy}>
        <Text style={[styles.reviewLabel, { color: theme.subtext }]}>
          {label}
        </Text>
        <Text style={[styles.reviewValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function statusColors(theme, status) {
  const tone = getPlaygroundStatusTone(status);
  if (tone === 'success') {
    return { foreground: theme.success, background: theme.successBg };
  }
  if (tone === 'danger') {
    return { foreground: theme.danger, background: theme.dangerBg };
  }
  if (tone === 'warning') {
    return { foreground: theme.warning, background: theme.warningBg };
  }
  if (tone === 'confirmed') {
    return { foreground: theme.primary, background: theme.primaryBg };
  }
  return { foreground: theme.subtext, background: theme.raised };
}

export default function PlaygroundScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isAdmin = ['Admin', 'Staff'].includes(user?.role);
  const compact = width < 380;
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [timeSlot, setTimeSlot] = useState('Morning');
  const [paymentMethod, setPaymentMethod] = useState('Pay at desk');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const submittingRef = useRef(false);

  const slots = useMemo(
    () => normalizePlaygroundSlots(config?.time_slots),
    [config?.time_slots],
  );
  const hasPaidPrice = Boolean(
    config?.pricing_configured && config.discounted_fee_mmk > 0,
  );
  const offerText = useMemo(() => {
    if (!config?.pricing_configured) {
      return 'Fee and resident discount will be confirmed by Admin.';
    }
    if (config.resident_discount_percent > 0) {
      return `${config.resident_discount_percent}% resident-child discount applied`;
    }
    return 'Current resident-child rate';
  }, [config]);

  useEffect(() => {
    setTimeSlot(current => (slots.includes(current) ? current : slots[0]));
  }, [slots]);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextConfig, nextRegistrations] = await Promise.all([
        fetchPlaygroundConfig(),
        fetchMyPlaygroundRegistrations(),
      ]);
      setConfig(nextConfig);
      setRegistrations(
        Array.isArray(nextRegistrations) ? nextRegistrations : [],
      );
    } catch (err) {
      if (!err.sessionExpired) {
        setError(err.message || 'Unable to load playground services');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const validateChildDetails = useCallback(() => {
    const validation = getPlaygroundValidation({
      childName,
      childAge,
      date,
    });
    if (validation) {
      showPrimeAlert(validation.title, validation.message);
      return false;
    }
    return true;
  }, [childAge, childName, date]);

  const continueToSession = () => {
    if (validateChildDetails()) setStep(2);
  };

  const submitRegistration = async () => {
    if (submittingRef.current || !validateChildDetails()) return;

    submittingRef.current = true;
    setSubmitting(true);
    try {
      await createPlaygroundRegistration(
        buildPlaygroundRegistrationPayload({
          childName,
          childAge,
          date,
          timeSlot,
          paymentMethod,
          hasPaidPrice,
          notes,
        }),
      );
      setChildName('');
      setChildAge('');
      setNotes('');
      setDate(defaultDate());
      setStep(1);
      await loadData(true);
      showPrimeAlert(
        'Registration submitted',
        'Admin can now review the playground booking.',
      );
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to register',
          err.message || 'Please try again.',
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const updateStatus = (registration, status) => {
    showPrimeAlert(
      `${status} registration`,
      `Set ${registration.child_name}'s registration to ${status}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status,
          style: status === 'Cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingId(registration._id);
            try {
              await updatePlaygroundRegistrationStatus(
                registration._id,
                status,
              );
              await loadData(true);
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Unable to update registration',
                  err.message || 'Please try again.',
                );
              }
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const renderChildStep = () => (
    <>
      <SectionTitle theme={theme}>Child details</SectionTitle>
      <IconInput
        accessibilityLabel="Child name"
        icon="person-outline"
        label="Child name"
        onChangeText={setChildName}
        placeholder="Enter full name"
        theme={theme}
        value={childName}
      />
      <View style={[styles.inputRow, compact && styles.compactInputRow]}>
        <IconInput
          accessibilityLabel="Child age"
          compact={!compact}
          icon="body-outline"
          keyboardType="number-pad"
          label="Age"
          maxLength={2}
          onChangeText={setChildAge}
          placeholder="1–17"
          theme={theme}
          value={childAge}
        />
        <IconInput
          accessibilityLabel="Requested date"
          compact={!compact}
          icon="calendar-outline"
          label="Visit date (YYYY-MM-DD)"
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          theme={theme}
          value={date}
        />
      </View>
      <PrimaryButton
        accessibilityLabel="Continue to session"
        icon="calendar-outline"
        onPress={continueToSession}
        theme={theme}
      >
        Continue to session
      </PrimaryButton>
    </>
  );

  const renderSessionStep = () => (
    <>
      <SectionTitle theme={theme}>Choose a session</SectionTitle>
      <View style={styles.sessionGrid}>
        {slots.map(slot => {
          const selected = slot === timeSlot;
          return (
            <TouchableOpacity
              key={slot}
              accessibilityRole="radio"
              accessibilityLabel={`Session ${slot}`}
              accessibilityState={{ selected }}
              activeOpacity={0.82}
              onPress={() => setTimeSlot(slot)}
              style={[
                styles.sessionCard,
                compact && styles.compactSessionCard,
                {
                  backgroundColor: selected ? theme.primaryBg : theme.card,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
            >
              {selected ? (
                <View
                  style={[
                    styles.selectedMark,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.primaryText}
                  />
                </View>
              ) : null}
              <Ionicons
                name={getPlaygroundSlotIcon(slot)}
                size={32}
                color={selected ? theme.primary : theme.icon}
              />
              <Text
                style={[
                  styles.sessionLabel,
                  { color: selected ? theme.primary : theme.text },
                ]}
              >
                {slot}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hasPaidPrice ? (
        <>
          <SectionTitle theme={theme}>Payment method</SectionTitle>
          <View style={[styles.paymentGrid, compact && styles.compactInputRow]}>
            {PAYMENT_METHODS.map(method => {
              const selected = method.label === paymentMethod;
              return (
                <TouchableOpacity
                  key={method.label}
                  accessibilityRole="radio"
                  accessibilityLabel={method.label}
                  accessibilityState={{ selected }}
                  activeOpacity={0.82}
                  onPress={() => setPaymentMethod(method.label)}
                  style={[
                    styles.paymentOption,
                    {
                      backgroundColor: selected ? theme.primaryBg : theme.card,
                      borderColor: selected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={method.icon}
                    size={22}
                    color={selected ? theme.primary : theme.icon}
                  />
                  <Text style={[styles.paymentText, { color: theme.text }]}>
                    {method.label}
                  </Text>
                  <Ionicons
                    name={
                      selected ? 'radio-button-on' : 'radio-button-off-outline'
                    }
                    size={19}
                    color={selected ? theme.primary : theme.inactive}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <SectionTitle theme={theme}>Notes (optional)</SectionTitle>
      <View
        style={[
          styles.notesShell,
          { backgroundColor: theme.input, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="document-text-outline"
          size={23}
          color={theme.primary}
        />
        <TextInput
          accessibilityLabel="Playground notes"
          maxLength={500}
          multiline
          onChangeText={setNotes}
          placeholder="Allergies, support needs, or pickup notes"
          placeholderTextColor={theme.inactive}
          style={[styles.notesInput, { color: theme.text }]}
          textAlignVertical="top"
          value={notes}
        />
      </View>
      <Text style={[styles.characterCount, { color: theme.subtext }]}>
        {notes.length}/500
      </Text>
      <View style={[styles.buttonRow, compact && styles.compactInputRow]}>
        <SecondaryButton
          accessibilityLabel="Back to child details"
          onPress={() => setStep(1)}
          theme={theme}
        >
          Back
        </SecondaryButton>
        <View style={styles.primaryButtonWrap}>
          <PrimaryButton
            accessibilityLabel="Continue to review"
            onPress={() => setStep(3)}
            theme={theme}
          >
            Continue to review
          </PrimaryButton>
        </View>
      </View>
    </>
  );

  const renderReviewStep = () => (
    <>
      <View style={styles.reviewTitleRow}>
        <SectionTitle theme={theme}>Review registration</SectionTitle>
        <Ionicons
          name="shield-checkmark-outline"
          size={25}
          color={theme.primary}
        />
      </View>
      <Card style={styles.reviewCard} themeOverride={theme}>
        <ReviewRow
          icon="person-outline"
          label="Child"
          theme={theme}
          value={`${childName.trim()} · Age ${Number(childAge)}`}
        />
        <ReviewRow
          icon="calendar-outline"
          label="Requested date"
          theme={theme}
          value={date.trim()}
        />
        <ReviewRow
          icon={getPlaygroundSlotIcon(timeSlot)}
          label="Session"
          theme={theme}
          value={timeSlot}
        />
        {hasPaidPrice ? (
          <ReviewRow
            icon="wallet-outline"
            label="Payment method"
            theme={theme}
            value={paymentMethod}
          />
        ) : null}
        <ReviewRow
          icon="cash-outline"
          label="Resident price"
          theme={theme}
          value={
            config?.pricing_configured
              ? formatAmount(config.discounted_fee_mmk)
              : 'Admin confirmation'
          }
        />
        {notes.trim() ? (
          <ReviewRow
            icon="document-text-outline"
            label="Notes"
            theme={theme}
            value={notes.trim()}
          />
        ) : null}
      </Card>
      <View style={[styles.editRow, compact && styles.compactInputRow]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit child details"
          onPress={() => setStep(1)}
          style={[styles.editButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="create-outline" size={18} color={theme.primary} />
          <Text style={[styles.editText, { color: theme.primary }]}>
            Edit child
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit session details"
          onPress={() => setStep(2)}
          style={[styles.editButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="create-outline" size={18} color={theme.primary} />
          <Text style={[styles.editText, { color: theme.primary }]}>
            Edit session
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.buttonRow, compact && styles.compactInputRow]}>
        <SecondaryButton
          accessibilityLabel="Back to session details"
          onPress={() => setStep(2)}
          theme={theme}
        >
          Back
        </SecondaryButton>
        <View style={styles.primaryButtonWrap}>
          <PrimaryButton
            accessibilityLabel="Submit registration"
            busy={submitting}
            disabled={submitting}
            icon="checkmark-circle-outline"
            onPress={submitRegistration}
            theme={theme}
          >
            Submit registration
          </PrimaryButton>
        </View>
      </View>
    </>
  );

  const renderRegistration = item => {
    const colors = statusColors(theme, item.status);
    const updating = updatingId === item._id;
    return (
      <Card
        key={item._id}
        style={styles.registrationCard}
        themeOverride={theme}
      >
        <View style={styles.registrationHeader}>
          <View style={styles.registrationCopy}>
            <Text style={[styles.registrationName, { color: theme.text }]}>
              {item.child_name}
            </Text>
            {isAdmin ? (
              <Text style={[styles.registrationMeta, { color: theme.subtext }]}>
                {item.user_id?.fullname || 'Resident'} · Room{' '}
                {item.room_id?.room_name || 'Unknown'}
              </Text>
            ) : null}
            <Text style={[styles.registrationMeta, { color: theme.subtext }]}>
              Age {item.child_age} ·{' '}
              {formatRegistrationDate(item.requested_date)} · {item.time_slot}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: colors.background }]}
          >
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.registrationDivider,
            { backgroundColor: theme.border },
          ]}
        />
        <View style={styles.registrationDetailRow}>
          <Ionicons name="wallet-outline" size={17} color={theme.primary} />
          <Text style={[styles.registrationMeta, { color: theme.subtext }]}>
            Payment: {item.payment_status} · {item.payment_method}
          </Text>
        </View>
        <View style={styles.registrationDetailRow}>
          <Ionicons name="cash-outline" size={17} color={theme.primary} />
          <Text style={[styles.registrationMeta, { color: theme.subtext }]}>
            {item.pricing_status === 'Final'
              ? `Resident price: ${formatAmount(item.amount_due_mmk)}`
              : 'Price: Admin confirmation'}
          </Text>
        </View>
        {item.notes ? (
          <View style={styles.registrationDetailRow}>
            <Ionicons
              name="document-text-outline"
              size={17}
              color={theme.primary}
            />
            <Text style={[styles.registrationNote, { color: theme.text }]}>
              {item.notes}
            </Text>
          </View>
        ) : null}
        {isAdmin && !['Completed', 'Cancelled'].includes(item.status) ? (
          <View style={styles.adminActions}>
            {['Confirmed', 'Waitlisted', 'Completed', 'Cancelled'].map(
              status => (
                <TouchableOpacity
                  key={status}
                  accessibilityRole="button"
                  accessibilityLabel={`Set ${item.child_name} to ${status}`}
                  accessibilityState={{ disabled: updating }}
                  disabled={updating}
                  onPress={() => updateStatus(item, status)}
                  style={[
                    styles.adminAction,
                    {
                      borderColor:
                        status === 'Cancelled'
                          ? theme.danger
                          : theme.goldBorder,
                    },
                    updating && styles.disabled,
                  ]}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.adminActionText,
                        {
                          color:
                            status === 'Cancelled' ? theme.danger : theme.text,
                        },
                      ]}
                    >
                      {status}
                    </Text>
                  )}
                </TouchableOpacity>
              ),
            )}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ScreenContainer
      navigation={navigation}
      showBottomNav
      themeOverride={theme}
      title="Playground"
      topBarVariant="stack"
    >
      {loading && !config ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              onRefresh={() => loadData(true)}
              refreshing={refreshing}
              tintColor={theme.primary}
            />
          }
        >
          {!isAdmin ? (
            <View style={styles.intro}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                RESIDENT AMENITIES
              </Text>
              <Text style={[styles.title, { color: theme.text }]}>
                Playground
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Register a child for a supervised session.
              </Text>
            </View>
          ) : null}

          {error ? (
            <Card
              style={[styles.errorCard, { borderColor: theme.danger }]}
              themeOverride={theme}
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={theme.danger}
              />
              <Text style={[styles.errorText, { color: theme.text }]}>
                {error}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Retry playground"
                onPress={() => loadData()}
                style={[styles.retryButton, { borderColor: theme.danger }]}
              >
                <Text style={[styles.retryText, { color: theme.danger }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </Card>
          ) : null}

          {!isAdmin ? (
            <>
              <Card
                style={[styles.offerCard, { borderColor: theme.goldBorder }]}
                themeOverride={theme}
              >
                <View
                  style={[
                    styles.offerAccent,
                    { backgroundColor: theme.primary },
                  ]}
                />
                <View
                  style={[
                    styles.offerIcon,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="football-outline"
                    size={29}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.offerCopy}>
                  <Text style={[styles.offerTitle, { color: theme.text }]}>
                    Resident children offer
                  </Text>
                  <Text style={[styles.offerText, { color: theme.subtext }]}>
                    {offerText}
                  </Text>
                  {config?.pricing_configured ? (
                    <Text style={[styles.offerPrice, { color: theme.primary }]}>
                      {formatAmount(config.discounted_fee_mmk)} per session
                    </Text>
                  ) : null}
                </View>
              </Card>

              <PlaygroundProgress step={step} theme={theme} />
              {step === 1 ? renderChildStep() : null}
              {step === 2 ? renderSessionStep() : null}
              {step === 3 ? renderReviewStep() : null}
            </>
          ) : null}

          <SectionTitle theme={theme}>
            {isAdmin ? 'Resident registrations' : 'My registrations'}
          </SectionTitle>
          {registrations.length ? (
            registrations.map(renderRegistration)
          ) : (
            <Card themeOverride={theme}>
              <Text style={[styles.emptyText, { color: theme.subtext }]}>
                {isAdmin
                  ? 'No resident registrations yet.'
                  : 'No playground registrations yet.'}
              </Text>
            </Card>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 44 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { marginBottom: 20 },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 36, fontWeight: '800', marginTop: 6 },
  subtitle: { fontSize: 16, lineHeight: 23, marginTop: 5 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 13, fontWeight: '800' },
  offerCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingLeft: 25,
  },
  offerAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  offerIcon: {
    width: 58,
    height: 58,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  offerCopy: { flex: 1 },
  offerTitle: { fontSize: 16, fontWeight: '800' },
  offerText: { fontSize: 13, lineHeight: 20, marginTop: 4 },
  offerPrice: { fontSize: 14, fontWeight: '800', marginTop: 5 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 76,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 24,
  },
  progressStep: { alignItems: 'center', flexShrink: 0 },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: { fontSize: 14, fontWeight: '800' },
  progressLabel: { fontSize: 12, fontWeight: '700', marginTop: 5 },
  progressLine: { height: 1, flex: 1, minWidth: 8, marginHorizontal: 7 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 12,
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  compactInputRow: { flexDirection: 'column' },
  inputShell: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  compactInputShell: { flex: 1 },
  inputCopy: { flex: 1, minWidth: 0 },
  inputLabel: { fontSize: 12, lineHeight: 18 },
  input: {
    fontSize: 16,
    paddingVertical: 7,
    paddingHorizontal: 0,
    minHeight: 38,
  },
  sessionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  sessionCard: {
    width: '31%',
    minWidth: 94,
    minHeight: 128,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  compactSessionCard: { width: '48%', flexGrow: 1 },
  selectedMark: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  paymentGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  paymentOption: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
  },
  paymentText: { flex: 1, fontSize: 14, fontWeight: '700' },
  notesShell: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  notesInput: {
    flex: 1,
    minHeight: 80,
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
  },
  characterCount: { fontSize: 12, textAlign: 'right', marginTop: 5 },
  primaryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 13,
    paddingHorizontal: 17,
    marginTop: 14,
  },
  primaryButtonText: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 56,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '800' },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 20,
  },
  primaryButtonWrap: { flex: 1 },
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCard: { paddingVertical: 2 },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    borderBottomWidth: 1,
  },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewCopy: { flex: 1, paddingVertical: 11 },
  reviewLabel: { fontSize: 12, lineHeight: 18 },
  reviewValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  editRow: { flexDirection: 'row', gap: 10 },
  editButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
  },
  editText: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  registrationCard: { padding: 16 },
  registrationHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  registrationCopy: { flex: 1, minWidth: 0 },
  registrationName: { fontSize: 17, lineHeight: 24, fontWeight: '800' },
  registrationMeta: { flexShrink: 1, fontSize: 13, lineHeight: 20 },
  statusBadge: {
    maxWidth: '42%',
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  registrationDivider: { height: 1, marginVertical: 11 },
  registrationDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  registrationNote: { flex: 1, fontSize: 13, lineHeight: 21 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 12 },
  adminActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  adminAction: {
    minWidth: 82,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionText: { fontSize: 12, fontWeight: '700' },
});
