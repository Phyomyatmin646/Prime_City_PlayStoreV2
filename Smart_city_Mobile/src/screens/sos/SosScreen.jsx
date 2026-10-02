import React, { useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/profile';
import { sendSosAlert } from '../../api/sos';
import { getProfileTheme } from '../profile/profileTheme';

const EMERGENCY_TYPES = [
  { id: 'Security', label: 'Security', icon: 'shield-outline' },
  { id: 'Medical', label: 'Medical', icon: 'medkit-outline' },
  { id: 'Fire', label: 'Fire', icon: 'flame-outline' },
];

export default function SosScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const { user } = useAuth();
  const canSendWithoutRoom = ['Admin', 'Staff'].includes(user?.role);
  const [selected, setSelected] = useState('Security');
  const [submitting, setSubmitting] = useState(false);

  const selectedType = EMERGENCY_TYPES.find(type => type.id === selected);

  const submitSOS = async () => {
    setSubmitting(true);
    try {
      const profile =
        canSendWithoutRoom || user?.room_id ? user : await fetchProfile();
      const residentId = profile?.id || user?.id;
      const roomId = profile?.room_id || user?.room_id;

      if (!residentId || (!canSendWithoutRoom && !roomId)) {
        showPrimeAlert(
          'Room not linked',
          'Your resident account needs a linked unit before sending SOS.',
        );
        return;
      }

      const payload = {
        resident_id: residentId,
        alert_type: selectedType?.label || 'General',
        priority: selected === 'Fire' ? 'Critical' : 'High',
        message: `${selectedType?.label || 'Emergency'} SOS from ${
          profile?.fullname || (canSendWithoutRoom ? user?.role : 'resident')
        }.`,
      };

      if (roomId) payload.room_id = roomId;

      await sendSosAlert(payload);

      showPrimeAlert(
        'SOS Sent',
        'Security has been notified. Help is on the way.',
      );
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'SOS failed',
          err.message || 'Unable to send SOS alert.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const triggerSOS = () => {
    if (submitting) return;

    showPrimeAlert(
      'Send SOS Alert?',
      canSendWithoutRoom
        ? 'Security will be notified immediately.'
        : 'Security will be notified immediately with your location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: submitSOS },
      ],
    );
  };

  return (
    <ScreenContainer navigation={navigation} themeOverride={theme}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.danger }]}>
            EMERGENCY ASSISTANCE
          </Text>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: theme.text }]}
          >
            Emergency SOS
          </Text>
          <Text style={[styles.sub, { color: theme.subtext }]}>
            Select type and hold the button to alert security
          </Text>
        </View>

        <View style={styles.typeRow}>
          {EMERGENCY_TYPES.map(type => {
            const active = selected === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: active ? theme.dangerBg : theme.card,
                    borderColor: active ? theme.danger : theme.border,
                    shadowColor: active ? theme.danger : theme.shadow,
                  },
                  submitting && styles.disabled,
                ]}
                onPress={() => setSelected(type.id)}
                disabled={submitting}
                activeOpacity={0.82}
                accessibilityRole="radio"
                accessibilityLabel={`${type.label} emergency type`}
                accessibilityState={{
                  selected: active,
                  disabled: submitting,
                }}
              >
                {active ? (
                  <View
                    style={[
                      styles.selectedBadge,
                      { backgroundColor: theme.danger },
                    ]}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.typeIconWrap,
                    {
                      backgroundColor: active
                        ? `${theme.danger}18`
                        : theme.iconSurface,
                      borderColor: active ? theme.danger : theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={type.icon}
                    size={30}
                    color={active ? theme.danger : theme.primary}
                  />
                </View>
                <Text style={[styles.typeLabel, { color: theme.text }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sosArea}>
          <TouchableOpacity
            style={[
              styles.sosOuter,
              { shadowColor: theme.danger },
              submitting && styles.disabled,
            ]}
            onPress={triggerSOS}
            disabled={submitting}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`Send ${
              selectedType?.label || 'Emergency'
            } SOS alert`}
            accessibilityHint="Opens a confirmation alert before sending"
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            <View
              style={[
                styles.sosRing,
                {
                  backgroundColor: `${theme.danger}0D`,
                  borderColor: `${theme.danger}55`,
                },
              ]}
            >
              <View
                style={[
                  styles.sosInnerRing,
                  {
                    borderColor: theme.goldBorder,
                    backgroundColor: `${theme.danger}12`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sosButton,
                    {
                      backgroundColor: theme.danger,
                      borderColor: `${theme.danger}CC`,
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="alert" size={48} color="#FFFFFF" />
                  )}
                  <Text style={styles.sosText}>SOS</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          <Text
            style={[styles.hint, { color: theme.text }]}
            accessibilityLiveRegion="polite"
          >
            {submitting ? 'Sending alert...' : 'Tap to send alert'}
          </Text>
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.infoIconWrap,
              {
                backgroundColor: theme.iconSurface,
                borderColor: theme.goldBorder,
              },
            ]}
          >
            <Ionicons name="location-outline" size={25} color={theme.primary} />
          </View>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            {canSendWithoutRoom
              ? 'This SOS will be sent without requiring a linked unit.'
              : 'Your unit number and location will be shared with on-duty security staff.'}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 116,
  },
  header: {
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.1,
    marginBottom: 8,
  },
  heading: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    maxWidth: 430,
    fontSize: 15,
    lineHeight: 23,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 34,
  },
  typeBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    maxWidth: '100%',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  sosArea: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sosOuter: {
    width: '76%',
    maxWidth: 268,
    aspectRatio: 1,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
    elevation: 10,
  },
  sosRing: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosInnerRing: {
    width: '88%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: '82%',
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: 2.4,
    marginTop: 5,
  },
  hint: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.62,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 3,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 22,
  },
});
