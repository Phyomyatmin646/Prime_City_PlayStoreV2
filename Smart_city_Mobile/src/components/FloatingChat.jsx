import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { AppText as Text, AppTextInput as TextInput } from './AppText';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import useVoiceAssistant from '../hooks/useVoiceAssistant';
import {
  sendFeedback as sendChatFeedback,
  sendMessage as sendAIMessage,
} from '../services/chatService';
import { containsMyanmarText, getMyanmarTextStyle } from '../theme/typography';
import { getTabBarMetrics } from '../navigation/tabConfig';
import { getChatTheme } from './chat/chatTheme';

const CHAT_BOB_DISTANCE = 8;
const CHAT_BOB_DURATION = 1800;
const CHAT_HEADER_HEIGHT = 60;
const THINKING_DOTS = [0, 1, 2];
const CHATBOT_LOGO = require('../assets/chatbot-home-logo.png');

export function getFloatingChatPosition(
  insets = {},
  platform = Platform.OS,
) {
  const tabMetrics = getTabBarMetrics(Number(insets.bottom) || 0, platform);
  return {
    right: Math.max(Number(insets.right) || 0, 0) + 20,
    bottom: tabMetrics.height + 18,
  };
}

function ThinkingIndicator({ theme }) {
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  const dotAnims = useRef(
    THINKING_DOTS.map(() => new Animated.Value(0.35)),
  ).current;

  useEffect(() => {
    const dotLoops = dotAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(anim, {
            toValue: 1,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 420,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    dotLoops.forEach(loop => loop.start());

    return () => {
      dotLoops.forEach(loop => loop.stop());
    };
  }, [dotAnims]);

  return (
    <View style={[styles.messageRow, styles.thinkingRow]}>
      <View
        style={[
          styles.thinkingBubble,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <ActivityIndicator size="small" color={theme.primary} />
        <Text
          style={[
            styles.thinkingText,
            styles.myanmarThinkingText,
            getMyanmarTextStyle('အဖြေရှာနေပါတယ်', 'bold'),
            { color: theme.subtext },
          ]}
        >
          အဖြေရှာနေပါတယ်
        </Text>
        <View style={styles.thinkingDots}>
          {dotAnims.map((anim, index) => (
            <Animated.View
              key={THINKING_DOTS[index]}
              style={[
                styles.thinkingDot,
                {
                  backgroundColor: theme.primary,
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0.35, 1],
                        outputRange: [0.72, 1],
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function HistoryDrawer({
  theme,
  sessions,
  activeSessionId,
  onClose,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  topInset,
  bottomInset,
}) {
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  return (
    <View
      style={[
        styles.historyLayer,
        {
          top: topInset + CHAT_HEADER_HEIGHT,
          bottom: bottomInset,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.historyScrim}
      />

      <View
        style={[
          styles.historyPanel,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: theme.text }]}>
            Chat history
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.historyClose}
          >
            <Ionicons name="close" size={20} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onNewChat}
          activeOpacity={0.82}
          style={[
            styles.newChatButton,
            { backgroundColor: theme.primary, borderColor: theme.primarySoft },
          ]}
        >
          <Ionicons name="create-outline" size={17} color={theme.primaryText} />
          <Text style={[styles.newChatText, { color: theme.primaryText }]}>
            New chat
          </Text>
        </TouchableOpacity>

        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.historyList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isActive = item.id === activeSessionId;
            const lastMessage = item.messages[item.messages.length - 1];
            const preview = lastMessage?.text || 'No messages yet';

            return (
              <TouchableOpacity
                onPress={() => onSelectSession(item.id)}
                activeOpacity={0.84}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: isActive ? theme.elevated : theme.card,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.historyItemTextWrap}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.historyItemTitle,
                      containsMyanmarText(item.title) &&
                        styles.myanmarHistoryItemTitle,
                      getMyanmarTextStyle(item.title, 'bold'),
                      { color: isActive ? theme.primary : theme.text },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.historyItemPreview,
                      containsMyanmarText(preview) &&
                        styles.myanmarHistoryItemPreview,
                      getMyanmarTextStyle(preview),
                      { color: theme.subtext },
                    ]}
                  >
                    {preview}
                  </Text>
                </View>

                {sessions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => onDeleteSession(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.historyDelete}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.subtext}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </View>
  );
}

export default function FloatingChat() {
  const {
    isOpen,
    close,
    toggle,
    sessions,
    activeSession,
    activeSessionId,
    messages,
    sendMessage,
    updateMessage,
    setActiveConversationId,
    newChat,
    selectSession,
    deleteSession,
  } = useChat();
  const { theme: appTheme } = useTheme();
  const theme = getChatTheme(appTheme);
  const styles = useMemo(() => createChatStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const launcherPosition = useMemo(
    () => getFloatingChatPosition(insets, Platform.OS),
    [insets],
  );
  const { user } = useAuth();
  const userName = (user?.fullname || user?.name || '').trim();
  const firstName = userName.split(' ')[0];
  const headerGreeting = userName ? `မင်္ဂလာပါ, ${firstName} 👋` : '';
  const emptyGreeting = userName
    ? `မင်္ဂလာပါ ${firstName} 👋\nကျွန်တော်က HomeMate ပါ!`
    : 'မင်္ဂလာပါ 👋\nကျွန်တော်က HomeMate ပါ!';
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedbackSendingById, setFeedbackSendingById] = useState({});
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackType, setFeedbackType] = useState('incorrect');
  const [feedbackComment, setFeedbackComment] = useState('');
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const bobAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const {
    listening,
    voiceAvailable,
    startListening,
    stopListening,
    stopSpeaking,
  } = useVoiceAssistant({
    onVoiceResponse: res => {
      const userText =
        res.userTranscript && res.userTranscript !== '[Audio Processing Failed]'
          ? `🎤 ${res.userTranscript}`
          : '🎤 Voice Message';
      sendMessage(userText, 'user', { sessionId: activeSessionId });

      sendMessage(res.transcript || '🔊 Audio Response', 'bot', {
        sessionId: activeSessionId,
      });
      setSending(false);
    },
    onError: err => {
      sendMessage(err || 'Failed to process voice.', 'bot', {
        sessionId: activeSessionId,
      });
      setSending(false);
    },
  });

  useEffect(() => {
    if (!isOpen) setHistoryOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;

    stopSpeaking();
    if (listening) stopListening();
  }, [isOpen, listening, stopListening, stopSpeaking]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        try {
          inputRef.current.focus();
        } catch (e) {}
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [isOpen, messages.length, sending]);

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration: CHAT_BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration: CHAT_BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: CHAT_BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: CHAT_BOB_DURATION,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    bobLoop.start();
    glowLoop.start();

    return () => {
      bobLoop.stop();
      glowLoop.stop();
    };
  }, [bobAnim, glowAnim]);

  const translateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -CHAT_BOB_DISTANCE],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.42],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.04],
  });
  const micUnavailable = voiceAvailable === false;
  const micIconName = listening
    ? 'mic'
    : micUnavailable
    ? 'mic-off-outline'
    : 'mic-outline';
  const micAccessibilityLabel = listening
    ? 'Stop voice input'
    : micUnavailable
    ? 'Voice input unavailable'
    : 'Start voice input';
  const micAccessibilityHint = micUnavailable
    ? 'Speech recognition is unavailable on this emulator or device'
    : 'Uses speech recognition to fill the message box';

  async function handleSend() {
    const userText = text.trim();
    const targetSessionId = activeSessionId;

    if (!userText || sending || !targetSessionId) return;

    setText('');
    setSending(true);

    sendMessage(userText, 'user', { sessionId: targetSessionId });

    try {
      const recentHistory = messages.slice(-8).map(item => ({
        role: item.from === 'bot' ? 'assistant' : 'user',
        content: item.text,
      }));
      const result = await sendAIMessage(userText, {
        conversationId: activeSession?.conversationId,
        syncGlobalConversationId: false,
        enableMcpTools: true,
        ragContext: 'resident',
        history: recentHistory,
      });

      if (result?.conversationId) {
        setActiveConversationId(result.conversationId, {
          sessionId: targetSessionId,
        });
      }

      const assistantText =
        result?.assistantMessage?.content ||
        result?.assistantMessage?.text ||
        'AI response မရပါ။';
      const nextConversationId =
        result?.conversationId || activeSession?.conversationId || null;

      sendMessage(assistantText, 'bot', {
        sessionId: targetSessionId,
        metadata: {
          assistantMessageId: result?.assistantMessage?.id ?? null,
          conversationId: nextConversationId,
          feedbackRating: null,
          knowledgeSources:
            result?.knowledgeSources ||
            result?.assistantMessage?.knowledgeSources ||
            [],
          toolCalls:
            result?.toolCalls || result?.assistantMessage?.toolCalls || [],
          intent: result?.intent || result?.assistantMessage?.intent || null,
        },
      });
    } catch (err) {
      sendMessage(
        err.message || 'AI assistant ချိတ်ဆက်မရပါ။ Backend/Ollama ကိုစစ်ပါ။',
        'bot',
        { sessionId: targetSessionId },
      );
    } finally {
      setSending(false);
    }
  }

  async function handleFeedback(item, rating, options = {}) {
    const messageId = item.assistantMessageId;
    const conversationId = item.conversationId || activeSession?.conversationId;

    if (
      !messageId ||
      !conversationId ||
      feedbackSendingById[item.id] ||
      item.feedbackRating === rating
    ) {
      return;
    }

    const previousRating = item.feedbackRating ?? null;

    setFeedbackSendingById(previous => ({ ...previous, [item.id]: true }));
    updateMessage(
      item.id,
      {
        feedbackRating: rating,
        feedbackError: null,
      },
      { sessionId: activeSessionId },
    );

    try {
      await sendChatFeedback({
        conversationId,
        messageId,
        rating,
        helpful: rating > 0,
        feedbackType:
          options.feedbackType || (rating > 0 ? 'helpful' : 'not_helpful'),
        comment: options.comment || '',
      });
      if (rating < 0) {
        setFeedbackTarget(null);
        setFeedbackComment('');
        setFeedbackType('incorrect');
      }
    } catch (err) {
      updateMessage(
        item.id,
        {
          feedbackRating: previousRating,
          feedbackError: err.message || 'Feedback မသိမ်းနိုင်သေးပါ။',
        },
        { sessionId: activeSessionId },
      );
    } finally {
      setFeedbackSendingById(previous => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
    }
  }

  function openNegativeFeedback(item) {
    setFeedbackTarget(item);
    setFeedbackType('incorrect');
    setFeedbackComment('');
  }

  function submitDetailedFeedback() {
    if (!feedbackTarget) return;
    handleFeedback(feedbackTarget, -1, {
      feedbackType,
      comment: feedbackComment.trim(),
    });
  }

  function handleClose() {
    setHistoryOpen(false);
    if (listening) stopListening();
    stopSpeaking();
    close();
  }

  function handleMicPress() {
    if (sending) return;

    if (listening) {
      setSending(true);
      stopListening();
      return;
    }

    startListening();
  }

  function handleNewChat() {
    newChat();
    setText('');
    setHistoryOpen(false);
  }

  function handleSelectSession(sessionId) {
    selectSession(sessionId);
    setHistoryOpen(false);
  }

  function handleDeleteSession(sessionId) {
    deleteSession(sessionId);
  }

  return (
    <>
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.chatBox,
              {
                backgroundColor: theme.background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            <View
              style={[
                styles.header,
                {
                  backgroundColor: theme.surface,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setHistoryOpen(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.menuButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons name="menu" size={22} color={theme.primary} />
              </TouchableOpacity>

              <View style={styles.headerTitleWrap}>
                <Text style={[styles.headerText, { color: theme.text }]}>
                  HomeMate 🏠
                </Text>
                {userName ? (
                  <Text
                    style={[
                      styles.headerSubText,
                      styles.myanmarHeaderSubText,
                      getMyanmarTextStyle(headerGreeting),
                      { color: theme.subtext },
                    ]}
                  >
                    {headerGreeting}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {historyOpen && (
              <HistoryDrawer
                theme={theme}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onClose={() => setHistoryOpen(false)}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                topInset={insets.top}
                bottomInset={insets.bottom}
              />
            )}

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={i => i.id}
              style={styles.messages}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={
                sending ? <ThinkingIndicator theme={theme} /> : null
              }
              ListEmptyComponent={
                !sending ? (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIconWrap,
                        {
                          backgroundColor: theme.elevated,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <Ionicons name="home" size={28} color={theme.primary} />
                    </View>
                    <Text
                      style={[
                        styles.emptyGreeting,
                        getMyanmarTextStyle(emptyGreeting, 'bold'),
                        { color: theme.text },
                      ]}
                    >
                      {emptyGreeting}
                    </Text>
                    <Text style={[styles.emptyHint, { color: theme.subtext }]}>
                      Bills • Maintenance • Helpers • Visitors • Parking • SOS •
                      RFID Card
                    </Text>
                    <View style={styles.quickChips}>
                      {[
                        'သင့် bill ဘယ်လောက်ကျန်လဲ?',
                        'ပါကင် slot ဘယ်လောက်ကျန်လဲ?',
                        'သင့် အခန်းမှာ ဘာသတင်းရှိသလဲ?',
                        'ဧည့်သည် မှတ်ပုံတင်ချင်သည်',
                        'Helper request တင်ချင်သည်',
                        'ကဒ်ပျောက်သွားသည်',
                        'အရေးပေါ် အကူအညီလိုသည်',
                        'Bills များကို ငွေပေးချေချင်သည်',
                      ].map(chip => (
                        <TouchableOpacity
                          key={chip}
                          onPress={() => setText(chip)}
                          style={[
                            styles.quickChip,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.goldBorder,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              styles.myanmarQuickChipText,
                              getMyanmarTextStyle(chip, 'bold'),
                              { color: theme.primary },
                            ]}
                          >
                            {chip}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null
              }
              onContentSizeChange={() => {
                listRef.current?.scrollToEnd({ animated: true });
              }}
              renderItem={({ item }) => {
                const isUser = item.from === 'user';
                const canSendFeedback =
                  !isUser && item.assistantMessageId && item.conversationId;
                const feedbackBusy = Boolean(feedbackSendingById[item.id]);
                const sourceTitles = Array.isArray(item.knowledgeSources)
                  ? item.knowledgeSources
                      .map(source => source?.title)
                      .filter(Boolean)
                      .slice(0, 2)
                  : [];

                return (
                  <View
                    style={[
                      styles.messageRow,
                      isUser ? styles.userMsg : styles.botMsg,
                      {
                        backgroundColor: isUser
                          ? theme.userBubble
                          : theme.assistantBubble,
                        borderColor: isUser ? theme.primarySoft : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        containsMyanmarText(item.text) &&
                          styles.myanmarMessageText,
                        getMyanmarTextStyle(item.text),
                        {
                          color: isUser ? theme.primaryText : theme.text,
                        },
                      ]}
                    >
                      {item.text}
                    </Text>

                    {!isUser && sourceTitles.length > 0 && (
                      <Text
                        style={[
                          styles.messageMeta,
                          getMyanmarTextStyle(sourceTitles.join(', ')),
                          { color: theme.subtext },
                        ]}
                      >
                        Knowledge: {sourceTitles.join(', ')}
                      </Text>
                    )}

                    {!isUser && item.toolCalls?.length > 0 && (
                      <Text
                        style={[styles.messageMeta, { color: theme.subtext }]}
                      >
                        Tools: {item.toolCalls.length}
                      </Text>
                    )}

                    {canSendFeedback && (
                      <View style={styles.feedbackRow}>
                        <TouchableOpacity
                          onPress={() =>
                            handleFeedback(item, 1, { feedbackType: 'helpful' })
                          }
                          disabled={feedbackBusy}
                          accessibilityLabel="Mark answer helpful"
                          hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                          style={[
                            styles.feedbackButton,
                            {
                              backgroundColor:
                                item.feedbackRating === 1
                                  ? theme.primaryBg
                                  : theme.input,
                              borderColor:
                                item.feedbackRating === 1
                                  ? theme.primary
                                  : theme.border,
                            },
                            feedbackBusy && styles.feedbackButtonDisabled,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.feedbackRating === 1
                                ? 'thumbs-up'
                                : 'thumbs-up-outline'
                            }
                            size={15}
                            color={
                              item.feedbackRating === 1
                                ? theme.primary
                                : theme.subtext
                            }
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openNegativeFeedback(item)}
                          disabled={feedbackBusy}
                          accessibilityLabel="Mark answer not helpful"
                          hitSlop={{ top: 7, bottom: 7, left: 7, right: 7 }}
                          style={[
                            styles.feedbackButton,
                            {
                              backgroundColor:
                                item.feedbackRating === -1
                                  ? theme.dangerBg
                                  : theme.input,
                              borderColor:
                                item.feedbackRating === -1
                                  ? theme.danger
                                  : theme.border,
                            },
                            feedbackBusy && styles.feedbackButtonDisabled,
                          ]}
                        >
                          <Ionicons
                            name={
                              item.feedbackRating === -1
                                ? 'thumbs-down'
                                : 'thumbs-down-outline'
                            }
                            size={15}
                            color={
                              item.feedbackRating === -1
                                ? theme.danger
                                : theme.subtext
                            }
                          />
                        </TouchableOpacity>

                        {feedbackBusy && (
                          <ActivityIndicator
                            size="small"
                            color={theme.primary}
                          />
                        )}
                      </View>
                    )}

                    {!isUser && item.feedbackError && (
                      <Text
                        style={[
                          styles.messageMeta,
                          getMyanmarTextStyle(item.feedbackError),
                          { color: theme.danger },
                        ]}
                      >
                        {item.feedbackError}
                      </Text>
                    )}
                  </View>
                );
              }}
            />

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={nextText => {
                  setText(nextText);
                }}
                placeholder={listening ? 'Listening...' : 'Type a message'}
                placeholderTextColor={theme.subtext}
                style={[
                  styles.input,
                  getMyanmarTextStyle(text),
                  {
                    backgroundColor: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                keyboardType="default"
                multiline
                returnKeyType="default"
                textAlignVertical="center"
              />

              <TouchableOpacity
                onPress={handleMicPress}
                disabled={sending}
                accessibilityLabel={micAccessibilityLabel}
                accessibilityHint={micAccessibilityHint}
                style={[
                  styles.micButton,
                  {
                    backgroundColor: listening ? theme.primary : theme.card,
                    borderColor: listening ? theme.primarySoft : theme.border,
                  },
                  (sending || micUnavailable) && styles.controlDisabled,
                ]}
              >
                <Ionicons
                  name={micIconName}
                  size={19}
                  color={listening ? theme.primaryText : theme.text}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSend}
                disabled={sending || !text.trim()}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      sending || !text.trim() ? theme.card : theme.primary,
                    borderColor:
                      sending || !text.trim()
                        ? theme.border
                        : theme.primarySoft,
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={text.trim() ? theme.primaryText : theme.primary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(feedbackTarget)}
        animationType="fade"
        transparent
        onRequestClose={() => setFeedbackTarget(null)}
      >
        <View style={styles.feedbackModalLayer}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.feedbackModalScrim}
            onPress={() => setFeedbackTarget(null)}
          />
          <View
            style={[
              styles.feedbackModalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.goldBorder,
              },
            ]}
          >
            <Text style={[styles.feedbackModalTitle, { color: theme.text }]}>
              How can this answer improve?
            </Text>
            <View style={styles.feedbackTypeRow}>
              {[
                ['incorrect', 'Incorrect'],
                ['missing_information', 'Missing info'],
                ['other', 'Other'],
              ].map(([value, label]) => {
                const selected = feedbackType === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.feedbackTypeChip,
                      {
                        backgroundColor: selected
                          ? theme.primaryBg
                          : theme.input,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setFeedbackType(value)}
                  >
                    <Text
                      style={[
                        styles.feedbackTypeText,
                        { color: selected ? theme.primary : theme.text },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Additional comment (optional)"
              placeholderTextColor={theme.subtext}
              multiline
              maxLength={1000}
              style={[
                styles.feedbackComment,
                {
                  backgroundColor: theme.input,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
            />
            <View style={styles.feedbackModalActions}>
              <TouchableOpacity
                style={[styles.feedbackCancel, { borderColor: theme.border }]}
                onPress={() => setFeedbackTarget(null)}
              >
                <Text style={{ color: theme.subtext }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackSubmit,
                  { backgroundColor: theme.primary },
                ]}
                onPress={submitDetailedFeedback}
                disabled={Boolean(feedbackSendingById[feedbackTarget?.id])}
              >
                {feedbackSendingById[feedbackTarget?.id] ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <Text
                    style={[
                      styles.feedbackSubmitText,
                      { color: theme.primaryText },
                    ]}
                  >
                    Send feedback
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View
        pointerEvents="box-none"
        style={[styles.container, launcherPosition]}
      >
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: theme.primary,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open chat"
            accessibilityHint="Opens assistant chat"
            onPress={toggle}
            activeOpacity={0.86}
            style={[
              styles.fab,
              {
                shadowColor: theme.primary,
              },
            ]}
          >
            <Image
              source={CHATBOT_LOGO}
              resizeMode="contain"
              accessible={false}
              accessibilityIgnoresInvertColors
              style={styles.fabLogo}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
}

const createChatStyles = theme =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      zIndex: 9999,
    },
    glow: {
      position: 'absolute',
      top: -4,
      left: -4,
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.3,
      shadowRadius: 9,
      elevation: 8,
      overflow: 'hidden',
    },
    fabLogo: {
      width: 64,
      height: 64,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.overlay,
    },
    chatBox: {
      height: '100%',
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 24,
    },
    header: {
      height: CHAT_HEADER_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
    },
    menuButton: {
      position: 'absolute',
      left: 12,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      borderWidth: 1,
    },
    headerText: {
      fontSize: 16,
      fontWeight: '700',
    },
    closeButton: {
      position: 'absolute',
      right: 12,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyLayer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 20,
    },
    historyScrim: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.overlay,
    },
    historyPanel: {
      width: 270,
      height: '100%',
      borderRightWidth: 1,
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 12,
      shadowColor: theme.shadow,
      shadowOffset: { width: 8, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 18,
      elevation: 24,
    },
    historyHeader: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    historyTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    historyClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    newChatButton: {
      minHeight: 42,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      marginBottom: 10,
      justifyContent: 'center',
    },
    newChatText: {
      fontSize: 14,
      fontWeight: '700',
    },
    historyList: {
      paddingBottom: 10,
    },
    historyItem: {
      minHeight: 60,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 8,
    },
    historyItemTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    historyItemTitle: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
    myanmarHistoryItemTitle: {
      lineHeight: 26,
    },
    historyItemPreview: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
    },
    myanmarHistoryItemPreview: {
      lineHeight: 23,
    },
    historyDelete: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    messages: {
      flex: 1,
      padding: 12,
      backgroundColor: theme.background,
    },
    messageRow: {
      marginVertical: 6,
      padding: 10,
      borderRadius: 16,
      borderWidth: 1,
      maxWidth: '85%',
    },
    thinkingRow: {
      alignSelf: 'flex-start',
    },
    thinkingBubble: {
      minHeight: 42,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    thinkingText: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 20,
    },
    myanmarThinkingText: {
      lineHeight: 24,
    },
    thinkingDots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    thinkingDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    userMsg: {
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    },
    botMsg: {
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 21,
    },
    myanmarMessageText: {
      lineHeight: 27,
    },
    messageMeta: {
      marginTop: 6,
      fontSize: 11,
      lineHeight: 16,
    },
    feedbackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
    },
    feedbackButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedbackButtonDisabled: {
      opacity: 0.65,
    },
    controlDisabled: {
      opacity: 0.65,
    },
    feedbackModalLayer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      backgroundColor: theme.overlay,
    },
    feedbackModalScrim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay,
    },
    feedbackModalCard: {
      width: '100%',
      maxWidth: 420,
      borderWidth: 1,
      borderRadius: 16,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 24,
    },
    feedbackModalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
    feedbackTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    feedbackTypeChip: {
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    feedbackTypeText: { fontSize: 12, fontWeight: '700' },
    feedbackComment: {
      minHeight: 90,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    feedbackModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14,
    },
    feedbackCancel: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    feedbackSubmit: {
      minWidth: 120,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    feedbackSubmitText: { fontSize: 13, fontWeight: '800' },
    inputRow: {
      flexDirection: 'row',
      padding: 12,
      alignItems: 'flex-end',
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    input: {
      flex: 1,
      borderRadius: 22,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      minHeight: 44,
      maxHeight: 96,
      fontSize: 16,
      lineHeight: 24,
      includeFontPadding: true,
    },
    micButton: {
      marginLeft: 8,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    sendButton: {
      marginLeft: 8,
      width: 52,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleWrap: {
      alignItems: 'center',
      flex: 1,
    },
    headerSubText: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 1,
      opacity: 0.85,
    },
    myanmarHeaderSubText: {
      lineHeight: 21,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 16,
    },
    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      borderWidth: 1,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 10,
      elevation: 5,
    },
    emptyGreeting: {
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 28,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 20,
    },
    quickChips: {
      width: '100%',
      gap: 8,
    },
    quickChip: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: 'center',
    },
    quickChipText: {
      fontSize: 13,
      fontWeight: '600',
    },
    myanmarQuickChipText: {
      lineHeight: 24,
    },
  });
