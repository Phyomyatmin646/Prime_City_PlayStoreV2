import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import { forgotPasswordStep1, forgotPasswordStep2 } from '../../api/auth';
import { useTheme } from '../../context/ThemeContext';
import { showPrimeAlert } from '../../services/primeAlert';
import { getLoginTheme } from './loginTheme';

const AUTH_BACKGROUND = require('../../assets/home-prime-city-night.png');
const PRIME_CITY_LOGO = require('../../assets/app-icon-master.png');

export default function ForgotPasswordScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getLoginTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const otpInputRef = useRef(null);
  const newPasswordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  const returnToEmail = () => {
    setOtpSent(false);
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setFocusedField(null);
  };

  const handleBack = () => {
    if (loading) return;
    if (otpSent) {
      returnToEmail();
      return;
    }
    navigation.goBack();
  };

  const onSendOtp = async () => {
    if (loading) return;
    if (!email.trim()) {
      showPrimeAlert('Missing field', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordStep1(email.trim());
      setOtpSent(true);
      requestAnimationFrame(() => otpInputRef.current?.focus?.());
      showPrimeAlert(
        'OTP sent',
        'Check your email for the password reset OTP verification code.',
      );
    } catch (err) {
      showPrimeAlert(
        'Request failed',
        err.message || 'Unable to request password reset.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async () => {
    if (loading) return;
    if (!otp.trim()) {
      showPrimeAlert('Missing field', 'Please enter the verification OTP.');
      return;
    }
    if (!newPassword) {
      showPrimeAlert('Missing field', 'Please enter your new password.');
      return;
    }
    if (newPassword.length < 6) {
      showPrimeAlert(
        'Invalid Password',
        'New password must be at least 6 characters.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showPrimeAlert(
        'Mismatch',
        'Confirm password does not match new password.',
      );
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordStep2(email.trim(), otp.trim(), newPassword);
      showPrimeAlert(
        'Success',
        'Your password has been successfully reset. Please sign in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (err) {
      showPrimeAlert(
        'Reset failed',
        err.message || 'Invalid or expired OTP.',
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = field => [
    styles.inputWrap,
    focusedField === field && styles.inputWrapFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor="transparent"
        translucent
      />
      <ImageBackground
        source={AUTH_BACKGROUND}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
        accessible={false}
      >
        <View pointerEvents="none" style={styles.heroOverlay} />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 34 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
              activeOpacity={0.72}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              accessibilityRole="button"
              accessibilityLabel={
                otpSent ? 'Back to email step' : 'Go back to sign in'
              }
              accessibilityState={{ disabled: loading }}
            >
              <Ionicons name="chevron-back" size={25} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.panel}>
              <View style={styles.brandRow}>
                <View style={styles.logoWrap}>
                  <Image
                    source={PRIME_CITY_LOGO}
                    style={styles.logo}
                    resizeMode="cover"
                    accessible
                    accessibilityLabel="Prime City logo"
                    accessibilityIgnoresInvertColors
                  />
                </View>
                <View style={styles.brandCopy}>
                  <Text style={styles.brandName}>Prime City</Text>
                  <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
                </View>
              </View>

              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                {otpSent
                  ? 'Enter the OTP code from your email and set your new password.'
                  : 'Enter your registered email address to receive a password reset OTP code.'}
              </Text>

              <View style={styles.progressRow} accessible>
                <View style={styles.progressItem}>
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    {otpSent ? (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={theme.primaryText}
                      />
                    ) : (
                      <Text style={styles.stepNumberActive}>1</Text>
                    )}
                  </View>
                  <Text style={styles.stepTextActive}>Email</Text>
                </View>
                <View
                  style={[
                    styles.progressLine,
                    otpSent && styles.progressLineActive,
                  ]}
                />
                <View style={styles.progressItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      otpSent && styles.stepCircleActive,
                    ]}
                  >
                    <Text
                      style={
                        otpSent ? styles.stepNumberActive : styles.stepNumber
                      }
                    >
                      2
                    </Text>
                  </View>
                  <Text
                    style={otpSent ? styles.stepTextActive : styles.stepText}
                  >
                    Reset
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                {!otpSent ? (
                  <>
                    <Text style={styles.label}>Email address</Text>
                    <View style={fieldStyle('email')}>
                      <Ionicons
                        name="mail-outline"
                        size={21}
                        color={theme.icon}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter email"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor={theme.inactive}
                        selectionColor={theme.primary}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="send"
                        editable={!loading}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={onSendOtp}
                        accessibilityLabel="Recovery email"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={onSendOtp}
                      disabled={loading}
                      activeOpacity={0.84}
                      accessibilityRole="button"
                      accessibilityLabel="Send OTP"
                      accessibilityState={{ disabled: loading }}
                    >
                      <View
                        pointerEvents="none"
                        style={styles.buttonHighlight}
                      />
                      {loading ? (
                        <ActivityIndicator color={theme.primaryText} />
                      ) : (
                        <>
                          <Text style={styles.buttonText}>Send OTP</Text>
                          <Ionicons
                            name="arrow-forward"
                            size={21}
                            color={theme.primaryText}
                          />
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backLink}
                      onPress={() => navigation.navigate('Login')}
                      disabled={loading}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel="Back to sign in"
                    >
                      <Text style={styles.backLinkText}>Back to Sign In</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>OTP code</Text>
                    <View style={fieldStyle('otp')}>
                      <Ionicons
                        name="key-outline"
                        size={21}
                        color={theme.icon}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={otpInputRef}
                        style={styles.input}
                        placeholder="6-digit code"
                        value={otp}
                        onChangeText={setOtp}
                        placeholderTextColor={theme.inactive}
                        selectionColor={theme.primary}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        returnKeyType="next"
                        editable={!loading}
                        onFocus={() => setFocusedField('otp')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={() =>
                          newPasswordInputRef.current?.focus?.()
                        }
                        accessibilityLabel="Password reset OTP"
                      />
                    </View>

                    <Text style={styles.label}>New password</Text>
                    <View style={fieldStyle('newPassword')}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={21}
                        color={theme.icon}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={newPasswordInputRef}
                        style={styles.input}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        placeholderTextColor={theme.inactive}
                        selectionColor={theme.primary}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        editable={!loading}
                        onFocus={() => setFocusedField('newPassword')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={() =>
                          confirmPasswordInputRef.current?.focus?.()
                        }
                        accessibilityLabel="New password"
                      />
                      <TouchableOpacity
                        style={styles.visibilityButton}
                        onPress={() => setShowPassword(current => !current)}
                        activeOpacity={0.7}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? 'Hide new password' : 'Show new password'
                        }
                      >
                        <Ionicons
                          name={
                            showPassword ? 'eye-off-outline' : 'eye-outline'
                          }
                          size={23}
                          color={theme.icon}
                        />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Confirm new password</Text>
                    <View style={fieldStyle('confirmPassword')}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={21}
                        color={theme.icon}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={confirmPasswordInputRef}
                        style={styles.input}
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        placeholderTextColor={theme.inactive}
                        selectionColor={theme.primary}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="done"
                        editable={!loading}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        onSubmitEditing={onResetPassword}
                        accessibilityLabel="Confirm new password"
                      />
                      <TouchableOpacity
                        style={styles.visibilityButton}
                        onPress={() =>
                          setShowConfirmPassword(current => !current)
                        }
                        activeOpacity={0.7}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showConfirmPassword
                            ? 'Hide confirmed password'
                            : 'Show confirmed password'
                        }
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? 'eye-off-outline'
                              : 'eye-outline'
                          }
                          size={23}
                          color={theme.icon}
                        />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={onResetPassword}
                      disabled={loading}
                      activeOpacity={0.84}
                      accessibilityRole="button"
                      accessibilityLabel="Reset password"
                      accessibilityState={{ disabled: loading }}
                    >
                      <View
                        pointerEvents="none"
                        style={styles.buttonHighlight}
                      />
                      {loading ? (
                        <ActivityIndicator color={theme.primaryText} />
                      ) : (
                        <>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={21}
                            color={theme.primaryText}
                          />
                          <Text style={styles.buttonText}>Reset Password</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backLink}
                      onPress={returnToEmail}
                      disabled={loading}
                      activeOpacity={0.72}
                      accessibilityRole="button"
                      accessibilityLabel="Use a different email"
                    >
                      <Text style={styles.backLinkText}>
                        Use a different email
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    background: { flex: 1, backgroundColor: theme.background },
    backgroundImage: { backgroundColor: theme.background },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.heroOverlay,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    content: {
      width: '100%',
      maxWidth: 620,
      alignSelf: 'center',
    },
    backButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.mutedBorder,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
    },
    panel: {
      width: '100%',
      paddingHorizontal: 23,
      paddingTop: 22,
      paddingBottom: 25,
      borderRadius: 26,
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.mode === 'light' ? 0.13 : 0.32,
      shadowRadius: 24,
      elevation: 8,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 23,
    },
    logoWrap: {
      width: 70,
      height: 70,
      borderRadius: 19,
      overflow: 'hidden',
      backgroundColor: theme.logoSurface,
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.18,
      shadowRadius: 9,
      elevation: 4,
    },
    logo: { width: '100%', height: '100%' },
    brandCopy: { flex: 1, minWidth: 0, marginLeft: 15 },
    brandName: {
      color: theme.text,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginTop: 3,
    },
    title: {
      color: theme.text,
      fontSize: 32,
      lineHeight: 39,
      fontWeight: '900',
      letterSpacing: -0.7,
      marginBottom: 8,
    },
    subtitle: {
      color: theme.subtext,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 21,
    },
    progressRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    progressItem: { alignItems: 'center', minWidth: 54 },
    stepCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.mutedBorder,
    },
    stepCircleActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    stepNumber: {
      color: theme.inactive,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '800',
    },
    stepNumberActive: {
      color: theme.primaryText,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '900',
    },
    stepText: {
      color: theme.inactive,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
      marginTop: 4,
    },
    stepTextActive: {
      color: theme.primary,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
      marginTop: 4,
    },
    progressLine: {
      flex: 1,
      height: 2,
      marginTop: 14,
      marginHorizontal: 9,
      borderRadius: 1,
      backgroundColor: theme.mutedBorder,
    },
    progressLineActive: { backgroundColor: theme.primary },
    form: { width: '100%' },
    label: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
      marginBottom: 8,
      marginTop: 13,
    },
    inputWrap: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 15,
      paddingRight: 7,
      borderRadius: 15,
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inputWrapFocused: {
      borderColor: theme.primary,
    },
    inputIcon: { marginRight: 12 },
    input: {
      flex: 1,
      minWidth: 0,
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
      paddingVertical: 14,
    },
    visibilityButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 25,
      borderRadius: 15,
      overflow: 'hidden',
      backgroundColor: theme.primary,
      borderWidth: 1,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.22,
      shadowRadius: 11,
      elevation: 4,
    },
    buttonDisabled: { opacity: 0.72 },
    buttonHighlight: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: '46%',
      borderTopRightRadius: 44,
      borderBottomRightRadius: 44,
      backgroundColor: theme.buttonHighlight,
    },
    buttonText: {
      color: theme.primaryText,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: '900',
    },
    backLink: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 11,
    },
    backLinkText: {
      color: theme.primary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
    },
  });
