import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useTheme } from '../../context/ThemeContext';
import { getProfileTheme } from '../profile/profileTheme';
import {
  createHelperRequest,
  fetchHelperCatalog,
  fetchHelpers,
  HELPER_CATALOG,
} from '../../api/helpers';
import {
  buildHelperQuery,
  buildHelperRequestPayload,
  filterMatchingHelpers,
  getHelperServiceIcon,
  normalizeHelperCatalog,
} from './helperUi';

function Progress({ theme }) {
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
            { backgroundColor: theme.card, borderColor: theme.primary },
          ]}
        >
          <Ionicons name="checkmark" size={18} color={theme.primary} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.subtext }]}>
          Preferences
        </Text>
      </View>
      <View style={[styles.progressLine, { backgroundColor: theme.primary }]} />
      <View style={styles.progressItem}>
        <View
          style={[
            styles.progressCircle,
            { backgroundColor: theme.primary, borderColor: theme.primary },
          ]}
        >
          <Text style={[styles.progressNumber, { color: theme.primaryText }]}>
            2
          </Text>
        </View>
        <Text style={[styles.progressLabel, { color: theme.primary }]}>
          Choose helper
        </Text>
      </View>
    </View>
  );
}

function getExperienceText(value) {
  const years = Number(value || 0);
  if (!years) return 'New helper';
  if (years === 1) return '1 year experience';
  return `${years} years experience`;
}

function getInitials(name) {
  return String(name || 'Helper')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export default function HelperRequestScreen({ navigation, route }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const routeHelper = route?.params?.helper || null;
  const initialCategory =
    route?.params?.category && route.params.category !== 'All'
      ? route.params.category
      : 'House Helper';
  const initialGender =
    route?.params?.gender || routeHelper?.gender || 'No Preference';

  const [category] = useState(initialCategory);
  const [gender] = useState(initialGender);
  const [catalog, setCatalog] = useState(HELPER_CATALOG);
  const [helpers, setHelpers] = useState([]);
  const [selectedHelper, setSelectedHelper] = useState(routeHelper);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedPricing = useMemo(
    () => catalog.find(item => item.name === category),
    [catalog, category],
  );

  const loadMatchingHelpers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [helperData, catalogData] = await Promise.all([
          fetchHelpers(buildHelperQuery(gender)),
          fetchHelperCatalog().catch(() => HELPER_CATALOG),
        ]);
        const matches = filterMatchingHelpers(helperData, gender);
        setHelpers(matches);
        setCatalog(normalizeHelperCatalog(catalogData, HELPER_CATALOG));
        setSelectedHelper(current => {
          if (!current?._id) return null;
          return matches.find(item => item._id === current._id) || null;
        });
      } catch (err) {
        if (err.sessionExpired) return;
        setHelpers([]);
        setError(err.message || 'Unable to load matching helpers');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [gender],
  );

  useFocusEffect(
    useCallback(() => {
      loadMatchingHelpers();
    }, [loadMatchingHelpers]),
  );

  const onSubmit = async () => {
    if (!helpers.length || submitting) return;
    setSubmitting(true);
    try {
      await createHelperRequest(
        buildHelperRequestPayload({
          category,
          gender,
          note,
          helper: selectedHelper,
        }),
      );

      showPrimeAlert(
        'Request sent',
        'Admin staff will review your helper request.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Request failed',
          err.message || 'Unable to request helper.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderHelperChoice = helper => {
    const selected = selectedHelper?._id === helper._id;
    return (
      <TouchableOpacity
        key={helper._id}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={`Choose ${helper.fullname}`}
        style={[
          styles.helperCard,
          {
            backgroundColor: selected ? theme.primaryBg : theme.card,
            borderColor: selected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => setSelectedHelper(helper)}
        activeOpacity={0.84}
      >
        <View style={styles.helperTopRow}>
          {helper.photo ? (
            <Image
              source={{ uri: helper.photo }}
              style={[styles.avatar, { borderColor: theme.goldBorder }]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                {
                  backgroundColor: theme.iconSurface,
                  borderColor: theme.goldBorder,
                },
              ]}
            >
              <Text style={[styles.initials, { color: theme.primary }]}>
                {getInitials(helper.fullname)}
              </Text>
            </View>
          )}
          <View style={styles.helperCopy}>
            <View style={styles.helperNameRow}>
              <Text
                style={[styles.helperName, { color: theme.text }]}
                numberOfLines={1}
              >
                {helper.fullname || 'Helper'}
              </Text>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={selected ? theme.primary : theme.inactive}
              />
            </View>
            <Text style={[styles.helperMeta, { color: theme.subtext }]}>
              {[helper.gender, getExperienceText(helper.experience)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {helper.phone ? (
              <View style={styles.phoneRow}>
                <Ionicons name="call-outline" size={15} color={theme.subtext} />
                <Text style={[styles.phoneText, { color: theme.subtext }]}>
                  {helper.phone}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View
          style={[styles.activeBadge, { backgroundColor: theme.successBg }]}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={15}
            color={theme.success}
          />
          <Text style={[styles.activeBadgeText, { color: theme.success }]}>
            {helper.status || 'Active'}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMatchingHelpers(true)}
            tintColor={theme.primary}
          />
        }
      >
        <Text style={[styles.eyebrow, { color: theme.primary }]}>
          RESIDENT SERVICES
        </Text>
        <Text style={[styles.heading, { color: theme.text }]}>
          Matching Helpers
        </Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>
          Choose a helper for your {category.toLowerCase()} request
        </Text>

        <Progress theme={theme} />

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.summaryItem}>
            <Ionicons
              name={getHelperServiceIcon(category)}
              size={31}
              color={theme.primary}
            />
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {category}
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: theme.border }]}
          />
          <View style={styles.summaryItem}>
            <Ionicons
              name={
                gender === 'Female'
                  ? 'female-outline'
                  : gender === 'Male'
                  ? 'male-outline'
                  : 'male-female-outline'
              }
              size={29}
              color={theme.primary}
            />
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {gender === 'No Preference' ? 'Any gender' : gender}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Change helper preferences"
          >
            <Text style={[styles.changeText, { color: theme.primary }]}>
              Change
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <TouchableOpacity
            style={[styles.errorBanner, { borderColor: theme.danger }]}
            onPress={() => loadMatchingHelpers()}
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
            <Text style={[styles.resultCount, { color: theme.subtext }]}>
              {helpers.length} active helper{helpers.length === 1 ? '' : 's'}{' '}
              found
            </Text>

            {helpers.length ? (
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedHelper === null }}
                accessibilityLabel="Choose any active helper"
                style={[
                  styles.anyHelperCard,
                  {
                    backgroundColor:
                      selectedHelper === null ? theme.primaryBg : theme.card,
                    borderColor:
                      selectedHelper === null ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedHelper(null)}
                activeOpacity={0.84}
              >
                <View
                  style={[
                    styles.anyIcon,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.goldBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={27}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.anyCopy}>
                  <Text style={[styles.anyTitle, { color: theme.text }]}>
                    Any active helper
                  </Text>
                  <Text style={[styles.anySubtitle, { color: theme.subtext }]}>
                    Admin may assign one of these matching helpers
                  </Text>
                </View>
                <Ionicons
                  name={
                    selectedHelper === null
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={25}
                  color={
                    selectedHelper === null ? theme.primary : theme.inactive
                  }
                />
              </TouchableOpacity>
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={38}
                  color={theme.inactive}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  No matching helpers
                </Text>
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  Go back and change your gender preference, or pull down to
                  refresh.
                </Text>
                <TouchableOpacity
                  style={[styles.outlineButton, { borderColor: theme.primary }]}
                  onPress={() => navigation.goBack()}
                >
                  <Text
                    style={[styles.outlineButtonText, { color: theme.primary }]}
                  >
                    Change preferences
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {helpers.map(renderHelperChoice)}

            <Card style={styles.pricingCard} themeOverride={theme}>
              <View style={styles.pricingHeader}>
                <View
                  style={[
                    styles.pricingIcon,
                    { backgroundColor: theme.iconSurface },
                  ]}
                >
                  <Ionicons
                    name="cash-outline"
                    size={22}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.pricingCopy}>
                  <Text style={[styles.pricingTitle, { color: theme.text }]}>
                    Service price
                  </Text>
                  {selectedPricing?.amount_mmk != null ? (
                    <Text
                      style={[styles.pricingAmount, { color: theme.primary }]}
                    >
                      {Number(selectedPricing.amount_mmk).toLocaleString(
                        'en-US',
                      )}{' '}
                      MMK
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.pricingAmountSmall,
                        { color: theme.primary },
                      ]}
                    >
                      Admin confirmation required
                    </Text>
                  )}
                </View>
              </View>
              {selectedPricing?.service_window ? (
                <Text style={[styles.pricingDetail, { color: theme.subtext }]}>
                  {selectedPricing.service_window}
                </Text>
              ) : null}
              <Text style={[styles.pricingNote, { color: theme.subtext }]}>
                {selectedPricing?.amount_mmk != null
                  ? 'This price is saved with your request for Admin review.'
                  : 'Admin will confirm the price and schedule for this category.'}
              </Text>
            </Card>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Additional notes (optional)
            </Text>
            <View
              style={[
                styles.textAreaWrap,
                { backgroundColor: theme.input, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color={theme.inactive}
                style={styles.noteIcon}
              />
              <TextInput
                style={[styles.textArea, { color: theme.text }]}
                placeholder="Schedule, tasks or access notes"
                placeholderTextColor={theme.inactive}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View
              style={[
                styles.infoBanner,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={23}
                color={theme.primary}
              />
              <Text style={[styles.infoText, { color: theme.subtext }]}>
                Your selected service, gender preference and optional helper
                will be sent to Admin for review.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary },
                (!helpers.length || submitting) && styles.disabled,
              ]}
              onPress={onSubmit}
              disabled={!helpers.length || submitting}
              activeOpacity={0.86}
              accessibilityRole="button"
              accessibilityLabel="Submit helper request"
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryText} />
              ) : (
                <>
                  <Ionicons
                    name="person-add-outline"
                    size={23}
                    color={theme.primaryText}
                  />
                  <Text
                    style={[styles.submitText, { color: theme.primaryText }]}
                  >
                    Submit helper request
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={23}
                    color={theme.primaryText}
                  />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 38 },
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
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 18,
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
  progressLine: { flex: 1, height: 1, minWidth: 24, marginHorizontal: 12 },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  summaryText: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  summaryDivider: { width: 1, alignSelf: 'stretch' },
  changeText: {
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  resultCount: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  loadingBlock: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyHelperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  anyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anyCopy: { flex: 1 },
  anyTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  anySubtitle: { fontSize: 12, lineHeight: 17 },
  helperCard: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 14,
    marginBottom: 12,
  },
  helperTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    marginRight: 13,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 22, fontWeight: '800' },
  helperCopy: { flex: 1 },
  helperNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperName: { flex: 1, fontSize: 19, fontWeight: '800' },
  helperMeta: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  phoneText: { fontSize: 13 },
  activeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 79,
    marginTop: 10,
  },
  activeBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyCard: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 24,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 15,
  },
  outlineButtonText: { fontSize: 14, fontWeight: '800' },
  pricingCard: { marginTop: 8, marginBottom: 20 },
  pricingHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  pricingIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingCopy: { flex: 1 },
  pricingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  pricingAmount: { fontSize: 22, fontWeight: '800' },
  pricingAmountSmall: { fontSize: 15, fontWeight: '800' },
  pricingDetail: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  pricingNote: { fontSize: 12, lineHeight: 18, marginTop: 7 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  textAreaWrap: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    marginBottom: 15,
  },
  noteIcon: { marginTop: 14, marginRight: 9 },
  textArea: { flex: 1, minHeight: 100, fontSize: 14, paddingVertical: 13 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  submitButton: {
    minHeight: 55,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  submitText: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.5 },
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
});
