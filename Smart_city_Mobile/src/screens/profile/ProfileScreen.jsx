import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchProfile } from '../../api/profile';
import { getMyanmarTextStyle } from '../../theme/typography';
import { getProfileTheme } from './profileTheme';

const PROFILE_FIELDS = [
  { key: 'fullname', label: 'Name', icon: 'person-outline' },
  { key: 'email', label: 'Email', icon: 'mail-outline' },
  { key: 'phone', label: 'Phone', icon: 'call-outline' },
  { key: 'room_number', label: 'Unit', icon: 'home-outline' },
];

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

export default function ProfileScreen({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDark = theme.mode === 'dark';
  const isCompact = width < 360;
  const profileTheme = getProfileTheme(theme);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await fetchProfile();
      setProfile(user);
    } catch (err) {
      if (err.sessionExpired) return;
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const onSignOut = () => {
    showPrimeAlert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const displayValue = key => {
    const value = profile?.[key];
    if (value == null || value === '') return '—';
    return String(value);
  };

  const initials = getInitials(profile?.fullname);
  const unitText = profile?.room_number ? `Unit ${profile.room_number}` : null;

  return (
    <ScreenContainer navigation={navigation} themeOverride={profileTheme}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          (loading || error) && styles.stateContainer,
        ]}
      >
        {loading ? (
          <View
            style={[
              styles.centered,
              styles.stateCard,
              {
                backgroundColor: profileTheme.card,
                borderColor: profileTheme.border,
                shadowColor: profileTheme.shadow,
              },
            ]}
          >
            <ActivityIndicator size="large" color={profileTheme.primary} />
          </View>
        ) : error ? (
          <View
            style={[
              styles.centered,
              styles.stateCard,
              {
                backgroundColor: profileTheme.card,
                borderColor: profileTheme.border,
                shadowColor: profileTheme.shadow,
              },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color={profileTheme.danger}
            />
            <Text
              style={[
                styles.errorText,
                getMyanmarTextStyle(error),
                { color: profileTheme.text },
              ]}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={[
                styles.retryBtn,
                { backgroundColor: profileTheme.primary },
              ]}
              onPress={loadProfile}
              activeOpacity={0.82}
            >
              <Text
                style={[styles.retryText, { color: profileTheme.primaryText }]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.avatarSection,
                isCompact && styles.avatarSectionCompact,
                isDark ? styles.heroShadowDark : styles.heroShadowLight,
                {
                  backgroundColor: profileTheme.card,
                  borderColor: profileTheme.goldBorder,
                  shadowColor: profileTheme.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.avatarRing,
                  { borderColor: profileTheme.primary },
                ]}
              >
                {profile?.profile_image ? (
                  <Image
                    source={{ uri: profile.profile_image }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: profileTheme.raised },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        getMyanmarTextStyle(initials, 'bold'),
                        { color: profileTheme.text },
                      ]}
                    >
                      {initials}
                    </Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.identityContent,
                  isCompact && styles.identityContentCompact,
                ]}
              >
                <Text
                  style={[
                    styles.name,
                    isCompact && styles.centeredText,
                    getMyanmarTextStyle(profile?.fullname, 'bold'),
                    { color: profileTheme.text },
                  ]}
                >
                  {profile?.fullname}
                </Text>
                {profile?.room_number ? (
                  <Text
                    style={[
                      styles.unit,
                      isCompact && styles.centeredText,
                      getMyanmarTextStyle(unitText, 'thin'),
                      { color: profileTheme.subtext },
                    ]}
                  >
                    {unitText}
                  </Text>
                ) : null}
                {profile?.role ? (
                  <Text
                    style={[
                      styles.role,
                      isCompact && styles.roleCompact,
                      getMyanmarTextStyle(profile.role, 'bold'),
                      {
                        color: profileTheme.primary,
                        borderColor: profileTheme.primary,
                        backgroundColor: profileTheme.iconSurface,
                      },
                    ]}
                  >
                    {profile.role}
                  </Text>
                ) : null}
              </View>
            </View>

            <Card
              style={[
                styles.profileCard,
                isDark ? styles.cardShadowDark : styles.cardShadowLight,
                {
                  backgroundColor: profileTheme.card,
                  borderColor: profileTheme.border,
                  shadowColor: profileTheme.shadow,
                },
              ]}
            >
              {PROFILE_FIELDS.map((field, index) => {
                const fieldValue = displayValue(field.key);

                return (
                  <View
                    key={field.key}
                    style={[
                      styles.fieldRow,
                      index < PROFILE_FIELDS.length - 1 && styles.fieldDivider,
                      { borderBottomColor: profileTheme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.fieldIcon,
                        {
                          backgroundColor: profileTheme.iconSurface,
                          borderColor: profileTheme.goldBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name={field.icon}
                        size={20}
                        color={profileTheme.primary}
                      />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: profileTheme.subtext },
                        ]}
                      >
                        {field.label}
                      </Text>
                      <Text
                        style={[
                          styles.fieldValue,
                          getMyanmarTextStyle(fieldValue, 'bold'),
                          { color: profileTheme.text },
                        ]}
                      >
                        {fieldValue}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>

            <Card
              style={[
                styles.settingsCard,
                isDark ? styles.cardShadowDark : styles.cardShadowLight,
                {
                  backgroundColor: profileTheme.card,
                  borderColor: profileTheme.border,
                  shadowColor: profileTheme.shadow,
                },
              ]}
            >
              <View style={styles.settingRow}>
                <View
                  style={[
                    styles.fieldIcon,
                    {
                      backgroundColor: profileTheme.iconSurface,
                      borderColor: profileTheme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={20}
                    color={profileTheme.primary}
                  />
                </View>
                <View style={styles.fieldContent}>
                  <Text
                    style={[styles.fieldLabel, { color: profileTheme.subtext }]}
                  >
                    Appearance
                  </Text>
                  <Text
                    style={[styles.fieldValue, { color: profileTheme.text }]}
                  >
                    {isDark ? 'Dark mode' : 'Light mode'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{
                    false: profileTheme.switchOff,
                    true: profileTheme.primary,
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={profileTheme.switchOff}
                />
              </View>
            </Card>

            <View
              style={[
                styles.accountActions,
                isCompact && styles.accountActionsCompact,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: profileTheme.card,
                    borderColor: profileTheme.goldBorder,
                    shadowColor: profileTheme.shadow,
                  },
                ]}
                onPress={() => navigation.navigate('ProfileSettings')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={profileTheme.primary}
                />
                <Text style={[styles.actionText, { color: profileTheme.text }]}>
                  Settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: profileTheme.card,
                    borderColor: profileTheme.danger,
                    shadowColor: profileTheme.shadow,
                  },
                ]}
                onPress={onSignOut}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={profileTheme.danger}
                />
                <Text
                  style={[styles.actionText, { color: profileTheme.danger }]}
                >
                  Sign out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  stateContainer: { justifyContent: 'center' },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 44,
    gap: 12,
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 4,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 8,
    minHeight: 44,
    minWidth: 112,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontSize: 14, fontWeight: '700' },
  avatarSection: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderRadius: 22,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 5,
  },
  avatarSectionCompact: {
    flexDirection: 'column',
    paddingVertical: 20,
  },
  heroShadowDark: { shadowOpacity: 0.34 },
  heroShadowLight: { shadowOpacity: 0.14 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarText: { fontSize: 30, fontWeight: '800', letterSpacing: 0.5 },
  identityContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 20,
    alignItems: 'flex-start',
  },
  identityContentCompact: {
    marginLeft: 0,
    marginTop: 16,
    alignItems: 'center',
  },
  name: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.45,
    marginBottom: 6,
  },
  centeredText: { textAlign: 'center' },
  unit: { fontSize: 14, lineHeight: 20 },
  role: {
    overflow: 'hidden',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textTransform: 'capitalize',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 10,
  },
  roleCompact: { alignSelf: 'center' },
  profileCard: {
    paddingHorizontal: 18,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  cardShadowDark: { shadowOpacity: 0.28 },
  cardShadowLight: { shadowOpacity: 0.11 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingVertical: 12,
  },
  fieldDivider: { borderBottomWidth: 1 },
  fieldIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fieldContent: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  fieldValue: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  settingsCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
  accountActions: { flexDirection: 'row', gap: 10 },
  accountActionsCompact: { flexDirection: 'column' },
  actionBtn: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 15,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 2,
  },
  actionText: { fontSize: 15, fontWeight: '700' },
});
