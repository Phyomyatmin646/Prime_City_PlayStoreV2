import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  deactivateRagKnowledge,
  fetchAiFeedbackForReview,
  fetchRagKnowledge,
  reviewAiFeedback,
} from '../../api/aiAdmin';

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'knowledge', label: 'RAG Knowledge' },
];

const CATEGORIES = [
  'general',
  'app',
  'visitor',
  'billing',
  'parking',
  'maintenance',
  'announcement',
  'rfid',
  'sos',
  'admin',
];

const AUDIENCES = ['all', 'resident', 'admin', 'staff', 'security'];

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusColors(status, theme) {
  if (status === 'approved' || status === true) {
    return { color: theme.success, background: theme.successBg };
  }
  if (status === 'rejected' || status === false) {
    return { color: theme.danger, background: theme.dangerBg };
  }
  return { color: theme.warning, background: theme.warningBg };
}

function ChoiceRow({ items, selected, onSelect, theme }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.choiceRow}
    >
      {items.map(item => {
        const active = item === selected;
        return (
          <TouchableOpacity
            key={item}
            style={[
              styles.choice,
              {
                backgroundColor: active ? theme.primary : theme.input,
                borderColor: active ? theme.primary : theme.border,
              },
            ]}
            onPress={() => onSelect(item)}
          >
            <Text
              style={[
                styles.choiceText,
                { color: active ? theme.primaryText : theme.subtext },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function AdminAiReviewScreen({ navigation }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [filter, setFilter] = useState('pending');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('');
  const [approvedContent, setApprovedContent] = useState('');
  const [category, setCategory] = useState('general');
  const [audience, setAudience] = useState('all');
  const [tags, setTags] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canManage = ['Admin', 'Staff'].includes(user?.role);

  const load = useCallback(
    async (refresh = false) => {
      if (!canManage) {
        setLoading(false);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        const result =
          filter === 'knowledge'
            ? await fetchRagKnowledge({ limit: 100 })
            : await fetchAiFeedbackForReview({ status: filter, limit: 100 });
        setItems(result.items);
        setTotal(Number(result.pagination?.total || result.items.length));
      } catch (err) {
        if (!err.sessionExpired) {
          setError(err.message || 'Unable to load AI review data.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManage, filter],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const emptyMessage = useMemo(() => {
    if (filter === 'knowledge') return 'No RAG knowledge found';
    return `No ${filter} feedback found`;
  }, [filter]);

  const openApproval = item => {
    const suggestedCategory = String(item.aiChatId?.intent || '').toLowerCase();
    setSelected(item);
    setTitle('');
    setApprovedContent('');
    setCategory(
      CATEGORIES.includes(suggestedCategory) ? suggestedCategory : 'general',
    );
    setAudience('all');
    setTags('');
    setReviewNote('');
  };

  const approve = async () => {
    if (!title.trim() || !approvedContent.trim()) {
      showPrimeAlert(
        'Missing knowledge content',
        'Add a reusable title and approved answer before publishing to RAG.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await reviewAiFeedback(selected._id, {
        reviewStatus: 'approved',
        title: title.trim(),
        approvedContent: approvedContent.trim(),
        category: CATEGORIES.includes(category) ? category : 'general',
        audience,
        tags: tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean),
        reviewNote: reviewNote.trim(),
      });
      setSelected(null);
      showPrimeAlert('Published to RAG', 'The reviewed knowledge is now active.');
      await load(true);
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert('Unable to approve', err.message || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reject = item => {
    showPrimeAlert(
      'Reject feedback?',
      'This feedback will not be added to RAG knowledge.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await reviewAiFeedback(item._id, {
                reviewStatus: 'rejected',
                reviewNote: 'Rejected during Admin mobile review.',
              });
              await load(true);
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Unable to reject',
                  err.message || 'Please try again.',
                );
              }
            }
          },
        },
      ],
    );
  };

  const deactivateKnowledge = item => {
    showPrimeAlert(
      'Remove from active RAG?',
      'The item stays in the database for audit history but will no longer be used in AI answers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateRagKnowledge(item._id);
              await load(true);
            } catch (err) {
              if (!err.sessionExpired) {
                showPrimeAlert(
                  'Unable to deactivate',
                  err.message || 'Please try again.',
                );
              }
            }
          },
        },
      ],
    );
  };

  const renderFeedback = item => {
    const status = statusColors(item.reviewStatus, theme);
    return (
      <Card>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCopy}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {item.feedbackType?.replace(/_/g, ' ') || 'AI feedback'}
            </Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {item.userId?.fullname || 'Resident'} ·{' '}
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.background }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {item.reviewStatus}
            </Text>
          </View>
        </View>

        {item.comment ? (
          <View style={[styles.quote, { backgroundColor: theme.input }]}>
            <Text style={[styles.quoteLabel, { color: theme.subtext }]}>
              Resident feedback
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>
              {item.comment}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.quoteLabel, { color: theme.subtext }]}>
          Assistant answer under review
        </Text>
        <Text style={[styles.body, { color: theme.text }]} numberOfLines={8}>
          {item.aiChatId?.content || 'Assistant message is unavailable.'}
        </Text>

        {item.reviewStatus === 'pending' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: theme.danger + '88' },
              ]}
              onPress={() => reject(item)}
            >
              <Ionicons name="close-outline" size={18} color={theme.danger} />
              <Text style={[styles.buttonText, { color: theme.danger }]}>
                Reject
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={() => openApproval(item)}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={theme.primaryText}
              />
              <Text style={[styles.buttonText, { color: theme.primaryText }]}>
                Review & approve
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Card>
    );
  };

  const renderKnowledge = item => {
    const status = statusColors(Boolean(item.isActive), theme);
    return (
      <Card>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleCopy}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.meta, { color: theme.subtext }]}>
              {item.category} · {item.audience} · {item.source}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.background }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {item.isActive ? 'active' : 'inactive'}
            </Text>
          </View>
        </View>
        <Text style={[styles.body, { color: theme.text }]}>{item.content}</Text>
        {item.tags?.length ? (
          <Text style={[styles.tags, { color: theme.subtext }]}>
            #{item.tags.join('  #')}
          </Text>
        ) : null}
        {item.isActive ? (
          <TouchableOpacity
            style={[
              styles.deactivateButton,
              { borderColor: theme.danger + '88' },
            ]}
            onPress={() => deactivateKnowledge(item)}
          >
            <Ionicons name="archive-outline" size={17} color={theme.danger} />
            <Text style={[styles.buttonText, { color: theme.danger }]}>
              Deactivate from RAG
            </Text>
          </TouchableOpacity>
        ) : null}
      </Card>
    );
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="AI Feedback & RAG"
      showBottomNav
    >
      {!canManage ? (
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={42} color={theme.danger} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            Admin or Staff access is required
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item._id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <Text style={[styles.heading, { color: theme.text }]}>
                AI quality review
              </Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Approve only reusable, verified, privacy-safe information.
                Approved content becomes active RAG knowledge.
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map(item => {
                  const active = filter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.filter,
                        {
                          backgroundColor: active ? theme.primary : theme.card,
                          borderColor: active ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setFilter(item.id)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          {
                            color: active ? theme.primaryText : theme.subtext,
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={[styles.total, { color: theme.subtext }]}>
                {total} item{total === 1 ? '' : 's'}
              </Text>
              {error ? (
                <View
                  style={[styles.errorBox, { backgroundColor: theme.dangerBg }]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={theme.danger}
                  />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <View style={styles.centered}>
                <Ionicons
                  name="sparkles-outline"
                  size={42}
                  color={theme.inactive}
                />
                <Text style={[styles.emptyText, { color: theme.subtext }]}>
                  {emptyMessage}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) =>
            filter === 'knowledge'
              ? renderKnowledge(item)
              : renderFeedback(item)
          }
        />
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={() => !submitting && setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setSelected(null)}
          />
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalHeader}>
                <View style={styles.cardTitleCopy}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Publish reviewed knowledge
                  </Text>
                  <Text style={[styles.meta, { color: theme.subtext }]}>
                    This content can influence future AI answers.
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => setSelected(null)}
                >
                  <Ionicons name="close" size={24} color={theme.icon} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.privacyBox,
                  { backgroundColor: theme.warningBg },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={theme.warning}
                />
                <Text style={[styles.privacyText, { color: theme.warning }]}>
                  Rewrite this as verified general guidance. Do not copy names,
                  room numbers, phone numbers, emails, bills, or private chat
                  details into RAG.
                </Text>
              </View>

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Title
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Reusable knowledge title"
                placeholderTextColor={theme.inactive}
                value={title}
                onChangeText={setTitle}
                maxLength={160}
              />

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Approved answer
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Write the verified, privacy-safe answer"
                placeholderTextColor={theme.inactive}
                value={approvedContent}
                onChangeText={setApprovedContent}
                multiline
                maxLength={10000}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Category
              </Text>
              <ChoiceRow
                items={CATEGORIES}
                selected={category}
                onSelect={setCategory}
                theme={theme}
              />

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Audience
              </Text>
              <ChoiceRow
                items={AUDIENCES}
                selected={audience}
                onSelect={setAudience}
                theme={theme}
              />

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Tags (comma separated)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="visitor, gate, qr"
                placeholderTextColor={theme.inactive}
                value={tags}
                onChangeText={setTags}
              />

              <Text style={[styles.inputLabel, { color: theme.subtext }]}>
                Internal review note (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="What was verified"
                placeholderTextColor={theme.inactive}
                value={reviewNote}
                onChangeText={setReviewNote}
                maxLength={1000}
              />

              <TouchableOpacity
                style={[
                  styles.publishButton,
                  { backgroundColor: theme.primary },
                ]}
                disabled={submitting}
                onPress={approve}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.primaryText} />
                ) : (
                  <>
                    <Ionicons
                      name="sparkles-outline"
                      size={19}
                      color={theme.primaryText}
                    />
                    <Text
                      style={[styles.publishText, { color: theme.primaryText }]}
                    >
                      Approve & publish to RAG
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 48, flexGrow: 1 },
  heading: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  filterRow: { gap: 8, paddingBottom: 12 },
  filter: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterText: { fontSize: 13, fontWeight: '800' },
  total: { fontSize: 12, marginBottom: 10 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 13 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: { fontSize: 15, fontWeight: '600' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleCopy: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
  meta: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  quote: { borderRadius: 10, padding: 12, marginBottom: 12 },
  quoteLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  body: { fontSize: 14, lineHeight: 20 },
  tags: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  secondaryButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deactivateButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 13, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000099',
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
  },
  modalContent: { padding: 20, paddingBottom: 36 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  privacyText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 14,
  },
  textArea: { minHeight: 140, paddingTop: 12 },
  choiceRow: { gap: 8, paddingBottom: 4 },
  choice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  publishButton: {
    minHeight: 52,
    borderRadius: 12,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  publishText: { fontSize: 14, fontWeight: '800' },
});
