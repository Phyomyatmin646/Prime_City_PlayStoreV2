import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  deleteChatConversation,
  loadChatSessions,
  resetConversation,
  setConversationId,
} from '../services/chatService';

const ChatContext = createContext(null);

/**
 * Returns a user-specific AsyncStorage key so that each user's chat sessions
 * are stored in an isolated partition. This prevents User A's history from
 * being visible to User B after a logout/login cycle.
 */
function getChatStorageKey(userId) {
  if (!userId || userId === 'session') return null;
  return `@smart_city_mobile/chat_sessions_v1__${userId}`;
}

function createSession() {
  const now = new Date().toISOString();

  return {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New chat',
    messages: [],
    conversationId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildTitle(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (!normalized) return 'New chat';

  return normalized.length > 34 ? `${normalized.slice(0, 34)}...` : normalized;
}

function createLocalMessage(text, from, extras = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    from,
    createdAt: new Date().toISOString(),
    ...extras,
  };
}

function mapServerSession(serverSession, localSession) {
  const conversationId = serverSession.conversationId;
  const messages = (serverSession.messages || []).map(message => ({
    id: message.id,
    text: message.content,
    from: message.role === 'assistant' ? 'bot' : 'user',
    createdAt: message.timestamp,
    ...(message.role === 'assistant'
      ? {
          assistantMessageId: message.id,
          conversationId,
          toolCalls: message.toolCalls || [],
          knowledgeSources: message.knowledgeSources || [],
          intent: message.intent || null,
          feedbackRating: null,
        }
      : {}),
  }));

  return {
    id: localSession?.id || `server-${conversationId}`,
    title: serverSession.title || localSession?.title || 'New chat',
    messages,
    conversationId,
    createdAt: serverSession.createdAt || localSession?.createdAt,
    updatedAt: serverSession.updatedAt || localSession?.updatedAt,
  };
}

export function ChatProvider({ children, userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const activeSessionIdRef = useRef(null);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Re-load sessions whenever the logged-in user changes so each user sees
  // only their own history.
  useEffect(() => {
    let mounted = true;
    const CHAT_HISTORY_KEY = getChatStorageKey(userId);

    async function loadSessions() {
      try {
        const raw = CHAT_HISTORY_KEY
          ? await AsyncStorage.getItem(CHAT_HISTORY_KEY)
          : null;
        const parsed = raw ? JSON.parse(raw) : null;
        const savedSessions = Array.isArray(parsed?.sessions)
          ? parsed.sessions
          : [];
        let serverSessions = [];

        if (userId) {
          try {
            serverSessions = await loadChatSessions();
          } catch (err) {
            serverSessions = [];
          }
        }

        const localByConversation = new Map(
          savedSessions
            .filter(session => session.conversationId)
            .map(session => [session.conversationId, session]),
        );
        const serverConversationIds = new Set(
          serverSessions.map(session => session.conversationId),
        );
        const mergedSessions = [
          ...serverSessions.map(session =>
            mapServerSession(
              session,
              localByConversation.get(session.conversationId),
            ),
          ),
          ...savedSessions.filter(
            session =>
              !session.conversationId ||
              !serverConversationIds.has(session.conversationId),
          ),
        ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (!mounted) return;

        if (mergedSessions.length > 0) {
          const nextActiveId =
            parsed.activeSessionId &&
            mergedSessions.some(session => session.id === parsed.activeSessionId)
              ? parsed.activeSessionId
              : mergedSessions[0].id;
          const activeSession = mergedSessions.find(
            session => session.id === nextActiveId,
          );

          setSessions(mergedSessions);
          setActiveSessionId(nextActiveId);
          setConversationId(activeSession?.conversationId ?? null);
        } else {
          const initialSession = createSession();
          setSessions([initialSession]);
          setActiveSessionId(initialSession.id);
          resetConversation();
        }
      } catch (err) {
        if (!mounted) return;

        const initialSession = createSession();
        setSessions([initialSession]);
        setActiveSessionId(initialSession.id);
        resetConversation();
      } finally {
        if (mounted) setHydrated(true);
      }
    }

    // Reset state before loading the new user's sessions
    setHydrated(false);
    setSessions([]);
    setActiveSessionId(null);
    resetConversation();
    loadSessions();

    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;

    const CHAT_HISTORY_KEY = getChatStorageKey(userId);
    if (!CHAT_HISTORY_KEY) return;
    AsyncStorage.setItem(
      CHAT_HISTORY_KEY,
      JSON.stringify({ sessions, activeSessionId }),
    ).catch(() => {});
  }, [activeSessionId, hydrated, sessions, userId]);

  const activeSession = useMemo(
    () => sessions.find(session => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  const messages = activeSession?.messages ?? [];

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(value => !value), []);

  const newChat = useCallback(() => {
    const session = createSession();

    setSessions(previous => [session, ...previous]);
    setActiveSessionId(session.id);
    resetConversation();

    return session;
  }, []);

  const selectSession = useCallback(
    sessionId => {
      const target = sessions.find(session => session.id === sessionId);

      if (!target) return;

      setActiveSessionId(sessionId);
      setConversationId(target.conversationId ?? null);
    },
    [sessions],
  );

  const deleteSession = useCallback(
    async sessionId => {
      const target = sessions.find(session => session.id === sessionId);
      if (target?.conversationId) {
        try {
          await deleteChatConversation(target.conversationId);
        } catch (err) {
          return false;
        }
      }
      const remaining = sessions.filter(session => session.id !== sessionId);

      if (remaining.length === 0) {
        const session = createSession();
        setSessions([session]);
        setActiveSessionId(session.id);
        resetConversation();
        return true;
      }

      setSessions(remaining);

      if (activeSessionId === sessionId) {
        setActiveSessionId(remaining[0].id);
        setConversationId(remaining[0].conversationId ?? null);
      }
      return true;
    },
    [activeSessionId, sessions],
  );

  const sendMessage = useCallback(
    (text, from = 'user', options = {}) => {
      const sessionId = options.sessionId ?? activeSessionId;
      const message = createLocalMessage(text, from, options.metadata ?? {});

      if (!sessionId) return message;

      setSessions(previous =>
        previous.map(session => {
          if (session.id !== sessionId) return session;

          const isFirstUserMessage =
            from === 'user' && !session.messages.some(item => item.from === 'user');

          return {
            ...session,
            title: isFirstUserMessage ? buildTitle(text) : session.title,
            messages: [...session.messages, message],
            updatedAt: message.createdAt,
          };
        }),
      );

      return message;
    },
    [activeSessionId],
  );

  const updateMessage = useCallback(
    (messageId, updates, options = {}) => {
      const sessionId = options.sessionId ?? activeSessionId;

      if (!sessionId || !messageId) return;

      setSessions(previous =>
        previous.map(session => {
          if (session.id !== sessionId) return session;

          return {
            ...session,
            messages: session.messages.map(message => {
              if (message.id !== messageId) return message;

              const nextUpdates =
                typeof updates === 'function' ? updates(message) : updates;

              return {
                ...message,
                ...(nextUpdates ?? {}),
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [activeSessionId],
  );

  const setActiveConversationId = useCallback(
    (conversationId, options = {}) => {
      const sessionId = options.sessionId ?? activeSessionId;

      if (!sessionId) return;

      if (sessionId === activeSessionIdRef.current) {
        setConversationId(conversationId ?? null);
      }

      setSessions(previous =>
        previous.map(session =>
          session.id === sessionId
            ? {
                ...session,
                conversationId: conversationId ?? null,
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );
    },
    [activeSessionId],
  );

  const clear = useCallback(() => {
    if (!activeSessionId) return;

    setSessions(previous =>
      previous.map(session =>
        session.id === activeSessionId
          ? {
              ...session,
              title: 'New chat',
              messages: [],
              conversationId: null,
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
    resetConversation();
  }, [activeSessionId]);

  const value = {
    isOpen,
    open,
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
    clear,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

export default ChatProvider;
