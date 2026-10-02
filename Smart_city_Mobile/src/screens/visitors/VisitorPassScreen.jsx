import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { fetchVisitorPass } from '../../api/visitors';
import { getProfileTheme } from '../profile/profileTheme';

export function formatVisitorPassDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function isVisitorPassActive(pass) {
  return pass?.status === 'Active' && Boolean(pass?.qr_image_data_url);
}

export default function VisitorPassScreen({ navigation, route }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const initial = route.params?.initialPass || null;
  const visitorId = route.params?.visitorId || initial?.id;
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!visitorId || initial) return;
    setLoading(true);
    try {
      setData(await fetchVisitorPass(visitorId));
    } catch (error) {
      if (!error.sessionExpired) {
        showPrimeAlert('Unable to load visitor pass', error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [initial, visitorId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pass = data?.visitor_pass;
  const imageData = pass?.qr_image_data_url;
  const active = isVisitorPassActive(pass);
  const status = pass?.status || data?.qr_status || 'Unavailable';

  const sharePass = async () => {
    if (!imageData || sharing) return;
    setSharing(true);
    try {
      const base64 = imageData.replace(/^data:image\/png;base64,/, '');
      const safeBadge = String(data?.badgeNumber || 'visitor').replace(
        /[^A-Za-z0-9_-]/g,
        '-',
      );
      const path = `${RNFS.CachesDirectoryPath}/prime-city-${safeBadge}.png`;
      await RNFS.writeFile(path, base64, 'base64');
      await Share.share({
        title: 'Prime City visitor pass',
        message: `Prime City visitor pass for ${data?.name || 'visitor'} · ${
          data?.badgeNumber || ''
        }. Show this QR at the gate on ${formatVisitorPassDate(
          data?.visitDate,
        )}. ${pass?.share_url || ''}`,
        url: `file://${path}`,
      });
    } catch (_error) {
      showPrimeAlert(
        'Unable to share',
        'Please take a screenshot of the QR pass and share it manually.',
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Visitor QR Pass"
      showBottomNav
      activeRoute="Home"
      themeOverride={theme}
    >
      {loading ? (
        <View
          style={styles.centered}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading visitor QR pass"
        >
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>
            Loading visitor pass…
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageHeading}>
            <Text style={[styles.eyebrow, { color: theme.primary }]}>
              VISITOR ACCESS
            </Text>
            <Text style={[styles.pageTitle, { color: theme.text }]}>
              Visitor QR Pass
            </Text>
            <Text style={[styles.pageSubtitle, { color: theme.subtext }]}>
              Show this secure pass at the Prime City gate
            </Text>
          </View>

          <View
            style={[
              styles.passCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.goldBorder,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.identityIcon,
                  {
                    backgroundColor: theme.iconSurface,
                    borderColor: theme.goldBorder,
                  },
                ]}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={23}
                  color={theme.primary}
                />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: theme.text }]}>
                  {data?.name || 'Visitor'}
                </Text>
                <Text style={[styles.meta, { color: theme.subtext }]}>
                  {data?.badgeNumber || 'Badge pending'} · Room{' '}
                  {data?.room || 'assigned resident room'}
                </Text>
              </View>
              <View
                accessible
                accessibilityLabel={`Pass status: ${status}`}
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: active ? theme.successBg : theme.warningBg,
                    borderColor: active ? theme.success : theme.warning,
                  },
                ]}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : 'alert-circle'}
                  size={15}
                  color={active ? theme.success : theme.warning}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: active ? theme.success : theme.warning },
                  ]}
                >
                  {status}
                </Text>
              </View>
            </View>

            {active ? (
              <View style={[styles.qrFrame, { borderColor: theme.goldBorder }]}>
                <Image
                  source={{ uri: imageData }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityRole="image"
                  accessibilityLabel={`Visitor QR code for ${
                    data?.name || 'visitor'
                  }`}
                />
              </View>
            ) : (
              <View
                accessible
                accessibilityLabel="Visitor pass unavailable"
                style={[
                  styles.unavailable,
                  {
                    backgroundColor: theme.warningBg,
                    borderColor: theme.warning,
                  },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={24}
                  color={theme.warning}
                />
                <Text style={[styles.unavailableText, { color: theme.text }]}>
                  This pass is no longer active. Used, expired, or revoked
                  passes cannot be scanned again.
                </Text>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.detailRow}>
              <View
                style={[
                  styles.detailIcon,
                  { backgroundColor: theme.iconSurface },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={theme.primary}
                />
              </View>
              <View style={styles.detailCopy}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  VALID FOR
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {formatVisitorPassDate(pass?.valid_from || data?.visitDate)} –{' '}
                  {formatVisitorPassDate(pass?.expires_at)}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View
                style={[
                  styles.detailIcon,
                  { backgroundColor: theme.iconSurface },
                ]}
              >
                <Ionicons
                  name="navigate-circle-outline"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.detailCopy}>
                <Text style={[styles.label, { color: theme.subtext }]}>
                  PURPOSE
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {data?.purpose || 'General'}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.instructionsCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View
              style={[
                styles.shieldIcon,
                {
                  backgroundColor: theme.iconSurface,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={styles.instructionsCopy}>
              <Text style={[styles.instructionsTitle, { color: theme.text }]}>
                Secure gate check-in
              </Text>
              <Text style={[styles.instructions, { color: theme.subtext }]}>
                Send this pass to your visitor. At the gate, show it to the
                ESP32-CAM. The reception display will verify it and show the
                approved visitor details automatically.
              </Text>
              <View
                style={[
                  styles.inlineDivider,
                  { backgroundColor: theme.border },
                ]}
              />
              <Text style={[styles.privacy, { color: theme.subtext }]}>
                The QR contains a signed one-time token—not phone, email, NRIC,
                or private resident profile data.
              </Text>
            </View>
          </View>

          {active ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save or share visitor QR pass"
              accessibilityState={{ disabled: sharing, busy: sharing }}
              onPress={sharePass}
              disabled={sharing}
              activeOpacity={0.84}
              style={[
                styles.button,
                { backgroundColor: theme.primary },
                sharing && styles.disabled,
              ]}
            >
              {sharing ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <>
                  <Ionicons
                    name="share-social-outline"
                    size={21}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[styles.buttonText, { color: theme.primaryText }]}
                  >
                    Save or share QR pass
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 116,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  pageHeading: {
    marginBottom: 22,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pageTitle: {
    marginTop: 9,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
  },
  passCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  identityIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  statusPill: {
    minHeight: 34,
    maxWidth: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  qrFrame: {
    width: '100%',
    maxWidth: 336,
    alignSelf: 'center',
    marginVertical: 24,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  qrImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
  },
  unavailable: {
    marginVertical: 22,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  unavailableText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  detailRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  value: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 21,
    flexShrink: 1,
  },
  instructionsCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shieldIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsCopy: {
    flex: 1,
    minWidth: 0,
  },
  instructionsTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  instructions: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
  },
  inlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 11,
  },
  privacy: {
    fontSize: 12,
    lineHeight: 19,
  },
  button: {
    minHeight: 56,
    marginTop: 16,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.62,
  },
});
