import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from '../AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { loadChatHistory, sendMessage } from '../../services/chatService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.82;

export default function ChatSheet({ visible, onClose }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const userName = (user?.fullname || user?.name || '').trim();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const openSheet = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const closeSheet = useCallback(
    (callback) => {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) callback?.();
      });
    },
    [slideAnim, backdropAnim],
  );

  useEffect(() => {
    if (visible) {
      openSheet();
      setLoadingHistory(true);
      loadChatHistory()
        .then((history) => {
          if (history.length) setMessages(history);
        })
        .finally(() => setLoadingHistory(false));
    } else {
      slideAnim.setValue(SHEET_HEIGHT);
      backdropAnim.setValue(0);
    }
  }, [visible, openSheet, slideAnim, backdropAnim]);

  useEffect(() => {
    if (messages.length) scrollToEnd();
  }, [messages, scrollToEnd]);

  const handleClose = () => {
    closeSheet(onClose);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const optimisticUser = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
    scrollToEnd();

    try {
      const { assistantMessage, userMessage } = await sendMessage(text, {
        enableMcpTools: true,
        ragContext: 'resident',
      });

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticUser.id);
        return [...withoutOptimistic, userMessage, assistantMessage];
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        optimisticUser,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: err.message || 'Something went wrong. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const bubbleBg = isUser ? theme.primary : theme.card;
    const textColor = isUser ? theme.primaryText : theme.text;
    const align = isUser ? 'flex-end' : 'flex-start';
    const bubbleColors = {
      backgroundColor: item.isError ? theme.dangerBg : bubbleBg,
      borderColor: isUser ? 'transparent' : theme.border,
    };

    return (
      <View style={[styles.messageRow, { alignItems: align }]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: theme.primaryBg }]}>
            <Ionicons name="sparkles" size={14} color={theme.primary} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            bubbleColors,
          ]}>
          <Text style={[styles.bubbleText, { color: item.isError ? theme.danger : textColor }]}>
            {item.content}
          </Text>
          {item.toolCalls?.length > 0 && (
            <Text style={[styles.toolHint, { color: theme.subtext }]}>
              Used {item.toolCalls.length} MCP tool{item.toolCalls.length > 1 ? 's' : ''}
            </Text>
          )}
          {item.knowledgeSources?.length > 0 && (
            <Text style={[styles.toolHint, { color: theme.subtext }]}>
              Knowledge: {item.knowledgeSources.map(source => source.title).filter(Boolean).slice(0, 2).join(', ')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT,
              backgroundColor: theme.background,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <View style={[styles.header, { backgroundColor: theme.primary, paddingTop: insets.top + 8 }]}>
              <View style={styles.headerContent}>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.closeBtn}>
                  <Ionicons name="chevron-down" size={26} color={theme.primaryText} />
                </TouchableOpacity>
                <View style={styles.headerTitles}>
                  <Text style={[styles.headerTitle, { color: theme.primaryText }]}>SmartRes AI</Text>
                  <Text
                    style={[
                      styles.headerSub,
                      styles.headerSubOpacity,
                      { color: theme.primaryText },
                    ]}
                  >
                    {userName ? `မင်္ဂလာပါ, ${userName.split(' ')[0]} 👋` : 'RAG + MCP ready'}
                  </Text>
                </View>
                <View style={styles.headerSpacer} />
              </View>
            </View>

            {loadingHistory ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.messageList,
                  messages.length === 0 && styles.messageListEmpty,
                ]}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.primaryBg }]}>
                      <Ionicons name="chatbubbles-outline" size={28} color={theme.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>
                      {userName
                        ? `မင်္ဂလာပါ ${userName.split(' ')[0]} 👋\nဘာကူညီပေးရမလဲ?`
                        : 'မင်္ဂလာပါ 👋\nဘာကူညီပေးရမလဲ?'}
                    </Text>
                    <Text style={[styles.emptySub, { color: theme.subtext }]}>
                      Bills, helpers, visitors, parking, announcements — powered by RAG and MCP tools.
                    </Text>
                  </View>
                }
                renderItem={renderMessage}
                onContentSizeChange={scrollToEnd}
              />
            )}

            <View
              style={[
                styles.inputBar,
                {
                  backgroundColor: theme.surface,
                  borderTopColor: theme.border,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.input,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Type a message…"
                placeholderTextColor={theme.inactive}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
                editable={!sending}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!input.trim() || sending}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: input.trim() && !sending ? theme.primary : theme.border,
                  },
                ]}>
                {sending ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <Ionicons name="send" size={18} color={theme.primaryText} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  header: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerSubOpacity: { opacity: 0.85 },
  headerSpacer: { width: 40 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageListEmpty: {
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '88%',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  userBubble: { borderWidth: 0 },
  assistantBubble: { borderWidth: 1 },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  toolHint: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
