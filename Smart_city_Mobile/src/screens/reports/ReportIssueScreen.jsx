import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import ScreenContainer from '../../components/ScreenContainer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { REPORT_TYPES, submitReport } from '../../api/reports';
import { showPrimeAlert } from '../../services/primeAlert';
import { getReportTheme } from './reportTheme';

const REPORT_TYPE_ICONS = {
  Security: 'shield-checkmark-outline',
  Maintenance: 'construct-outline',
  Other: 'document-text-outline',
};

export default function ReportIssueScreen({ navigation }) {
  const { theme: appTheme } = useTheme();
  const theme = getReportTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const [type, setType] = useState('Maintenance');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState(
    user?.room_id ? `Unit ${user.room_id}` : '',
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!title.trim() || !location.trim() || !message.trim()) {
      showPrimeAlert(
        'Missing fields',
        'Please enter title, location, and details.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        title: title.trim(),
        location: location.trim(),
        message: message.trim(),
        type,
      });

      showPrimeAlert(
        'Report submitted',
        'Admin staff will review your report.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      setTitle('');
      setMessage('');
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Submit failed',
          err.message || 'Unable to submit report.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Report Issue"
      showBottomNav
      themeOverride={theme}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <View style={styles.section}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {REPORT_TYPES.map(item => {
                  const selected = type === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[
                        styles.typeChip,
                        selected && styles.typeChipSelected,
                      ]}
                      onPress={() => setType(item)}
                      activeOpacity={0.78}
                      accessibilityRole="button"
                      accessibilityLabel={`${item} report type`}
                      accessibilityState={{ selected }}
                    >
                      <View
                        style={[
                          styles.typeIcon,
                          selected && styles.typeIconSelected,
                        ]}
                      >
                        <Ionicons
                          name={
                            REPORT_TYPE_ICONS[item] || 'document-text-outline'
                          }
                          size={22}
                          color={selected ? theme.primaryText : theme.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.typeText,
                          selected && styles.typeTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <View style={styles.inputWrap}>
                <View style={styles.fieldIcon}>
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Short report title"
                  placeholderTextColor={theme.inactive}
                  value={title}
                  onChangeText={setTitle}
                  accessibilityLabel="Report title"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrap}>
                <View style={styles.fieldIcon}>
                  <Ionicons
                    name="location-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Unit, lobby, floor, parking area..."
                  placeholderTextColor={theme.inactive}
                  value={location}
                  onChangeText={setLocation}
                  accessibilityLabel="Report location"
                />
              </View>
            </View>

            <View style={[styles.section, styles.detailsSection]}>
              <Text style={styles.label}>Details</Text>
              <View style={styles.textAreaWrap}>
                <View style={[styles.fieldIcon, styles.textAreaIcon]}>
                  <Ionicons
                    name="document-text-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>
                <TextInput
                  style={styles.textArea}
                  placeholder="Describe what happened..."
                  placeholderTextColor={theme.inactive}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Report details"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.disabled]}
            onPress={onSubmit}
            disabled={submitting}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Submit report"
            accessibilityState={{ disabled: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <>
                <Ionicons
                  name="send-outline"
                  size={19}
                  color={theme.primaryText}
                />
                <Text style={styles.submitText}>Submit report</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    flex: { flex: 1 },
    scroll: { backgroundColor: theme.background },
    container: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 42,
    },
    formCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 21,
      padding: 17,
      marginBottom: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 4,
    },
    section: { marginBottom: 18 },
    detailsSection: { marginBottom: 0 },
    label: {
      color: theme.text,
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 19,
      marginBottom: 9,
    },
    typeRow: { flexDirection: 'row', gap: 8 },
    typeChip: {
      flex: 1,
      minWidth: 0,
      minHeight: 88,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.elevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 15,
      paddingHorizontal: 5,
      paddingVertical: 10,
    },
    typeChipSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 7,
      elevation: 2,
    },
    typeIcon: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.iconSurface,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      borderRadius: 12,
      marginBottom: 7,
    },
    typeIconSelected: {
      backgroundColor: 'rgba(23, 16, 6, 0.1)',
      borderColor: 'rgba(23, 16, 6, 0.24)',
    },
    typeText: {
      color: theme.text,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 17,
      textAlign: 'center',
    },
    typeTextSelected: { color: theme.primaryText },
    inputWrap: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingLeft: 8,
      paddingRight: 13,
    },
    fieldIcon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.iconSurface,
      borderRadius: 11,
      marginRight: 9,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: theme.text,
      fontSize: 15,
      lineHeight: 21,
      paddingVertical: 11,
    },
    textAreaWrap: {
      minHeight: 152,
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingLeft: 8,
      paddingRight: 13,
    },
    textAreaIcon: { marginTop: 8 },
    textArea: {
      flex: 1,
      minWidth: 0,
      minHeight: 148,
      color: theme.text,
      fontSize: 15,
      lineHeight: 22,
      paddingTop: 14,
      paddingBottom: 12,
    },
    submitBtn: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 15,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 3,
    },
    submitText: {
      color: theme.primaryText,
      fontSize: 15,
      fontWeight: '900',
      lineHeight: 21,
    },
    disabled: { opacity: 0.7 },
  });
