import { API_BASE_URL } from '../config/api';
import { apiRequest } from '../api/client';

let conversationId = null;
const FALLBACK_ERROR_MESSAGE =
  'AI assistant ချိတ်ဆက်မရသေးပါ။ API connection ကိုစစ်ပါ။';

function createMessage(role, content, extras = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
    ...extras,
  };
}

function normalizeAssistantMessage(data) {
  if (data.assistantMessage) return data.assistantMessage;

  if (data.reply) {
    return createMessage('assistant', data.reply, {
      toolCalls: data.toolCalls ?? [],
    });
  }

  return createMessage('assistant', 'AI response မရပါ။', {
    isError: true,
  });
}

export async function sendMessage(text, options = {}) {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error('Message cannot be empty');
  }

  const data = await apiRequest('/ai/chat', {
    method: 'POST',
    auth: true,
    body: {
      conversationId: options.conversationId ?? conversationId,
      message: trimmed,
      history: options.history ?? [],
      enableMcpTools: options.enableMcpTools ?? true,
      enableRag: options.enableRag ?? true,
      ragContext: options.ragContext ?? 'resident',
    },
  });

  if (data.meta?.usedFallback) {
    throw new Error(FALLBACK_ERROR_MESSAGE);
  }

  if (data.conversationId && options.syncGlobalConversationId !== false) {
    conversationId = data.conversationId;
  }

  const userMessage = data.userMessage || createMessage('user', trimmed);
  const assistantMessage = normalizeAssistantMessage(data);
  const nextConversationId =
    data.conversationId ?? options.conversationId ?? conversationId;
  const knowledgeSources =
    data.knowledgeSources ??
    data.meta?.knowledgeSources ??
    assistantMessage.knowledgeSources ??
    [];
  const intent = data.meta?.intent ?? assistantMessage.intent ?? null;

  return {
    userMessage,
    assistantMessage,
    conversationId: nextConversationId,
    toolCalls: data.toolCalls ?? assistantMessage.toolCalls ?? [],
    knowledgeSources,
    intent,
  };
}

export async function sendVoiceMessage({ audioBase64, mimeType = 'audio/m4a' }) {
  if (!audioBase64) {
    throw new Error('audioBase64 is required');
  }

  const data = await apiRequest('/ai/voice', {
    method: 'POST',
    auth: true,
    body: {
      audioBase64,
      mimeType,
    },
  });

  return {
    audioBase64: data.audioBase64,
    audioMimeType: data.audioMimeType,
    transcript: data.transcript,
    userTranscript: data.userTranscript,
    model: data.meta?.model,
  };
}

export async function receiveMessage() {
  return null;
}

export async function loadChatHistory() {
  try {
    const data = await apiRequest('/ai/history', {
      method: 'GET',
      auth: true,
    });

    return Array.isArray(data.messages) ? data.messages : [];
  } catch (err) {
    if (err.status === 401) return [];

    throw err;
  }
}

export async function loadChatSessions() {
  try {
    const sessions = [];
    let page = 1;
    let pages = 1;

    do {
      const data = await apiRequest(
        `/ai/history/sessions?page=${page}&limit=50`,
        { method: 'GET', auth: true },
      );
      if (Array.isArray(data.sessions)) sessions.push(...data.sessions);
      pages = Math.max(1, Number(data.pagination?.pages) || 1);
      page += 1;
    } while (page <= pages);

    return sessions;
  } catch (err) {
    if (err.status === 401) return [];
    throw err;
  }
}

export async function deleteChatConversation(conversationIdToDelete) {
  if (!conversationIdToDelete) return null;
  return apiRequest(
    `/ai/history/${encodeURIComponent(conversationIdToDelete)}`,
    { method: 'DELETE', auth: true },
  );
}

export async function sendFeedback({
  conversationId: feedbackConversationId,
  messageId,
  rating,
  helpful,
  resolved,
  comment,
  feedbackType,
  appVersion,
}) {
  if (!feedbackConversationId || !messageId) {
    throw new Error('Feedback target is missing');
  }

  const data = await apiRequest('/ai/feedback', {
    method: 'POST',
    auth: true,
    body: {
      conversationId: feedbackConversationId,
      messageId,
      rating,
      helpful: helpful ?? rating > 0,
      resolved,
      comment,
      feedbackType,
      appVersion,
    },
  });

  return data.feedback;
}

export async function invokeMcpTool(toolName, args = {}) {
  const res = await fetch(`${API_BASE_URL}/mcp/tools`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();

  return {
    toolName,
    args,
    tools: data.tools ?? [],
  };
}

export function getConversationId() {
  return conversationId;
}

export function setConversationId(nextConversationId) {
  conversationId = nextConversationId ?? null;
}

export function resetConversation() {
  conversationId = null;
}

export { createMessage, API_BASE_URL };
