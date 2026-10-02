import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { loginStep1, loginStep2 } from '../../api/auth';
import { showPrimeAlert } from '../../services/primeAlert';
import { getLoginTheme } from './loginTheme';

const LOGIN_BACKGROUND = require('../../assets/home-prime-city-night.png');
const LOGIN_LOGO = require('../../assets/app-icon-master.png');

export default function LoginScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getLoginTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLight = theme.mode === 'light';
  const heroHeight = Math.min(
    Math.max(width * 0.72, 240),
    Math.max(height * 0.43, 240),
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const passwordInputRef = useRef(null);
  const otpInputRef = useRef(null);

  const onContinue = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      showPrimeAlert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginStep1(email.trim(), password);
      setOtpSent(true);
      requestAnimationFrame(() => otpInputRef.current?.focus?.());
      showPrimeAlert('OTP sent', 'Check your email for the verification code.');
    } catch (err) {
      showPrimeAlert('Sign in failed', err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (loading) return;
    if (!otp.trim()) {
      showPrimeAlert('Missing OTP', 'Enter the code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginStep2(email.trim(), otp.trim());
      signIn({
        id: res.user.id,
        fullname: res.user.fullname,
        email: res.user.email || email.trim(),
        phone: res.user.phone,
        role: res.user.role,
        room_id: res.user.room_id,
        room_number: res.user.room_number,
      });
    } catch (err) {
      showPrimeAlert(
        'Verification failed',
        err.message || 'Invalid or expired OTP.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor="transparent"
        translucent
      />
      <ImageBackground
        source={LOGIN_BACKGROUND}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
        accessible={false}
      >
        <View style={styles.heroOverlay} pointerEvents="none" />
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            isLight ? styles.lightScroll : styles.darkScroll,
            !isLight && { paddingTop: insets.top + 42 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {isLight ? (
            <View style={{ height: heroHeight }} pointerEvents="none" />
          ) : null}

          <View
            style={[
              styles.panel,
              isLight ? styles.lightPanel : styles.darkPanel,
              isLight && {
                minHeight: Math.max(height - heroHeight + 28, 500),
              },
            ]}
          >
            <View
              style={[
                styles.logoWrap,
                isLight ? styles.lightLogoWrap : styles.darkLogoWrap,
              ]}
            >
              <Image
                source={LOGIN_LOGO}
                style={styles.logo}
                resizeMode="cover"
                accessible
                accessibilityLabel="Prime City logo"
                accessibilityIgnoresInvertColors
              />
            </View>

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              style={[styles.title, isLight && styles.lightTitle]}
            >
              Prime City
            </Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? 'Enter the OTP sent to your email'
                : 'Sign in with your resident account'}
            </Text>

            <View style={styles.form}>
              {!otpSent ? (
                <>
                  <Text style={styles.label}>Email</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === 'email' && styles.inputWrapFocused,
                    ]}
                  >
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
                      returnKeyType="next"
                      editable={!loading}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={() => passwordInputRef.current?.focus?.()}
                      accessibilityLabel="Email"
                    />
                  </View>

                  <Text style={styles.label}>Password</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === 'password' && styles.inputWrapFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={21}
                      color={theme.icon}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      style={styles.input}
                      placeholder="Enter password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      placeholderTextColor={theme.inactive}
                      selectionColor={theme.primary}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="done"
                      editable={!loading}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={onContinue}
                      accessibilityLabel="Password"
                    />
                    <TouchableOpacity
                      style={styles.visibilityButton}
                      onPress={() => setShowPassword(!showPassword)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={23}
                        color={theme.icon}
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.forgotPasswordContainer}
                    onPress={() => navigation.navigate('ForgotPassword')}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel="Forgot Password"
                  >
                    <Text style={styles.forgotPasswordText}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={onContinue}
                    disabled={loading}
                    activeOpacity={0.84}
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                    accessibilityState={{ disabled: loading }}
                  >
                    <View pointerEvents="none" style={styles.buttonHighlight} />
                    {loading ? (
                      <ActivityIndicator color={theme.primaryText} />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Continue</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={21}
                          color={theme.primaryText}
                        />
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>OTP code</Text>
                  <View
                    style={[
                      styles.inputWrap,
                      focusedField === 'otp' && styles.inputWrapFocused,
                    ]}
                  >
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
                      returnKeyType="done"
                      editable={!loading}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      onSubmitEditing={onVerifyOtp}
                      accessibilityLabel="OTP code"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={onVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.84}
                    accessibilityRole="button"
                    accessibilityLabel="Verify and sign in"
                    accessibilityState={{ disabled: loading }}
                  >
                    <View pointerEvents="none" style={styles.buttonHighlight} />
                    {loading ? (
                      <ActivityIndicator color={theme.primaryText} />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Verify & sign in</Text>
                        <Ionicons
                          name="checkmark"
                          size={21}
                          color={theme.primaryText}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => {
                      setOtpSent(false);
                      setOtp('');
                    }}
                    activeOpacity={0.72}
                    accessibilityRole="button"
                    accessibilityLabel="Use a different account"
                  >
                    <Text style={styles.backLinkText}>
                      Use a different account
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    root: { flex: 1 },
    background: { flex: 1, backgroundColor: theme.background },
    backgroundImage: { backgroundColor: theme.background },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.heroOverlay,
    },
    scroll: { flexGrow: 1, paddingBottom: 0 },
    lightScroll: { justifyContent: 'flex-start' },
    darkScroll: { paddingHorizontal: 30, paddingBottom: 44 },
    panel: { width: '100%' },
    lightPanel: {
      backgroundColor: theme.panel,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 30,
      paddingTop: 0,
      paddingBottom: 44,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 7,
    },
    darkPanel: {
      maxWidth: 620,
      alignSelf: 'center',
      backgroundColor: theme.panel,
      borderWidth: 1,
      borderColor: theme.panelBorder,
      borderRadius: 26,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 30,
    },
    logoWrap: {
      overflow: 'hidden',
      backgroundColor: theme.logoSurface,
      borderWidth: 1.5,
      borderColor: theme.goldBorder,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    lightLogoWrap: {
      width: 104,
      height: 104,
      borderRadius: 25,
      marginTop: -52,
      marginBottom: 28,
    },
    darkLogoWrap: {
      width: 122,
      height: 122,
      borderRadius: 29,
      marginBottom: 25,
    },
    logo: { width: '100%', height: '100%' },
    title: {
      color: theme.primary,
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '900',
      letterSpacing: -1,
      marginBottom: 8,
    },
    lightTitle: { color: theme.text },
    subtitle: {
      color: theme.subtext,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 29,
    },
    form: { width: '100%' },
    label: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '800',
      marginBottom: 9,
      marginTop: 16,
    },
    inputWrap: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      paddingLeft: 16,
      paddingRight: 8,
    },
    inputWrapFocused: {
      borderColor: theme.primary,
    },
    inputIcon: { marginRight: 13 },
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
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
      minHeight: 44,
      justifyContent: 'center',
      marginTop: 7,
    },
    forgotPasswordText: {
      color: theme.primary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
    button: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.primary,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 15,
      marginTop: 26,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.22,
      shadowRadius: 11,
      elevation: 4,
      overflow: 'hidden',
    },
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
    buttonDisabled: { opacity: 0.72 },
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
      marginTop: 13,
    },
    backLinkText: {
      color: theme.primary,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '700',
    },
  });
