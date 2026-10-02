import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import ScreenContainer from '../../components/ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getProfileTheme } from '../profile/profileTheme';
import {
  registerVisitor,
  splitFullName,
  VISITOR_PURPOSES,
} from '../../api/visitors';

const PURPOSE_ICONS = {
  Meeting: 'people-outline',
  Interview: 'briefcase-outline',
  Delivery: 'cube-outline',
  Event: 'calendar-outline',
  Tour: 'map-outline',
  Service: 'construct-outline',
  General: 'chatbubble-ellipses-outline',
  Other: 'ellipsis-horizontal-circle-outline',
};

function localDateString() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function getVisitorIdentityValidation({ name, email, phone, host }) {
  const { firstName } = splitFullName(name);

  if (!firstName || !email.trim() || !phone.trim() || !host.trim()) {
    return {
      title: 'Missing fields',
      message: 'Please fill in visitor name, email, phone, and host.',
    };
  }

  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    return {
      title: 'Invalid email',
      message: 'Please enter a valid email address.',
    };
  }

  return null;
}

export function getVisitDetailsValidation({ agreedToTerms, visitDate }) {
  if (!agreedToTerms) {
    return {
      title: 'Terms required',
      message: 'You must agree to the visitor terms before registering.',
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return {
      title: 'Invalid visit date',
      message: 'Use YYYY-MM-DD format.',
    };
  }

  return null;
}

export function buildVisitorRegistrationPayload({
  name,
  email,
  phone,
  host,
  purpose,
  purposeDetail,
  visitDate,
}) {
  const { firstName, lastName } = splitFullName(name);

  return {
    firstName,
    lastName,
    email: email.trim(),
    phone: phone.trim(),
    hostName: host.trim(),
    purpose,
    purposeDetail: purposeDetail.trim(),
    visitDate,
    agreedToTerms: true,
  };
}

function InputField({ label, icon, theme, ...props }) {
  const [focused, setFocused] = useState(false);
  const { onFocus, onBlur, ...inputProps } = props;

  return (
    <View
      style={[
        styles.inputCard,
        {
          backgroundColor: theme.input,
          borderColor: focused ? theme.primary : theme.border,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={25}
        color={theme.primary}
        style={styles.inputIcon}
      />
      <View style={styles.inputCopy}>
        <Text style={[styles.inputLabel, { color: theme.subtext }]}>
          {label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, { color: theme.text }]}
          placeholderTextColor={theme.inactive}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
      </View>
    </View>
  );
}

function StepProgress({ currentStep, theme }) {
  const secondStepActive = currentStep === 2;

  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Visitor registration progress"
      accessibilityValue={{
        min: 1,
        max: 2,
        now: currentStep,
        text: `Step ${currentStep} of 2`,
      }}
    >
      <View style={styles.stepTrackRow}>
        <View
          style={[styles.stepNode, { backgroundColor: theme.primary }]}
          accessibilityLabel={
            secondStepActive
              ? 'Step 1, Visitor details, completed'
              : 'Step 1, Visitor details, current'
          }
        >
          <Text style={[styles.stepNumber, { color: theme.primaryText }]}>
            1
          </Text>
        </View>
        <View style={[styles.stepLine, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.stepLineProgress,
              secondStepActive
                ? styles.stepLineProgressComplete
                : styles.stepLineProgressCurrent,
              { backgroundColor: theme.primary },
            ]}
          />
        </View>
        <View
          style={[
            styles.stepNode,
            {
              backgroundColor: secondStepActive ? theme.primary : theme.raised,
              borderColor: secondStepActive ? theme.primary : theme.border,
            },
            !secondStepActive && styles.inactiveStepNode,
          ]}
          accessibilityLabel={
            secondStepActive
              ? 'Step 2, Visit details, current'
              : 'Step 2, Visit details, upcoming'
          }
        >
          <Text
            style={[
              styles.stepNumber,
              {
                color: secondStepActive ? theme.primaryText : theme.subtext,
              },
            ]}
          >
            2
          </Text>
        </View>
      </View>
      <View style={styles.stepLabelRow}>
        <View style={styles.stepLabelSlot}>
          <View style={styles.completedLabelRow}>
            <Text
              style={[
                styles.stepLabel,
                { color: secondStepActive ? theme.subtext : theme.primary },
              ]}
            >
              Visitor details
            </Text>
            {secondStepActive ? (
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={theme.primary}
              />
            ) : null}
          </View>
        </View>
        <View style={[styles.stepLabelSlot, styles.stepLabelSlotRight]}>
          <Text
            style={[
              styles.stepLabel,
              { color: secondStepActive ? theme.primary : theme.inactive },
            ]}
          >
            Visit details
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PreRegisterVisitorScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const { user } = useAuth();
  const scrollRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [host, setHost] = useState(user?.fullname || '');
  const [purpose, setPurpose] = useState('General');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [visitDate, setVisitDate] = useState(localDateString());
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goToStep = step => {
    setCurrentStep(step);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (currentStep !== 2) return false;
        goToStep(1);
        return true;
      },
    );

    return () => subscription.remove();
  }, [currentStep]);

  const handleVisibleBack = () => {
    if (currentStep === 2) {
      goToStep(1);
      return;
    }
    navigation?.goBack();
  };

  const continueToVisitDetails = () => {
    const validation = getVisitorIdentityValidation({
      name,
      email,
      phone,
      host,
    });

    if (validation) {
      showPrimeAlert(validation.title, validation.message);
      return;
    }

    goToStep(2);
  };

  const onSubmit = async () => {
    if (submitting) return;

    const identityValidation = getVisitorIdentityValidation({
      name,
      email,
      phone,
      host,
    });

    if (identityValidation) {
      goToStep(1);
      showPrimeAlert(identityValidation.title, identityValidation.message);
      return;
    }

    const detailsValidation = getVisitDetailsValidation({
      agreedToTerms,
      visitDate,
    });

    if (detailsValidation) {
      showPrimeAlert(detailsValidation.title, detailsValidation.message);
      return;
    }

    setSubmitting(true);
    try {
      const res = await registerVisitor(
        buildVisitorRegistrationPayload({
          name,
          email,
          phone,
          host,
          purpose,
          purposeDetail,
          visitDate,
        }),
      );
      if (res.data?.visitor_pass?.qr_image_data_url) {
        navigation.replace('VisitorPass', { initialPass: res.data });
      } else {
        showPrimeAlert(
          'Visitor registered',
          `Badge: ${
            res.data?.badgeNumber || 'N/A'
          }\nThe current server registered the visitor using the existing check-in flow. Deploy the Version 2 backend before secure QR passes become available.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (err) {
      showPrimeAlert(
        'Registration failed',
        err.message || 'Unable to register visitor.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle =
    currentStep === 1 ? 'Pre-register Visitor' : 'Visit details';
  const pageSubtitle =
    currentStep === 1
      ? 'Create a faster, secure lobby check-in'
      : 'Tell us more about the upcoming visit';

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Pre-register Visitor"
      showBottomNav
      activeRoute="Home"
      themeOverride={theme}
      onBackPress={handleVisibleBack}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageMetaRow}>
          <Text style={[styles.eyebrow, { color: theme.primary }]}>
            VISITOR ACCESS
          </Text>
          <Text
            style={[styles.stepCount, { color: theme.subtext }]}
            accessibilityLabel={`Step ${currentStep} of 2`}
          >
            Step {currentStep} of 2
          </Text>
        </View>

        <Text style={[styles.pageTitle, { color: theme.text }]}>
          {pageTitle}
        </Text>
        <Text style={[styles.pageSubtitle, { color: theme.subtext }]}>
          {pageSubtitle}
        </Text>

        <StepProgress currentStep={currentStep} theme={theme} />

        {currentStep === 1 ? (
          <>
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: theme.iconSurface,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={25}
                color={theme.primary}
              />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Pre-register a visitor to create a secure, one-time gate QR pass
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Visitor details
            </Text>

            <View style={styles.formStack}>
              <InputField
                theme={theme}
                label="Visitor name"
                icon="person-outline"
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
              />
              <InputField
                theme={theme}
                label="Email"
                icon="mail-outline"
                placeholder="visitor@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <InputField
                theme={theme}
                label="Phone number"
                icon="call-outline"
                placeholder="+1 234 567 890"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
              <InputField
                theme={theme}
                label="Host name"
                icon="home-outline"
                placeholder="Resident or host name"
                value={host}
                onChangeText={setHost}
                autoComplete="name"
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue to visit details"
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={continueToVisitDetails}
              activeOpacity={0.84}
            >
              <Text
                style={[styles.primaryButtonText, { color: theme.primaryText }]}
              >
                Continue
              </Text>
              <Ionicons
                name="arrow-forward"
                size={24}
                color={theme.primaryText}
              />
            </TouchableOpacity>
            <Text style={[styles.helperText, { color: theme.subtext }]}>
              You can review details before submitting
            </Text>
          </>
        ) : (
          <>
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor: theme.iconSurface,
                    borderColor: theme.goldBorder,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={24}
                  color={theme.primary}
                />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={[styles.summaryLabel, { color: theme.subtext }]}>
                  Visitor summary
                </Text>
                <Text style={[styles.summaryName, { color: theme.text }]}>
                  {name.trim()}
                </Text>
                <Text style={[styles.summaryMeta, { color: theme.subtext }]}>
                  {email.trim()} · {phone.trim()}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Edit visitor details"
                style={styles.editButton}
                onPress={() => goToStep(1)}
              >
                <Text style={[styles.editText, { color: theme.primary }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Purpose of visit
            </Text>
            <View style={styles.purposeGrid} accessibilityRole="radiogroup">
              {VISITOR_PURPOSES.map(item => {
                const selected = purpose === item;
                return (
                  <TouchableOpacity
                    key={item}
                    accessibilityRole="radio"
                    accessibilityLabel={`${item} purpose`}
                    accessibilityState={{ selected }}
                    style={[
                      styles.purposeCard,
                      {
                        backgroundColor: selected ? theme.primary : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setPurpose(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={PURPOSE_ICONS[item] || 'ellipse-outline'}
                      size={23}
                      color={selected ? theme.primaryText : theme.icon}
                    />
                    <Text
                      style={[
                        styles.purposeText,
                        { color: selected ? theme.primaryText : theme.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Visit schedule
            </Text>
            <InputField
              theme={theme}
              label="Visit date"
              icon="calendar-outline"
              placeholder="YYYY-MM-DD"
              value={visitDate}
              onChangeText={setVisitDate}
              keyboardType="number-pad"
              maxLength={10}
              returnKeyType="done"
            />

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Additional details (optional)
            </Text>
            <View
              style={[
                styles.detailsCard,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={23}
                color={theme.inactive}
                style={styles.detailsIcon}
              />
              <TextInput
                accessibilityLabel="Additional details optional"
                style={[styles.detailsInput, { color: theme.text }]}
                placeholder="Meeting room, delivery notes, etc."
                placeholderTextColor={theme.inactive}
                value={purposeDetail}
                onChangeText={setPurposeDetail}
                multiline
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityLabel="Agree to visitor registration terms"
              accessibilityState={{ checked: agreedToTerms }}
              style={styles.termsRow}
              onPress={() => setAgreedToTerms(value => !value)}
              activeOpacity={0.72}
            >
              <Ionicons
                name={agreedToTerms ? 'checkbox' : 'square-outline'}
                size={26}
                color={agreedToTerms ? theme.primary : theme.inactive}
              />
              <Text style={[styles.termsText, { color: theme.text }]}>
                I agree to the visitor registration terms
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Submit visitor registration"
              accessibilityState={{ disabled: submitting, busy: submitting }}
              style={[
                styles.primaryButton,
                styles.submitButton,
                { backgroundColor: theme.primary },
                submitting && styles.disabled,
              ]}
              onPress={onSubmit}
              disabled={submitting}
              activeOpacity={0.84}
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={23}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[
                      styles.submitButtonText,
                      { color: theme.primaryText },
                    ]}
                  >
                    Submit registration
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  pageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  eyebrow: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageTitle: {
    marginTop: 10,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 23,
  },
  stepper: {
    marginTop: 26,
    marginBottom: 26,
    paddingHorizontal: 42,
  },
  stepTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNode: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveStepNode: {
    borderWidth: 1,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepLine: {
    flex: 1,
    height: 3,
    overflow: 'hidden',
  },
  stepLineProgress: {
    height: '100%',
  },
  stepLineProgressCurrent: {
    width: '22%',
  },
  stepLineProgressComplete: {
    width: '100%',
  },
  stepLabelRow: {
    flexDirection: 'row',
    marginHorizontal: -28,
    marginTop: 10,
  },
  stepLabelSlot: {
    width: '50%',
    alignItems: 'center',
  },
  stepLabelSlotRight: {
    alignItems: 'center',
  },
  completedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoBanner: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 26,
  },
  infoText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  formStack: {
    gap: 12,
  },
  inputCard: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
  },
  inputIcon: {
    width: 30,
    marginRight: 12,
    textAlign: 'center',
  },
  inputCopy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 1,
  },
  input: {
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 4,
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 56,
    marginTop: 20,
    borderRadius: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
  },
  helperText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  summaryCard: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 26,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 17,
  },
  summaryName: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  summaryMeta: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },
  editButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: '800',
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  purposeCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 128,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  purposeText: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  detailsCard: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  detailsIcon: {
    width: 30,
    marginRight: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  detailsInput: {
    flex: 1,
    minHeight: 76,
    padding: 0,
    fontSize: 15,
    lineHeight: 22,
  },
  termsRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingVertical: 8,
  },
  termsText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  submitButton: {
    justifyContent: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.62,
  },
});
