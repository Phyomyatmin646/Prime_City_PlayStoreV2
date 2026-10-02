import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { fetchProfile, uploadProfileImage } from '../../api/profile';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { openSystemNotificationSettings } from '../../services/pushNotifications';
import { getProfileTheme } from './profileTheme';
import {
  containsMyanmarText,
  getMyanmarTextStyle,
} from '../../theme/typography';

const READ_ONLY_FIELDS = [
  { key: 'fullname', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'room_number', label: 'Unit' },
];

const FIELD_ICONS = {
  fullname: 'person-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  room_number: 'home-outline',
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

export default function ProfileSettingsScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(!user);
  const [uploading, setUploading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const currentProfile = await fetchProfile();
      setProfile(currentProfile);
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to load profile',
          err.message || 'Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const selectProfileImage = async () => {
    if (uploading) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.85,
        maxWidth: 1200,
        maxHeight: 1200,
        assetRepresentationMode: 'compatible',
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Unable to open photo library');
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error('No image was selected');
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('Profile image must be 5 MB or smaller');
      }

      setUploading(true);
      const updated = await uploadProfileImage(asset);
      setProfile(current => ({ ...current, ...updated }));
      setUser(current => ({
        ...current,
        profile_image: updated.profile_image,
      }));
      showPrimeAlert('Profile updated', 'Your profile photo has been saved.');
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to update photo',
          err.message || 'Please try again.',
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const initials = getInitials(profile?.fullname);

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Settings"
      themeOverride={theme}
      showBottomNav
      activeRoute="Profile"
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          loading && styles.loadingContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <>
            <Card
              style={[
                styles.card,
                styles.photoCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.goldBorder,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.cardTitleRow}>
                <View
                  style={[
                    styles.titleIcon,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="camera-outline"
                    size={21}
                    color={theme.primary}
                  />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Profile photo
                </Text>
              </View>
              <View style={styles.photoSection}>
                {profile?.profile_image ? (
                  <Image
                    source={{ uri: profile.profile_image }}
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: theme.raised,
                        borderColor: theme.primary,
                      },
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      {
                        backgroundColor: theme.raised,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarText,
                        containsMyanmarText(initials) &&
                          styles.myanmarAvatarText,
                        getMyanmarTextStyle(initials, 'bold'),
                        { color: theme.text },
                      ]}
                    >
                      {initials}
                    </Text>
                  </View>
                )}
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    style={[
                      styles.photoButton,
                      {
                        backgroundColor: theme.input,
                        borderColor: theme.primary,
                      },
                      uploading && styles.photoButtonDisabled,
                    ]}
                    onPress={selectProfileImage}
                    disabled={uploading}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: uploading }}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons
                        name="images-outline"
                        size={19}
                        color={theme.primary}
                      />
                    )}
                    <Text
                      style={[styles.photoButtonText, { color: theme.primary }]}
                    >
                      {uploading ? 'Uploading...' : 'Choose photo'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.photoHint, { color: theme.subtext }]}>
                    JPEG, PNG or WebP · Maximum 5 MB
                  </Text>
                </View>
              </View>
            </Card>

            <Card
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.readOnlyHeader}>
                <View
                  style={[
                    styles.headerIcon,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Notification alerts
                  </Text>
                  <Text style={[styles.readOnlyText, { color: theme.subtext }]}>
                    Allow Prime City notifications, sound and vibration to
                    receive important updates while the app is in the background
                    or closed.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.settingsButton,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() =>
                  openSystemNotificationSettings().catch(() =>
                    showPrimeAlert(
                      'Unable to open settings',
                      'Open Android Settings, then enable Prime City notifications and sound.',
                    ),
                  )
                }
                activeOpacity={0.78}
                accessibilityRole="button"
              >
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={theme.primary}
                />
                <Text
                  style={[styles.settingsButtonText, { color: theme.primary }]}
                >
                  Open notification settings
                </Text>
              </TouchableOpacity>
            </Card>

            <Card
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.readOnlyHeader}>
                <View
                  style={[
                    styles.headerIcon,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Account information
                  </Text>
                  <Text style={[styles.readOnlyText, { color: theme.subtext }]}>
                    These details are read-only and can only be changed by an
                    administrator.
                  </Text>
                </View>
              </View>

              <View style={[styles.fields, { borderTopColor: theme.border }]}>
                {READ_ONLY_FIELDS.map((field, index) => {
                  const value = profile?.[field.key] || '—';

                  return (
                    <View
                      key={field.key}
                      style={[
                        styles.fieldRow,
                        index < READ_ONLY_FIELDS.length - 1 &&
                          styles.fieldDivider,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.fieldIcon,
                          {
                            backgroundColor: theme.input,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={FIELD_ICONS[field.key]}
                          size={21}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.fieldCopy}>
                        <Text
                          style={[styles.fieldLabel, { color: theme.subtext }]}
                        >
                          {field.label}
                        </Text>
                        <Text
                          style={[
                            styles.fieldValue,
                            containsMyanmarText(value) &&
                              styles.myanmarFieldValue,
                            getMyanmarTextStyle(value, 'bold'),
                            { color: theme.text },
                          ]}
                        >
                          {value}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.lockIcon,
                          { backgroundColor: theme.iconSurface },
                        ]}
                      >
                        <Ionicons
                          name="lock-closed"
                          size={15}
                          color={theme.inactive}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
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
    paddingBottom: 44,
    gap: 16,
  },
  loadingContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: 0,
    padding: 18,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 4,
  },
  photoCard: { borderWidth: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  photoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  avatarFallback: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 34, lineHeight: 42, fontWeight: '800' },
  myanmarAvatarText: { lineHeight: 54 },
  photoActions: { flex: 1, minWidth: 0, gap: 10 },
  photoButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  photoButtonDisabled: { opacity: 0.6 },
  photoButtonText: { flexShrink: 1, fontSize: 14, fontWeight: '800' },
  photoHint: { fontSize: 12, lineHeight: 17 },
  readOnlyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0, paddingTop: 1 },
  readOnlyText: { fontSize: 13, lineHeight: 20, marginTop: 5 },
  fields: { borderTopWidth: 1, marginTop: 16 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  fieldDivider: { borderBottomWidth: 1 },
  fieldIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldCopy: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, lineHeight: 16, marginBottom: 3 },
  fieldValue: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  myanmarFieldValue: { lineHeight: 28 },
  lockIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 18,
  },
  settingsButtonText: { flexShrink: 1, fontSize: 14, fontWeight: '800' },
});
