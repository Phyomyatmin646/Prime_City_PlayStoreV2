import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AppText as Text,
  AppTextInput as TextInput,
} from '../../components/AppText';
import { showPrimeAlert } from '../../services/primeAlert';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Card from '../../components/Card';
import ScreenContainer from '../../components/ScreenContainer';
import { fetchBill, submitBillPayment } from '../../api/bills';
import { useTheme } from '../../context/ThemeContext';
import { getBillTheme } from './billTheme';

const KPAY_PHONE = '09965139303';
const SUBMITTABLE_STATUSES = new Set([
  'Pending',
  'Overdue',
  'Rejected',
  'Pending Verification',
]);

function formatAmount(value) {
  return `${Number(value || 0).toLocaleString('en-US')} MMK`;
}

function getBillCategory(bill) {
  return bill?.category || bill?.type || 'Service Bill';
}

export default function BillPaymentScreen({ navigation, route }) {
  const { theme: appTheme } = useTheme();
  const theme = getBillTheme(appTheme);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [bill, setBill] = useState(route.params?.bill || null);
  const [screenshot, setScreenshot] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(!bill);
  const [submitting, setSubmitting] = useState(false);

  const loadBill = useCallback(async () => {
    try {
      const latest = await fetchBill(route.params?.billId || bill?._id);
      setBill(latest);
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert(
          'Unable to load bill',
          err.message || 'Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [bill?._id, route.params?.billId]);

  useFocusEffect(
    useCallback(() => {
      loadBill();
    }, [loadBill]),
  );

  const copyValue = (value, label) => {
    Clipboard.setString(String(value));
    showPrimeAlert('Copied', `${label} copied to clipboard.`);
  };

  const chooseScreenshot = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
        maxWidth: 2000,
        maxHeight: 2000,
        assetRepresentationMode: 'compatible',
      });
      if (result.didCancel) return;
      if (result.errorCode) {
        throw new Error(result.errorMessage || 'Unable to select screenshot');
      }
      const asset = result.assets?.[0];
      if (!asset?.uri) throw new Error('No screenshot was selected');
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('Screenshot must be 5 MB or smaller');
      }
      setScreenshot(asset);
    } catch (err) {
      showPrimeAlert('Unable to select screenshot', err.message);
    }
  };

  const submitPayment = async () => {
    if (!screenshot) {
      showPrimeAlert(
        'Screenshot required',
        'Upload the KPay transfer screenshot first.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await submitBillPayment({
        billId: bill._id,
        amount: bill.amount,
        screenshot,
        note: note.trim(),
      });
      showPrimeAlert(
        'Submitted for verification',
        'Your bill is not marked Paid yet. Admin must verify and approve this payment.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      if (!err.sessionExpired) {
        showPrimeAlert('Submission failed', err.message || 'Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !bill) {
    return (
      <ScreenContainer
        navigation={navigation}
        topBarVariant="stack"
        title="Pay Bill"
        themeOverride={theme}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const canSubmit = SUBMITTABLE_STATUSES.has(bill.status);

  return (
    <ScreenContainer
      navigation={navigation}
      topBarVariant="stack"
      title="Pay Bill"
      themeOverride={theme}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Card
          style={[styles.billCard, styles.amountCard]}
          themeOverride={theme}
        >
          <Text style={[styles.eyebrow, { color: theme.subtext }]}>
            EXACT BILL AMOUNT
          </Text>
          <Text style={[styles.amount, { color: theme.text }]}>
            {formatAmount(bill.amount)}
          </Text>
          <Text style={[styles.billTitle, { color: theme.subtext }]}>
            {bill.title}
          </Text>
          <View
            style={[styles.categoryBox, { backgroundColor: theme.primaryBg }]}
          >
            <Text style={[styles.categoryText, { color: theme.primary }]}>
              Paying only: {getBillCategory(bill)}
            </Text>
          </View>
          {bill.service_cutoff_warning ? (
            <View style={[styles.notice, { backgroundColor: theme.warningBg }]}>
              <Ionicons
                name="warning-outline"
                size={19}
                color={theme.warning}
              />
              <Text style={[styles.noticeText, { color: theme.text }]}>
                {bill.service_cutoff_warning}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.copyButton, { borderColor: theme.border }]}
            onPress={() => copyValue(bill.amount, 'Bill amount')}
          >
            <Ionicons name="copy-outline" size={17} color={theme.primary} />
            <Text style={[styles.copyText, { color: theme.primary }]}>
              Copy exact amount
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.billCard} themeOverride={theme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            KPay transfer details
          </Text>
          <Text style={[styles.label, { color: theme.subtext }]}>
            KPay phone number
          </Text>
          <Text style={[styles.phone, { color: theme.text }]}>
            {KPAY_PHONE}
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={() => copyValue(KPAY_PHONE, 'KPay phone number')}
          >
            <Ionicons name="copy-outline" size={18} color={theme.primaryText} />
            <Text style={[styles.primaryText, { color: theme.primaryText }]}>
              Copy Phone Number
            </Text>
          </TouchableOpacity>
          <View style={[styles.notice, { backgroundColor: theme.warningBg }]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={19}
              color={theme.warning}
            />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              For safety, Prime City does not use an unverified KPay deep link.
              Open KPay manually, transfer the exact amount above, then return
              here.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.manualButton, { borderColor: theme.border }]}
            onPress={() =>
              showPrimeAlert(
                'How to pay with KPay',
                `1. Copy phone number ${KPAY_PHONE}.\n2. Copy the exact amount ${formatAmount(
                  bill.amount,
                )}.\n3. Open your official KPay app manually.\n4. Transfer the exact amount to that number.\n5. Return to Prime City and upload the completed transfer screenshot.\n6. Wait for Admin approval before the bill becomes Paid.`,
              )
            }
          >
            <Text style={[styles.manualText, { color: theme.text }]}>
              How to pay with KPay
            </Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.billCard} themeOverride={theme}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Payment screenshot
          </Text>
          <Text style={[styles.help, { color: theme.subtext }]}>
            Upload the completed transfer screenshot for this{' '}
            {getBillCategory(bill)} bill only. Uploading does not mark the bill
            Paid.
          </Text>
          {screenshot ? (
            <Image
              source={{ uri: screenshot.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
          ) : null}
          <TouchableOpacity
            style={[styles.uploadButton, { borderColor: theme.primary }]}
            onPress={chooseScreenshot}
            disabled={!canSubmit || submitting}
          >
            <Ionicons name="image-outline" size={20} color={theme.primary} />
            <Text style={[styles.uploadText, { color: theme.primary }]}>
              {screenshot ? 'Change screenshot' : 'Choose screenshot'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.noteInput,
              {
                color: theme.text,
                backgroundColor: theme.input,
                borderColor: theme.border,
              },
            ]}
            placeholder="Optional note for Admin"
            placeholderTextColor={theme.inactive}
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
            editable={canSubmit && !submitting}
          />
        </Card>

        {!canSubmit ? (
          <View
            style={[styles.statusNotice, { backgroundColor: theme.warningBg }]}
          >
            <Text style={[styles.statusText, { color: theme.warning }]}>
              Current status: {bill.status}
            </Text>
            <Text style={[styles.help, { color: theme.subtext }]}>
              A new screenshot cannot be submitted in this status.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? theme.primary : theme.inactive },
          ]}
          onPress={submitPayment}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Ionicons
              name="cloud-upload-outline"
              size={20}
              color={theme.primaryText}
            />
          )}
          <Text style={[styles.submitText, { color: theme.primaryText }]}>
            Submit for Admin verification
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = theme =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 48,
      gap: 14,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    billCard: {
      borderRadius: 20,
      padding: 18,
      marginBottom: 0,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 4,
    },
    amountCard: {
      borderColor: theme.primary,
      shadowColor: theme.primary,
      shadowOpacity: 0.12,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
      marginBottom: 9,
    },
    amount: { fontSize: 34, fontWeight: '900', letterSpacing: -0.7 },
    billTitle: { fontSize: 14, lineHeight: 20, marginTop: 5 },
    categoryBox: {
      alignSelf: 'flex-start',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      paddingHorizontal: 11,
      paddingVertical: 7,
      marginTop: 12,
    },
    categoryText: { fontSize: 12, fontWeight: '900' },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '700' },
    phone: {
      fontSize: 27,
      fontWeight: '900',
      letterSpacing: 0.3,
      marginTop: 5,
      marginBottom: 16,
    },
    copyButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderWidth: 1,
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingVertical: 10,
      marginTop: 16,
    },
    copyText: { fontSize: 13, fontWeight: '800' },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 50,
      paddingVertical: 13,
      borderRadius: 14,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    primaryText: { fontSize: 15, fontWeight: '900' },
    notice: {
      flexDirection: 'row',
      gap: 9,
      padding: 13,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      marginTop: 15,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 19 },
    manualButton: {
      borderWidth: 1,
      borderRadius: 12,
      minHeight: 46,
      padding: 12,
      marginTop: 12,
    },
    manualText: { textAlign: 'center', fontSize: 13, fontWeight: '800' },
    help: { fontSize: 12, lineHeight: 19, marginBottom: 13 },
    preview: {
      width: '100%',
      height: 210,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.softGoldBorder,
      marginBottom: 13,
    },
    uploadButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 13,
      minHeight: 49,
      padding: 13,
    },
    uploadText: { fontSize: 14, fontWeight: '800' },
    noteInput: {
      minHeight: 90,
      borderWidth: 1,
      borderRadius: 13,
      marginTop: 13,
      padding: 13,
      textAlignVertical: 'top',
    },
    statusNotice: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.goldBorder,
      padding: 14,
    },
    statusText: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
    submitButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      borderRadius: 14,
      minHeight: 52,
      padding: 15,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 3,
    },
    submitText: { fontSize: 15, fontWeight: '900' },
  });
