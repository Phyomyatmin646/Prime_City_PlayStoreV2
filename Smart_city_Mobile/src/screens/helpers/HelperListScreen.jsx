import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
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
import { getProfileTheme } from '../profile/profileTheme';
import {
  fetchHelperCatalog,
  fetchHelperRequests,
  fetchHelpers,
  fetchMyHelperRequests,
  HELPER_CATALOG,
  submitHelperRequest,
} from '../../api/helpers';
import {
  HELPER_GENDER_OPTIONS,
  getHelperServiceIcon,
  normalizeHelperCatalog,
} from './helperUi';

function HelperProgress({ theme, step = 1 }) {
  const firstComplete = step > 1;
  return (
    <View
      style={[
        styles.progressCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.progressItem}>
        <View
          style={[
            styles.progressCircle,
            {
              backgroundColor: firstComplete ? theme.card : theme.primary,
              borderColor: theme.primary,
            },
          ]}
        >
          {firstComplete ? (
            <Ionicons name="checkmark" size={18} color={theme.primary} />
          ) : (
            <Text style={[styles.progressNumber, { color: theme.primaryText }]}>
              1
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.progressLabel,
            { color: step === 1 ? theme.primary : theme.subtext },
          ]}
        >
          Preferences
        </Text>
      </View>
      <View
        style={[styles.progressLine, { backgroundColor: theme.inactive }]}
      />
      <View style={styles.progressItem}>
        <View
          style={[
            styles.progressCircle,
            {
              backgroundColor: step === 2 ? theme.primary : theme.card,
              borderColor: step === 2 ? theme.primary : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.progressNumber,
              { color: step === 2 ? theme.primaryText : theme.subtext },
            ]}
          >
            2
          </Text>
        </View>
        <Text
          style={[
            styles.progressLabel,
            { color: step === 2 ? theme.primary : theme.subtext },
          ]}
        >
          Choose helper
        </Text>
      </View>
    </View>
  );
}

export default function HelperListScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [helpers, setHelpers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [catalog, setCatalog] = useState(HELPER_CATALOG);
  const [category, setCategory] = useState(HELPER_CATALOG[0].name);
  const [gender, setGender] = useState('No Preference');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const isAdmin = ['Admin', 'Staff'].includes(user?.role);
  const compact = width < 360;

  const activeRequestCount = useMemo(
    () => requests.filter(item => item.status !== 'Completed').length,
    [requests],
  );

  const loadHelpers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        if (isAdmin) {
          const requestData = await fetchHelperRequests();
          setRequests(Array.isArray(requestData) ? requestData : []);
        } else {
          const [helperData, requestData, catalogData] = await Promise.all([
            fetchHelpers({ status: 'Active' }),
            fetchMyHelperRequests(),
            fetchHelperCatalog().catch(() => HELPER_CATALOG),
          ]);
          const normalizedCatalog = normalizeHelperCatalog(
            catalogData,
            HELPER_CATALOG,
          );
          setHelpers(Array.isArray(helperData) ? helperData : []);
          setRequests(Array.isArray(requestData) ? requestData : []);
          setCatalog(normalizedCatalog);
          setCategory(current =>
            normalizedCatalog.some(item => item.name === current)
              ? current
              : normalizedCatalog[0]?.name || HELPER_CATALOG[0].name,
          );
        }
      } catch (err) {
        if (err.sessionExpired) return;
        setError(err.message || 'Failed to load helpers');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin],
  );

  useFocusEffect(
    useCallback(() => {
      loadHelpers();
    }, [loadHelpers]),
  );

  const confirmSubmitRequest = item => {
    if (item.submitted_at || submittingId) return;

    const residentName = item.requested_by?.fullname || 'this resident';
    showPrimeAlert(
      'Submit helper request',
      `Accept this request and notify ${residentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmittingId(item._id);
            try {
              const updated = await submitHelperRequest(item._id);
              setRequests(current =>
                current.map(request =>
                  request._id === item._id ? updated : request,
                ),
              );
              showPrimeAlert(
                'Submitted',
                'The helper request was accepted and the resident was notified.',
              );
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Unable to submit',
                  err.message || 'Please try again.',
                );
              }
            } finally {
              setSubmittingId(null);
            }
          },
        },
      ],
    );
  };

  const renderAdminRequest = ({ item }) => {
    const room = item.room_id;
    const resident = item.requested_by;
    const helper = item.helper_id;
    const completed = item.status === 'Completed';
    const submitted = Boolean(item.submitted_at);
    const isSubmitting = submittingId === item._id;
    const statusColor = completed ? theme.success : theme.warning;
    const statusBackground = completed ? theme.successBg : theme.warningBg;

    return (
      <Card
        style={[
          styles.adminRequestCard,
          !submitted && styles.pendingRequestCard,
        ]}
        themeOverride={theme}
      >
        <View style={styles.requestHeader}>
          <View
            style={[
              styles.adminAvatar,
              { backgroundColor: theme.iconSurface, borderColor: theme.border },
            ]}
          >
            <Ionicons
              name={getHelperServiceIcon(item.type)}
              size={28}
              color={theme.primary}
            />
          </View>
          <View style={styles.helperInfo}>
            <Text style={[styles.adminName, { color: theme.text }]}>
              {item.type}
            </Text>
            <Text style={[styles.adminMeta, { color: theme.subtext }]}>
              Room {room?.room_name || 'Unknown'} ·{' '}
              {resident?.fullname || 'Unknown resident'}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusBackground }]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.requestDetails}>
          <View style={styles.requestDetailRow}>
            <Ionicons name="person-outline" size={15} color={theme.primary} />
            <Text style={[styles.requestDetail, { color: theme.subtext }]}>
              Preferred: {item.gender_preferred}
            </Text>
          </View>
          {helper?.fullname ? (
            <View style={styles.requestDetailRow}>
              <Ionicons name="people-outline" size={15} color={theme.primary} />
              <Text style={[styles.requestDetail, { color: theme.subtext }]}>
                Helper: {helper.fullname}
              </Text>
            </View>
          ) : null}
          {resident?.phone ? (
            <View style={styles.requestDetailRow}>
              <Ionicons name="call-outline" size={15} color={theme.primary} />
              <Text style={[styles.requestDetail, { color: theme.subtext }]}>
                Resident phone: {resident.phone}
              </Text>
            </View>
          ) : null}
          {item.quoted_price_mmk != null ? (
            <View style={styles.requestDetailRow}>
              <Ionicons name="cash-outline" size={15} color={theme.primary} />
              <Text style={[styles.requestDetail, { color: theme.primary }]}>
                Price: {Number(item.quoted_price_mmk).toLocaleString('en-US')}{' '}
                MMK{item.service_window ? ` · ${item.service_window}` : ''}
              </Text>
            </View>
          ) : (
            <View style={styles.requestDetailRow}>
              <Ionicons name="cash-outline" size={15} color={theme.primary} />
              <Text style={[styles.requestDetail, { color: theme.subtext }]}>
                Price: Admin confirmation required
              </Text>
            </View>
          )}
          {item.note ? (
            <View
              style={[
                styles.requestNoteBox,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.requestNote, { color: theme.text }]}>
                {item.note}
              </Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.adminSubmitBtn,
            {
              backgroundColor: submitted ? theme.successBg : theme.primary,
              borderColor: submitted ? theme.success : theme.primary,
            },
          ]}
          onPress={() => confirmSubmitRequest(item)}
          disabled={submitted || isSubmitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: submitted || isSubmitting }}
          accessibilityLabel={
            submitted ? 'Helper request submitted' : 'Submit helper request'
          }
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.primaryText} />
          ) : (
            <Ionicons
              name={submitted ? 'checkmark-circle' : 'send-outline'}
              size={18}
              color={submitted ? theme.success : theme.primaryText}
            />
          )}
          <Text
            style={[
              styles.adminSubmitText,
              { color: submitted ? theme.success : theme.primaryText },
            ]}
          >
            {submitted ? 'Submitted' : 'Submit & notify resident'}
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  if (isAdmin) {
    return (
      <ScreenContainer
        navigation={navigation}
        topBarVariant="stack"
        title="Helpers"
        showBottomNav
        themeOverride={theme}
      >
        <FlatList
          data={requests}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.adminList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadHelpers(true)}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <>
              <Text
                style={[
                  styles.eyebrow,
                  styles.adminEyebrow,
                  { color: theme.primary },
                ]}
              >
                ADMIN
              </Text>
              <Text
                style={[
                  styles.heading,
                  styles.adminHeading,
                  { color: theme.text },
                ]}
              >
                Helper Requests
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  styles.adminSubtitle,
                  { color: theme.subtext },
                ]}
              >
                {requests.length} resident request
                {requests.length === 1 ? '' : 's'}
              </Text>
              {error ? (
                <View
                  style={[styles.errorBanner, { borderColor: theme.danger }]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={theme.danger}
                  />
                  <Text style={[styles.errorText, { color: theme.text }]}>
                    {error}
                  </Text>
                </View>
              ) : null}
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <View style={styles.centered}>
                <Ionicons
                  name="people-outline"
                  size={36}
                  color={theme.inactive}
                />
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  No helper requests found
                </Text>
              </View>
            )
          }
          renderItem={renderAdminRequest}
        />
      </ScreenContainer>
    );
  }

  const continueToHelpers = () => {
    navigation.navigate('HelperRequest', { category, gender });
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Helpers"
      showBottomNav
      themeOverride={theme}
    >
      <ScrollView
        contentContainerStyle={styles.residentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHelpers(true)}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          RESIDENT SERVICES
        </Text>
        <Text style={[styles.heading, { color: theme.text }]}>
          Find a Helper
        </Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Choose a service and preference to see matching helpers
        </Text>

        <HelperProgress theme={theme} step={1} />

        {error ? (
          <TouchableOpacity
            style={[styles.errorBanner, { borderColor: theme.danger }]}
            onPress={() => loadHelpers()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={theme.danger}
            />
            <Text style={[styles.errorText, { color: theme.text }]}>
              {error}. Tap to retry.
            </Text>
          </TouchableOpacity>
        ) : null}

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              What service do you need?
            </Text>
            <View style={styles.serviceGrid}>
              {catalog.map(item => {
                const selected = category === item.name;
                return (
                  <TouchableOpacity
                    key={item.name}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.name}
                    style={[
                      styles.serviceTile,
                      compact && styles.fullWidthTile,
                      {
                        backgroundColor: selected
                          ? theme.primaryBg
                          : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setCategory(item.name)}
                    activeOpacity={0.82}
                  >
                    {selected ? (
                      <View
                        style={[
                          styles.selectedMark,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color={theme.primaryText}
                        />
                      </View>
                    ) : null}
                    <Ionicons
                      name={getHelperServiceIcon(item.name)}
                      size={45}
                      color={theme.primary}
                    />
                    <Text style={[styles.serviceName, { color: theme.text }]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={[
                styles.sectionTitle,
                styles.genderTitle,
                { color: theme.text },
              ]}
            >
              Preferred gender
            </Text>
            <View style={styles.genderGrid}>
              {HELPER_GENDER_OPTIONS.map(option => {
                const selected = gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                    style={[
                      styles.genderTile,
                      compact && styles.fullWidthGender,
                      {
                        backgroundColor: selected
                          ? theme.primaryBg
                          : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setGender(option.value)}
                    activeOpacity={0.82}
                  >
                    {selected ? (
                      <View
                        style={[
                          styles.genderMark,
                          { backgroundColor: theme.primary },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={theme.primaryText}
                        />
                      </View>
                    ) : null}
                    <Ionicons
                      name={option.icon}
                      size={31}
                      color={selected ? theme.primary : theme.inactive}
                    />
                    <Text style={[styles.genderLabel, { color: theme.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.infoBanner,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={theme.primary}
              />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Pricing is shown before you submit.{' '}
                {activeRequestCount
                  ? `You currently have ${activeRequestCount} active request${
                      activeRequestCount === 1 ? '' : 's'
                    }.`
                  : 'Admin will review your request after submission.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={continueToHelpers}
              activeOpacity={0.86}
              disabled={!category || helpers.length === 0}
              accessibilityRole="button"
              accessibilityLabel="View matching helpers"
            >
              <Ionicons
                name="people-outline"
                size={24}
                color={theme.primaryText}
              />
              <Text
                style={[styles.primaryButtonText, { color: theme.primaryText }]}
              >
                View matching helpers
              </Text>
              <Ionicons
                name="arrow-forward"
                size={24}
                color={theme.primaryText}
              />
            </TouchableOpacity>
            {helpers.length === 0 ? (
              <Text style={[styles.noHelpersHint, { color: theme.subtext }]}>
                No active helpers are available right now.
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  residentContainer: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 36,
  },
  adminList: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 44,
    flexGrow: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
  adminEyebrow: { letterSpacing: 1.5 },
  adminHeading: { fontSize: 31, fontWeight: '900' },
  adminSubtitle: {
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.24)',
    marginBottom: 18,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 9,
  },
  progressCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNumber: { fontSize: 15, fontWeight: '800' },
  progressLabel: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  progressLine: {
    flex: 1,
    height: 1,
    minWidth: 24,
    marginHorizontal: 12,
    opacity: 0.7,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  serviceTile: {
    width: '48.4%',
    minHeight: 134,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    position: 'relative',
  },
  fullWidthTile: { width: '100%' },
  selectedMark: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 13,
  },
  genderTitle: { marginTop: 25 },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 9,
  },
  genderTile: {
    width: '31%',
    minHeight: 104,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
  },
  fullWidthGender: { width: '100%' },
  genderMark: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 9,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    marginTop: 20,
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  noHelpersHint: { fontSize: 13, textAlign: 'center', marginTop: 10 },
  loadingBlock: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: { fontSize: 15, textAlign: 'center' },
  adminRequestCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 4,
  },
  pendingRequestCard: { borderColor: 'rgba(245, 173, 39, 0.5)' },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  adminAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperInfo: { flex: 1, minWidth: 0 },
  adminName: { fontSize: 17, fontWeight: '900', marginBottom: 4 },
  adminMeta: { fontSize: 13, lineHeight: 18 },
  statusBadge: {
    maxWidth: '31%',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  statusText: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  requestDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.22)',
    marginTop: 14,
    paddingTop: 13,
    gap: 7,
  },
  requestDetailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  requestDetail: { flex: 1, fontSize: 13, lineHeight: 19 },
  requestNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginTop: 3,
  },
  requestNote: { flex: 1, fontSize: 13, lineHeight: 20 },
  adminSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    minHeight: 49,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 14,
  },
  adminSubmitText: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
