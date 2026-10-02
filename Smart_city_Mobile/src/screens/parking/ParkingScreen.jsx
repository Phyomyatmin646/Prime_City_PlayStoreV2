import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from '../../components/AppText';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { fetchParkingStatus } from '../../api/parking';
import { subscribeToParkingUpdates } from '../../services/parkingSocket';
import { useTheme } from '../../context/ThemeContext';
import { getParkingTheme } from './parkingTheme';

const PARKING_TYPES = [
  {
    type: 'resident',
    title: 'Resident Parking',
    subtitle: 'Parking spaces reserved for Prime City residents',
    icon: 'car-sport-outline',
  },
  {
    type: 'visitor',
    title: 'Visitor Parking',
    subtitle: 'Short-term parking spaces for registered visitors',
    icon: 'people-outline',
  },
];

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUpdatedAt(value) {
  if (!value) return 'Waiting for an update';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Update time unavailable'
    : date.toLocaleString();
}

function ParkingCard({ definition, parking, theme }) {
  if (!parking) {
    return (
      <Card
        style={[
          styles.parkingCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={styles.unavailableRow}>
          <View
            style={[
              styles.cardIcon,
              {
                backgroundColor: theme.iconSurface,
                borderColor: theme.goldBorder,
              },
            ]}
          >
            <Ionicons name={definition.icon} size={27} color={theme.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {definition.title}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.subtext }]}>
              Parking data is not configured yet.
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  const total = number(parking.totalSlot);
  const used = number(parking.usedSlot);
  const maintenance = number(parking.maintenanceSlot);
  const available = number(parking.availableSlot);
  const usable = Math.max(total - maintenance, 0);
  const occupancy = usable > 0 ? Math.min(used / usable, 1) : 0;
  const isFull = available <= 0;
  const statusColor = isFull ? theme.danger : theme.success;
  const statusBackground = isFull ? theme.dangerBg : theme.successBg;
  const occupancyPercent = Math.round(occupancy * 100);

  return (
    <Card
      style={[
        styles.parkingCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIcon,
            {
              backgroundColor: theme.iconSurface,
              borderColor: theme.goldBorder,
            },
          ]}
        >
          <Ionicons name={definition.icon} size={28} color={theme.primary} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {definition.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.subtext }]}>
            {definition.subtitle}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${definition.title} status: ${
            isFull ? 'Full' : 'Available'
          }`}
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusBackground,
              borderColor: `${statusColor}55`,
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isFull ? 'Full' : 'Available'}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.availabilityBox,
          {
            backgroundColor: theme.input,
            borderColor: theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.availableNumber,
            { color: isFull ? theme.danger : theme.primary },
          ]}
        >
          {available}
        </Text>
        <View style={styles.flex}>
          <Text style={[styles.availableLabel, { color: theme.text }]}>
            slots available
          </Text>
          <Text style={[styles.availableMeta, { color: theme.subtext }]}>
            {used} occupied out of {usable} usable spaces
          </Text>
        </View>
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${definition.title} occupancy`}
        accessibilityValue={{ min: 0, max: 100, now: occupancyPercent }}
        style={[styles.progressTrack, { backgroundColor: theme.border }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isFull ? theme.danger : theme.primary,
              width: `${occupancyPercent}%`,
            },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        {[
          ['Total', total],
          ['Occupied', used],
          ['Maintenance', maintenance],
        ].map(([label, value], index) => (
          <View
            key={label}
            style={[
              styles.statItem,
              index > 0 && styles.statDivider,
              index > 0 && { borderLeftColor: theme.border },
            ]}
          >
            <Text style={[styles.statValue, { color: theme.text }]}>
              {value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.subtext }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.updatedRow, { borderTopColor: theme.border }]}>
        <View
          style={[styles.updatedIcon, { backgroundColor: theme.iconSurface }]}
        >
          <Ionicons name="time-outline" size={15} color={theme.primary} />
        </View>
        <Text style={[styles.updatedText, { color: theme.inactive }]}>
          Updated {formatUpdatedAt(parking.updatedAt || parking.updated_at)}
        </Text>
      </View>
    </Card>
  );
}

export default function ParkingScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getParkingTheme(appTheme);
  const [parkingItems, setParkingItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [error, setError] = useState('');

  const parkingByType = useMemo(
    () =>
      Object.fromEntries(
        parkingItems.map(item => [String(item.type).toLowerCase(), item]),
      ),
    [parkingItems],
  );

  const loadParking = useCallback(async (mode = 'initial') => {
    if (mode === 'refresh') setRefreshing(true);
    else if (mode === 'initial') setLoading(true);
    if (mode !== 'silent') setError('');
    try {
      setParkingItems(await fetchParkingStatus());
    } catch (err) {
      if (!err.sessionExpired && mode !== 'silent') {
        setError(err.message || 'Unable to load parking availability');
      }
    } finally {
      setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadParking();
      const timer = setInterval(() => loadParking('silent'), 30_000);
      return () => clearInterval(timer);
    }, [loadParking]),
  );

  useEffect(
    () =>
      subscribeToParkingUpdates(updated => {
        if (!updated?.type) return;
        setParkingItems(current => {
          const withoutUpdated = current.filter(
            item => item.type !== updated.type,
          );
          return [...withoutUpdated, updated];
        });
      }, setRealtimeConnected),
    [],
  );

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Parking Slots"
      showBottomNav
      themeOverride={theme}
    >
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadParking('refresh')}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.headingRow}>
          <View style={styles.flex}>
            <Text style={[styles.heading, { color: theme.text }]}>
              Live parking availability
            </Text>
            <Text style={[styles.headingSubtitle, { color: theme.subtext }]}>
              Resident and visitor slots update from the Prime City parking
              system.
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Parking updates: ${
              realtimeConnected ? 'Live' : 'Refreshing'
            }`}
            style={[
              styles.liveBadge,
              {
                backgroundColor: realtimeConnected
                  ? theme.successBg
                  : theme.input,
                borderColor: realtimeConnected
                  ? `${theme.success}55`
                  : theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: realtimeConnected
                    ? theme.success
                    : theme.inactive,
                },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                {
                  color: realtimeConnected ? theme.success : theme.subtext,
                },
              ]}
            >
              {realtimeConnected ? 'Live' : 'Refreshing'}
            </Text>
          </View>
        </View>

        {error ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.errorBox,
              {
                backgroundColor: theme.dangerBg,
                borderColor: `${theme.danger}66`,
              },
            ]}
          >
            <View
              style={[
                styles.errorIcon,
                { backgroundColor: `${theme.danger}18` },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={theme.danger}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.errorText, { color: theme.danger }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadParking()}
                activeOpacity={0.72}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading parking availability"
              >
                <Text style={[styles.retryText, { color: theme.primary }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {loading && !parkingItems.length ? (
          <View
            style={[
              styles.loader,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            accessibilityLiveRegion="polite"
          >
            <ActivityIndicator
              size="large"
              color={theme.primary}
              accessibilityLabel="Loading parking availability"
            />
          </View>
        ) : (
          PARKING_TYPES.map(definition => (
            <ParkingCard
              key={definition.type}
              definition={definition}
              parking={parkingByType[definition.type]}
              theme={theme}
            />
          ))
        )}

        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.infoIcon,
              {
                backgroundColor: theme.iconSurface,
                borderColor: theme.goldBorder,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={theme.primary}
            />
          </View>
          <Text style={[styles.infoText, { color: theme.text }]}>
            Availability can change as vehicles enter or leave. Pull down to
            refresh if your connection is temporarily offline.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 124,
  },
  flex: { flex: 1 },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  heading: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.45,
    marginBottom: 7,
  },
  headingSubtitle: {
    maxWidth: 430,
    fontSize: 14,
    lineHeight: 21,
  },
  liveBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 2,
  },
  liveText: { fontSize: 12, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  parkingCard: {
    padding: 18,
    borderRadius: 22,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardSubtitle: { fontSize: 12, lineHeight: 18 },
  statusBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: { fontSize: 10, fontWeight: '900' },
  availabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 18,
  },
  availableNumber: {
    minWidth: 48,
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  availableLabel: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  availableMeta: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', marginTop: 18 },
  statItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  statDivider: { borderLeftWidth: 1 },
  statValue: { fontSize: 18, lineHeight: 23, fontWeight: '900' },
  statLabel: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 15,
  },
  updatedIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatedText: { flex: 1, fontSize: 10, lineHeight: 15 },
  unavailableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 82,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { fontSize: 13, lineHeight: 19 },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: 18,
  },
  retryText: { fontSize: 13, fontWeight: '900' },
  loader: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 19, paddingTop: 1 },
});
