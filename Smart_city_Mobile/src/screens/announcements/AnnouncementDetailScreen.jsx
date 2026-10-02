import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText as Text } from '../../components/AppText';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getNotificationTheme } from '../notifications/notificationTheme';
import {
  getAnnouncementStatusPresentation,
  getAnnouncementTypeMeta,
  isAnnouncementAdmin,
} from './AnnouncementsScreen';

export default function AnnouncementDetailScreen({ navigation, route }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const announcementId = route.params?.announcementId;
  const announcement = route.params?.announcement;

  if (!announcementId || !announcement) {
    return (
      <ScreenContainer
        navigation={navigation}
        topBarVariant="stack"
        title="Announcement Details"
        themeOverride={theme}
      >
        <View style={styles.unavailable}>
          <View style={styles.unavailableIcon}>
            <Ionicons
              name="megaphone-outline"
              size={34}
              color={theme.inactive}
            />
          </View>
          <Text style={[styles.unavailableTitle, { color: theme.text }]}>
            Announcement unavailable
          </Text>
          <Text style={[styles.unavailableText, { color: theme.subtext }]}>
            This announcement could not be opened. Return to the announcement
            list and try again.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back to announcements"
            style={[styles.backAction, { backgroundColor: theme.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backActionText, { color: theme.primaryText }]}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const isAdmin = isAnnouncementAdmin(user?.role);
  const typeMeta = getAnnouncementTypeMeta(announcement.type);
  const accentColor = theme[typeMeta.colorKey];
  const statusMeta = getAnnouncementStatusPresentation(
    announcement.status,
    theme,
  );

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Announcement Details"
      themeOverride={theme}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.detailCard,
            { borderLeftColor: accentColor },
            announcement.status === 'Archived' && styles.archivedCard,
          ]}
        >
          <View style={styles.identityRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: accentColor + '18',
                  borderColor: accentColor + '55',
                },
              ]}
            >
              <Ionicons name={typeMeta.icon} size={28} color={accentColor} />
            </View>
            <View style={styles.identityCopy}>
              <Text style={[styles.eyebrow, { color: theme.primary }]}>
                ANNOUNCEMENT
              </Text>
              <View
                style={[
                  styles.typeBadge,
                  {
                    backgroundColor: accentColor + '18',
                    borderColor: accentColor + '55',
                  },
                ]}
              >
                <Text style={[styles.typeText, { color: accentColor }]}>
                  {announcement.type || 'General'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.text }]}
          >
            {announcement.title}
          </Text>
          <Text style={[styles.message, { color: theme.subtext }]}>
            {announcement.message}
          </Text>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={15} color={theme.inactive} />
            <Text style={[styles.date, { color: theme.inactive }]}>
              {announcement.date}
            </Text>
          </View>
        </View>

        {isAdmin ? (
          <View style={styles.metadataCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Lifecycle information
            </Text>
            <View
              style={[styles.metadataRow, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.metadataLabel, { color: theme.subtext }]}>
                Status
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusMeta.backgroundColor },
                ]}
              >
                <Ionicons
                  name={statusMeta.icon}
                  size={14}
                  color={statusMeta.color}
                />
                <Text style={[styles.statusText, { color: statusMeta.color }]}>
                  {announcement.status}
                </Text>
              </View>
            </View>
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: theme.subtext }]}>
                Audience
              </Text>
              <Text style={[styles.metadataValue, { color: theme.text }]}>
                {announcement.audienceType}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 46,
      gap: 14,
    },
    detailCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderLeftWidth: 3,
      borderRadius: 21,
      padding: 19,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 5,
    },
    archivedCard: {
      backgroundColor: theme.elevated,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconWrap: {
      width: 58,
      height: 58,
      flexShrink: 0,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 13,
    },
    identityCopy: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
    },
    eyebrow: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '900',
      letterSpacing: 0.9,
      marginBottom: 7,
    },
    typeBadge: {
      maxWidth: '100%',
      minHeight: 29,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 9,
      borderWidth: 1,
    },
    typeText: {
      flexShrink: 1,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '800',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 18,
    },
    title: {
      fontSize: 25,
      lineHeight: 34,
      fontWeight: '900',
      letterSpacing: -0.5,
    },
    message: {
      marginTop: 12,
      fontSize: 16,
      lineHeight: 27,
    },
    dateRow: {
      marginTop: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    date: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    metadataCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 19,
      padding: 18,
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '900',
      marginBottom: 9,
    },
    metadataRow: {
      minHeight: 55,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingVertical: 10,
    },
    metadataLabel: {
      flexShrink: 0,
      fontSize: 13,
      lineHeight: 19,
    },
    metadataValue: {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      lineHeight: 21,
      fontWeight: '700',
      textAlign: 'right',
    },
    statusBadge: {
      maxWidth: '68%',
      minHeight: 30,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 9,
    },
    statusText: {
      flexShrink: 1,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '800',
    },
    unavailable: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    unavailableIcon: {
      width: 68,
      height: 68,
      borderRadius: 20,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    unavailableTitle: {
      fontSize: 21,
      lineHeight: 28,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 8,
    },
    unavailableText: {
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 20,
    },
    backAction: {
      minHeight: 48,
      borderRadius: 13,
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    backActionText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '900',
    },
  });
