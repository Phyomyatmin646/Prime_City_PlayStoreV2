import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  View,
  FlatList,
  ImageBackground,
  Linking,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
// local chat components removed: using global FloatingChat instead
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fetchAnnouncements } from '../../api/announcements';
import { fetchAdvertisements } from '../../api/advertisements';
import { fetchBills } from '../../api/bills';
import { fetchProfile } from '../../api/profile';
import notificationTheme, {
  getNotificationTheme,
} from '../notifications/notificationTheme';

const HOME_HERO_IMAGE = require('../../assets/home-prime-city-night.png');
const HOME_BRAND_IMAGE = require('../../assets/app-icon-master.png');

export const QUICK_ACTIONS = Object.freeze([
  { id: 'bills', label: 'Bills', icon: 'receipt-outline', screen: 'Bills' },
  {
    id: 'helpers',
    label: 'Helpers',
    icon: 'people-outline',
    screen: 'Helpers',
  },
  {
    id: 'visitor',
    label: 'Visitor',
    icon: 'person-add-outline',
    screen: 'PreRegister',
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: 'notifications-outline',
    screen: 'Notifications',
  },
  {
    id: 'parking',
    label: 'Parking Slots',
    icon: 'car-sport-outline',
    screen: 'Parking',
  },
  {
    id: 'rfid-card',
    label: 'My Wallet',
    icon: 'wallet-outline',
    screen: 'RfidCard',
  },
  {
    id: 'playground',
    label: 'Playground',
    icon: 'football-outline',
    screen: 'Playground',
  },
  {
    id: 'news',
    label: 'Announcements',
    icon: 'megaphone-outline',
    screen: 'Announcements',
  },
  {
    id: 'history',
    label: 'My History',
    icon: 'time-outline',
    screen: 'ActivityHistory',
  },
]);

const HOME_ANNOUNCEMENT_TYPES = Object.freeze({
  General: { colorKey: 'primary', icon: 'information-circle-outline' },
  Maintenance: { colorKey: 'warning', icon: 'construct-outline' },
  Event: { colorKey: 'danger', icon: 'calendar-outline' },
});

export const AD_WINDOW_SIZE = 7;
export const AD_ADVANCE_INTERVAL = 4500;

export function getTimeGreeting(date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';

  return 'Good night';
}

export function getAdvertisementWindow(items, startIndex) {
  if (items.length <= AD_WINDOW_SIZE) return items;

  return Array.from(
    { length: AD_WINDOW_SIZE },
    (_, index) => items[(startIndex + index) % items.length],
  );
}

export function getAdvertisementIndex(offset, snapWidth, itemCount) {
  if (!itemCount || !snapWidth) return 0;
  const nextIndex = Math.round(offset / snapWidth);
  return Math.max(0, Math.min(nextIndex, itemCount - 1));
}

export function getHomeIdentity(user) {
  const displayName =
    user?.fullname?.trim() ||
    user?.name?.trim() ||
    user?.email?.split('@')[0] ||
    'Resident';
  const roomNumber = user?.room_number || null;
  const residenceLabel = ['Admin', 'Staff'].includes(user?.role)
    ? user.role === 'Admin'
      ? 'Administrator'
      : 'Staff'
    : roomNumber
    ? `Unit ${roomNumber} · Smart Residential`
    : user?.role || 'Resident';

  return { displayName, residenceLabel };
}

export function isHomeResident(role) {
  return !['Admin', 'Staff'].includes(role);
}

export function getOverdueBills(bills, currentTime, role) {
  if (!isHomeResident(role)) return [];

  return bills.filter(bill => {
    const dueAt = new Date(bill?.due_date).getTime();
    return (
      bill?.status !== 'Paid' &&
      Number.isFinite(dueAt) &&
      dueAt < currentTime.getTime()
    );
  });
}

export function getHomeQuickActions(role) {
  if (role !== 'Admin') return QUICK_ACTIONS;

  return [
    {
      id: 'admin-notifications',
      label: 'Send Noti',
      icon: 'send-outline',
      screen: 'AdminNotifications',
    },
    ...QUICK_ACTIONS.filter(
      action => action.id !== 'history' && !action.residentOnly,
    ).map(action => {
      if (action.id === 'helpers') {
        return { ...action, label: 'Helper Requests' };
      }
      if (action.id === 'rfid-card') {
        return { ...action, label: 'Wallet & Shops' };
      }
      return action;
    }),
    {
      id: 'resident-reports',
      label: 'Resident Reports',
      icon: 'document-text-outline',
      screen: 'AdminReports',
    },
    {
      id: 'ai-feedback-rag',
      label: 'AI Feedback & RAG',
      icon: 'sparkles-outline',
      screen: 'AdminAiReview',
    },
  ];
}

export function AdvertisementCarousel({
  advertisements,
  loading,
  theme = notificationTheme,
}) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  const [failedImages, setFailedImages] = useState({});
  const cardWidth = Math.max(1, width - 36);
  const snapWidth = cardWidth + 12;
  const visibleAdvertisements = useMemo(
    () => getAdvertisementWindow(advertisements, windowStart),
    [advertisements, windowStart],
  );

  useEffect(() => {
    setWindowStart(0);
    setFailedImages({});
  }, [advertisements]);

  useEffect(() => {
    setActiveIndex(0);
    scrollX.setValue(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [advertisements, scrollX, snapWidth, windowStart]);

  useEffect(() => {
    if (visibleAdvertisements.length < 2) return undefined;

    const timer = setInterval(() => {
      setActiveIndex(currentIndex => {
        const nextIndex = currentIndex + 1;

        if (nextIndex < visibleAdvertisements.length) {
          listRef.current?.scrollToOffset({
            offset: nextIndex * snapWidth,
            animated: true,
          });
          return nextIndex;
        }

        if (advertisements.length > AD_WINDOW_SIZE) {
          setWindowStart(
            currentStart =>
              (currentStart + AD_WINDOW_SIZE) % advertisements.length,
          );
        } else {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }

        return 0;
      });
    }, AD_ADVANCE_INTERVAL);

    return () => clearInterval(timer);
  }, [advertisements.length, snapWidth, visibleAdvertisements.length]);

  const onMomentumEnd = event => {
    const offset = event.nativeEvent.contentOffset.x;
    setActiveIndex(
      getAdvertisementIndex(offset, snapWidth, visibleAdvertisements.length),
    );
  };

  if (loading) {
    return (
      <View style={styles.adsSection}>
        <View
          style={[
            styles.adSkeleton,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <ActivityIndicator color={theme.primary} />
        </View>
      </View>
    );
  }

  if (!advertisements.length) return null;

  return (
    <View style={styles.adsSection}>
      <View style={styles.adsHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Featured
        </Text>
        <Text style={[styles.adsCount, { color: theme.subtext }]}>
          {activeIndex + 1}/{visibleAdvertisements.length}
          {advertisements.length > AD_WINDOW_SIZE
            ? ` · ${advertisements.length} total`
            : ''}
        </Text>
      </View>
      <Animated.FlatList
        ref={listRef}
        data={visibleAdvertisements}
        extraData={windowStart}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={snapWidth}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const showImage = item.imageUrl && !failedImages[item.id];
          const inputRange = [
            (index - 1) * snapWidth,
            index * snapWidth,
            (index + 1) * snapWidth,
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.94, 1, 0.94],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.72, 1, 0.72],
            extrapolate: 'clamp',
          });

          const card = (
            <Animated.View
              style={[
                styles.adCard,
                {
                  width: cardWidth,
                  opacity,
                  transform: [{ scale }],
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              {showImage ? (
                <ImageBackground
                  source={{ uri: item.imageUrl }}
                  style={styles.adImage}
                  resizeMode="cover"
                  onError={() =>
                    setFailedImages(current => ({
                      ...current,
                      [item.id]: true,
                    }))
                  }
                  imageStyle={styles.adImageStyle}
                >
                  <View style={styles.adOverallOverlay} />
                  <View style={styles.adImageOverlay}>
                    <View style={styles.adContent}>
                      <Text style={styles.adCompany} numberOfLines={1}>
                        {item.companyName || 'Sponsored'}
                      </Text>
                      <Text style={styles.adTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.adText} numberOfLines={2}>
                        {item.content}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.adLabel,
                      {
                        backgroundColor: theme.surface + 'E6',
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.adLabelText, { color: theme.primary }]}
                    >
                      Ad
                    </Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.adFallback}>
                  <View
                    style={[
                      styles.adFallbackIcon,
                      { backgroundColor: theme.primary + '18' },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={26}
                      color={theme.primary}
                    />
                  </View>
                  <View style={styles.adFallbackCopy}>
                    <Text
                      style={[
                        styles.adFallbackCompany,
                        { color: theme.subtext },
                      ]}
                      numberOfLines={1}
                    >
                      {item.companyName || 'Sponsored'}
                    </Text>
                    <Text
                      style={[styles.adFallbackTitle, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.adFallbackText, { color: theme.subtext }]}
                      numberOfLines={2}
                    >
                      {item.content}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.adLabel,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.adLabelText, { color: theme.primary }]}
                    >
                      Ad
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          );

          return (
            <TouchableOpacity
              activeOpacity={item.linkUrl ? 0.9 : 1}
              disabled={!item.linkUrl}
              onPress={() => Linking.openURL(item.linkUrl).catch(() => null)}
              style={styles.adTouchable}
              accessibilityRole={item.linkUrl ? 'link' : 'text'}
              accessibilityLabel={`${item.companyName || 'Sponsored'}: ${
                item.title
              }`}
              accessibilityHint={
                item.linkUrl ? 'Opens the advertisement link' : undefined
              }
            >
              {card}
            </TouchableOpacity>
          );
        }}
      />
      <View style={styles.adDots}>
        {visibleAdvertisements.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.adDot,
              activeIndex === index ? styles.adDotActive : styles.adDotInactive,
              {
                backgroundColor:
                  activeIndex === index ? theme.primary : theme.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getNotificationTheme(appTheme);
  const heroTheme =
    theme.mode === 'light' ? { text: '#FFFFFF', subtext: '#D9D2CA' } : theme;
  const { user, setUser } = useAuth();
  // chat is managed globally by ChatProvider / FloatingChat
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [announcements, setAnnouncements] = useState([]);
  const [advertisements, setAdvertisements] = useState([]);
  const [residentBills, setResidentBills] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingAdvertisements, setLoadingAdvertisements] = useState(true);
  const { displayName, residenceLabel } = getHomeIdentity(user);
  const timeGreeting = getTimeGreeting(currentTime);
  const isResident = isHomeResident(user?.role);
  const overdueBills = useMemo(
    () => getOverdueBills(residentBills, currentTime, user?.role),
    [currentTime, residentBills, user?.role],
  );
  const quickActions = getHomeQuickActions(user?.role);

  const navigateTo = screen => navigation.navigate(screen);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setUser(current => ({ ...current, ...profile }));
    } catch (err) {
      if (err.sessionExpired) return;
    }
  }, [setUser]);

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const data = await fetchAnnouncements({ limit: 5 });
      setAnnouncements(
        data.map(item => ({
          id: item._id,
          title: item.title,
          message: item.message,
          type: item.type || 'General',
        })),
      );
    } catch (err) {
      if (!err.sessionExpired) setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  const loadAdvertisements = useCallback(async () => {
    setLoadingAdvertisements(true);
    try {
      const data = await fetchAdvertisements({ status: 'all' });
      setAdvertisements(data);
    } catch (err) {
      setAdvertisements([]);
    } finally {
      setLoadingAdvertisements(false);
    }
  }, []);

  const loadResidentBills = useCallback(async () => {
    if (!isResident) {
      setResidentBills([]);
      return;
    }

    try {
      setResidentBills(await fetchBills());
    } catch (err) {
      // Keep the last successful result during a temporary network failure so
      // an existing overdue warning does not disappear incorrectly.
      if (err.sessionExpired) setResidentBills([]);
    }
  }, [isResident]);

  useFocusEffect(
    useCallback(() => {
      setCurrentTime(new Date());
      refreshProfile();
      loadAnnouncements();
      loadAdvertisements();
      loadResidentBills();
    }, [
      loadAdvertisements,
      loadAnnouncements,
      loadResidentBills,
      refreshProfile,
    ]),
  );

  return (
    <ScreenContainer
      navigation={navigation}
      themeOverride={theme}
      topBarBrandImage={HOME_BRAND_IMAGE}
      topBarBrandLabel="Prime City"
    >
      <FlatList
        data={announcements}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <ImageBackground
              source={HOME_HERO_IMAGE}
              style={[
                styles.hero,
                {
                  borderColor: theme.goldBorder,
                  shadowColor: theme.shadow,
                },
              ]}
              imageStyle={styles.heroImage}
              resizeMode="cover"
              accessible
              accessibilityLabel={`${timeGreeting}. Welcome, ${displayName}. ${residenceLabel}.`}
            >
              <View style={styles.heroOverallOverlay} />
              <View style={styles.heroLeftScrim} />
              <View style={styles.heroBottomScrim} />
              <View style={styles.heroCopy}>
                <Text style={[styles.greeting, { color: heroTheme.subtext }]}>
                  {timeGreeting}
                </Text>
                <Text
                  accessibilityRole="header"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.64}
                  style={[styles.heading, { color: heroTheme.text }]}
                >
                  Welcome, {displayName}
                </Text>
                <Text style={[styles.sub, { color: heroTheme.subtext }]}>
                  {residenceLabel}
                </Text>
              </View>
            </ImageBackground>

            {overdueBills.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open overdue bills. ${
                  overdueBills.length
                } ${
                  overdueBills.length === 1 ? 'bill is' : 'bills are'
                } past due.`}
                activeOpacity={0.86}
                onPress={() => navigateTo('Bills')}
                style={[
                  styles.overdueBanner,
                  {
                    backgroundColor: theme.dangerBg,
                    borderColor: theme.danger,
                  },
                ]}
              >
                <View style={styles.overdueIcon}>
                  <Ionicons
                    name="warning-outline"
                    size={25}
                    color={theme.danger}
                  />
                </View>
                <View style={styles.overdueCopy}>
                  <Text style={[styles.overdueTitle, { color: theme.danger }]}>
                    Payment overdue
                  </Text>
                  <Text
                    style={[styles.overdueMessage, { color: theme.danger }]}
                  >
                    {overdueBills.length}{' '}
                    {overdueBills.length === 1 ? 'bill is' : 'bills are'} past
                    due. Please pay now to avoid electricity and water service
                    suspension.
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.danger}
                />
              </TouchableOpacity>
            ) : null}

            <AdvertisementCarousel
              advertisements={advertisements}
              loading={loadingAdvertisements}
              theme={theme}
            />

            <View
              style={[
                styles.quickActionsPanel,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.goldBorder,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <Text style={[styles.quickActionsTitle, { color: theme.text }]}>
                Quick actions
              </Text>
              <View style={styles.actionsRow}>
                {quickActions.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${action.label} quick action`}
                    style={[
                      styles.actionBtn,
                      styles.actionGoldBorder,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.goldBorder,
                      },
                    ]}
                    activeOpacity={0.76}
                    onPress={() => navigateTo(action.screen)}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        {
                          backgroundColor: theme.primaryBg,
                          borderColor: theme.goldBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name={action.icon}
                        size={30}
                        color={theme.primary}
                      />
                    </View>
                    <Text
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      style={[styles.actionLabel, { color: theme.text }]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!['Admin', 'Staff'].includes(user?.role) ? (
              <View
                style={[
                  styles.reportCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <View style={styles.reportRow}>
                  <View
                    style={[
                      styles.reportIcon,
                      {
                        backgroundColor: theme.warningBg,
                        borderColor: theme.goldBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color={theme.warning}
                    />
                  </View>
                  <View style={styles.reportCopy}>
                    <Text style={[styles.reportTitle, { color: theme.text }]}>
                      Submit a report
                    </Text>
                    <Text style={[styles.reportSub, { color: theme.subtext }]}>
                      Maintenance, security, or community issues
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Report now"
                  style={[
                    styles.reportBtn,
                    theme.mode === 'light'
                      ? styles.reportLightBorder
                      : styles.reportGoldBorder,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={() => navigateTo('ReportIssue')}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="send-outline"
                    size={17}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[styles.reportBtnText, { color: theme.primaryText }]}
                  >
                    Report now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={[styles.latestTitle, { color: theme.text }]}>
              Latest announcements
            </Text>
          </>
        }
        ListEmptyComponent={
          loadingAnnouncements ? (
            <View style={styles.emptyAnnouncements}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.emptyRow}>
                <Ionicons
                  name="megaphone-outline"
                  size={20}
                  color={theme.inactive}
                />
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  No announcements yet
                </Text>
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          const typeMeta =
            HOME_ANNOUNCEMENT_TYPES[item.type] ||
            HOME_ANNOUNCEMENT_TYPES.General;
          const accentColor = theme[typeMeta.colorKey];
          const accentBg = theme[`${typeMeta.colorKey}Bg`] || theme.primaryBg;
          return (
            <View
              style={[
                styles.announcementCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderLeftColor: accentColor,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
                  <Ionicons
                    name={typeMeta.icon}
                    size={14}
                    color={accentColor}
                  />
                  <Text style={[styles.typeText, { color: accentColor }]}>
                    {item.type}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardText, { color: theme.subtext }]}>
                {item.message}
              </Text>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },
  hero: {
    width: '100%',
    aspectRatio: 1.58,
    minHeight: 225,
    maxHeight: 270,
    marginBottom: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#3B3327',
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 7,
  },
  heroImage: { borderRadius: 22 },
  heroOverallOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  heroLeftScrim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '82%',
    backgroundColor: 'rgba(3, 5, 6, 0.58)',
  },
  heroBottomScrim: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '34%',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  heroCopy: {
    maxWidth: '80%',
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  greeting: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  heading: {
    fontSize: 29,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 7,
  },
  sub: { fontSize: 15, lineHeight: 23, fontWeight: '600' },
  overdueBanner: {
    minHeight: 96,
    marginBottom: 24,
    padding: 15,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  overdueIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(240, 82, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCopy: { flex: 1 },
  overdueTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  overdueMessage: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  adsSection: { marginBottom: 26 },
  adsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adsCount: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
  adTouchable: { marginRight: 12 },
  adCard: {
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  adImage: { flex: 1 },
  adImageStyle: { borderRadius: 20 },
  adOverallOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  adImageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  adContent: {
    width: '100%',
    alignSelf: 'stretch',
    padding: 17,
    paddingRight: 22,
    backgroundColor: 'rgba(2, 4, 5, 0.58)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  adCompany: {
    color: '#D9D2CA',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  adTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  adText: {
    color: '#D9D2CA',
    fontSize: 13,
    lineHeight: 18,
  },
  adLabel: {
    position: 'absolute',
    top: 14,
    right: 14,
    minWidth: 34,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adLabelText: { fontSize: 13, fontWeight: '800' },
  adFallback: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adFallbackIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adFallbackCopy: { flex: 1 },
  adFallbackCompany: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  adFallbackTitle: { fontSize: 18, fontWeight: '800', marginBottom: 5 },
  adFallbackText: { fontSize: 13, lineHeight: 18 },
  adSkeleton: {
    height: 180,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  adDot: {
    height: 7,
    borderRadius: 4,
  },
  adDotActive: { width: 18 },
  adDotInactive: { width: 7 },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '900',
    marginBottom: 12,
  },
  quickActionsPanel: {
    marginBottom: 26,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#F5AD27',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 4,
  },
  quickActionsTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '900',
    marginHorizontal: 2,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '48.35%',
    minHeight: 108,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGoldBorder: { borderColor: 'rgba(245, 173, 39, 0.5)' },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  reportCard: {
    marginBottom: 26,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  reportRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  reportCopy: { flex: 1 },
  reportTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  reportSub: { fontSize: 13, lineHeight: 18 },
  reportBtn: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  reportGoldBorder: { borderColor: '#FFD56A' },
  reportLightBorder: { borderColor: '#B87508' },
  reportBtnText: { fontSize: 14, fontWeight: '700' },
  latestTitle: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '900',
    marginBottom: 12,
  },
  announcementCard: {
    padding: 17,
    marginBottom: 12,
    borderRadius: 19,
    borderWidth: 1,
    borderLeftWidth: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },
  cardHeader: { marginBottom: 8 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { fontSize: 12, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardText: { fontSize: 14, lineHeight: 21 },
  emptyAnnouncements: { paddingVertical: 20 },
  emptyCard: {
    padding: 17,
    borderRadius: 19,
    borderWidth: 1,
  },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14 },
});
