import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text } from './AppText';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getProfileTheme } from '../screens/profile/profileTheme';
import { registerPrimeAlertPresenter } from '../services/primeAlert';

const KIND_META = {
  info: { icon: 'information-circle-outline', colorKey: 'primary' },
  success: { icon: 'checkmark-circle-outline', colorKey: 'success' },
  warning: { icon: 'alert-circle-outline', colorKey: 'warning' },
  error: { icon: 'close-circle-outline', colorKey: 'danger' },
  destructive: { icon: 'warning-outline', colorKey: 'danger' },
};

export function inferAlertKind(title, buttons = [], requestedKind) {
  if (KIND_META[requestedKind]) return requestedKind;
  if (buttons.some(button => button.style === 'destructive')) {
    return 'destructive';
  }

  const value = String(title || '').toLowerCase();
  if (
    /success|submitted|sent|saved|updated|published|completed|approved/.test(
      value,
    )
  ) {
    return 'success';
  }
  if (/failed|unable|error|expired|denied/.test(value)) return 'error';
  if (/missing|invalid|required|warning|mismatch|overdue|permission/.test(value)) {
    return 'warning';
  }
  return 'info';
}

function iconForAlert(title, kind) {
  if (/shop details required/i.test(String(title || ''))) {
    return 'storefront-outline';
  }
  return KIND_META[kind].icon;
}

export default function PrimeAlertProvider({ children }) {
  const { theme: appTheme } = useTheme();
  const theme = getProfileTheme(appTheme);
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState([]);
  const current = queue[0] || null;

  const present = useCallback(request => {
    setQueue(existing => [...existing, request]);
  }, []);

  useEffect(() => registerPrimeAlertPresenter(present), [present]);

  const kind = useMemo(
    () =>
      current
        ? inferAlertKind(
            current.title,
            current.buttons,
            current.options?.kind,
          )
        : 'info',
    [current],
  );
  const meta = KIND_META[kind];
  const accentColor = theme[meta.colorKey] || theme.primary;

  const dismiss = useCallback(
    ({ notify = false } = {}) => {
      const onDismiss = current?.options?.onDismiss;
      setQueue(existing => existing.slice(1));
      if (notify) onDismiss?.();
    },
    [current],
  );

  const cancelable = current?.options?.cancelable === true;
  const dismissIfCancelable = () => {
    if (cancelable) dismiss({ notify: true });
  };

  const pressButton = button => {
    dismiss();
    button.onPress?.();
  };

  return (
    <>
      {children}
      <Modal
        visible={Boolean(current)}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={dismissIfCancelable}
      >
        <Pressable
          style={[
            styles.backdrop,
            {
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          onPress={dismissIfCancelable}
          accessibilityViewIsModal
        >
          <Pressable
            style={[
              styles.alert,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
            onPress={event => event.stopPropagation()}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <View style={[styles.accentRail, { backgroundColor: accentColor }]} />
            <ScrollView
              style={styles.contentScroller}
              contentContainerStyle={styles.contentRow}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
                <View
                  style={[
                    styles.iconTile,
                    {
                      backgroundColor: theme.iconSurface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={iconForAlert(current?.title, kind)}
                    size={30}
                    color={accentColor}
                  />
                </View>
                <View style={styles.copy}>
                  <Text
                    style={[styles.title, { color: theme.text }]}
                    accessibilityRole="header"
                  >
                    {current?.title}
                  </Text>
                  {current?.message ? (
                    <Text style={[styles.message, { color: theme.subtext }]}>
                      {current.message}
                    </Text>
                  ) : null}
                </View>
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View
              style={[
                styles.actions,
                current?.buttons?.length === 1 && styles.singleAction,
              ]}
            >
              {current?.buttons?.map((button, index) => {
                const destructive = button.style === 'destructive';
                const cancel = button.style === 'cancel';
                const buttonColor = destructive ? theme.danger : theme.primary;
                const buttonColors = {
                  backgroundColor: cancel ? 'transparent' : buttonColor,
                  borderColor: cancel ? theme.border : buttonColor,
                };
                return (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      buttonColors,
                    ]}
                    onPress={() => pressButton(button)}
                    activeOpacity={0.78}
                    accessibilityRole="button"
                    accessibilityLabel={button.text}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        {
                          color: cancel
                            ? theme.text
                            : destructive
                              ? '#FFFFFF'
                              : theme.primaryText,
                        },
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  alert: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 24,
    elevation: 14,
  },
  accentRail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },
  contentScroller: {
    flexShrink: 1,
  },
  iconTile: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingTop: 1,
  },
  title: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '800',
  },
  message: {
    flexShrink: 1,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    marginHorizontal: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  singleAction: {
    justifyContent: 'flex-end',
  },
  button: {
    minWidth: 104,
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
});
