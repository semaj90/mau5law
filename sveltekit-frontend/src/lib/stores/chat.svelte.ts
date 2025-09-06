// Chat and user history store using Svelte 5 runes with time/context awareness
// Importable anywhere; values are reactive via Svelte runes
//
// Note: This file uses Svelte 5 runes in a .svelte.ts module.
// The Svelte compiler will transform $state/$derived appropriately.

import type {
  ChatMessage,
  ChatSession,
  ConnectionStatus,
  Recommendation,
  UserActivity,
  RAGContext,
} from "$lib/types/ai-chat";

// Internal shapes

// Map of sessionId -> messages
export type SessionMap = Map<string, ChatMessage[]>;

// Core state - using a store object pattern for Svelte 5 runes
const chatStore = (() => {
  let sessions = $state<ChatSession[]>([]);
  let sessionMessages = $state<SessionMap>(new Map());
  let currentSessionId = $state<string | null>(null);
  let connectionStatus = $state<ConnectionStatus>("disconnected");
  let isTyping = $state(false);
  let userActivity = $state<UserActivity[]>([]);
  let recommendations = $state<Recommendation[]>([]);

  return {
    get sessions() { return sessions; },
    set sessions(value) { sessions = value; },
    get sessionMessages() { return sessionMessages; },
    set sessionMessages(value) { sessionMessages = value; },
    get currentSessionId() { return currentSessionId; },
    set currentSessionId(value) { currentSessionId = value; },
    get connectionStatus() { return connectionStatus; },
    set connectionStatus(value) { connectionStatus = value; },
    get isTyping() { return isTyping; },
    set isTyping(value) { isTyping = value; },
    get userActivity() { return userActivity; },
    set userActivity(value) { userActivity = value; },
    get recommendations() { return recommendations; },
    set recommendations(value) { recommendations = value; }
  };
})();

// Export individual properties for backward compatibility
export const sessions = {
  get value() { return chatStore.sessions; },
  set value(val) { chatStore.sessions = val; }
};
export const sessionMessages = {
  get value() { return chatStore.sessionMessages; },
  set value(val) { chatStore.sessionMessages = val; }
};
export const currentSessionId = {
  get value() { return chatStore.currentSessionId; },
  set value(val) { chatStore.currentSessionId = val; }
};
export const connectionStatus = {
  get value() { return chatStore.connectionStatus; },
  set value(val) { chatStore.connectionStatus = val; }
};
export const isTyping = {
  get value() { return chatStore.isTyping; },
  set value(val) { chatStore.isTyping = val; }
};
export const userActivity = {
  get value() { return chatStore.userActivity; },
  set value(val) { chatStore.userActivity = val; }
};
export const recommendations = {
  get value() { return chatStore.recommendations; },
  set value(val) { chatStore.recommendations = val; }
};

// Deriveds
export const currentSession = $derived(
  chatStore.sessions.find((s) => s.id === chatStore.currentSessionId) ?? null
);

export const currentMessages = $derived(
  chatStore.currentSessionId ? (chatStore.sessionMessages.get(chatStore.currentSessionId) ?? []) : []
);

// Session helpers
export function createSession(input: {
  id: string;
  title?: string;
  context?: RAGContext;
  created?: number;
}): ChatSession {
  const now = Date.now();
  const session: ChatSession = {
    id: input.id,
    title: input.title ?? "New Chat",
    created: input.created ?? now,
    updated: now,
    messageCount: 0,
    status: "active",
    context: input.context,
  };
  chatStore.sessions = [session, ...chatStore.sessions.filter((s) => s.id !== session.id)];
  if (!chatStore.sessionMessages.has(session.id)) {
    chatStore.sessionMessages.set(session.id, []);
  }
  chatStore.currentSessionId = session.id;
  return session;
}

export function switchSession(id: string) {
  if (chatStore.sessions.some((s) => s.id === id)) chatStore.currentSessionId = id;
}

export function addMessage(msg: ChatMessage) {
  const list = chatStore.sessionMessages.get(msg.sessionId) ?? [];
  list.push(msg);
  chatStore.sessionMessages.set(msg.sessionId, list);
  const idx = chatStore.sessions.findIndex((s) => s.id === msg.sessionId);
  if (idx !== -1) {
    const updated = { ...chatStore.sessions[idx] };
    updated.messageCount = list.length;
    updated.updated = Date.now();
    chatStore.sessions = [updated, ...chatStore.sessions.filter((s) => s.id !== updated.id)];
  }
}

// Presence tracking
export function setUserActivity(activity: UserActivity) {
  const i = chatStore.userActivity.findIndex(
    (a) => a.userId === activity.userId && a.sessionId === activity.sessionId
  );
  if (i === -1) chatStore.userActivity.push(activity);
  else chatStore.userActivity[i] = activity;
}

export function clearStaleActivity(staleMs = 60_000) {
  const cutoff = Date.now() - staleMs;
  chatStore.userActivity = chatStore.userActivity.filter((a) => a.lastSeen >= cutoff);
}

// Time-aware context window selection (recency + role weighting)
export function getContextWindow(opts: {
  sessionId: string;
  maxTokens?: number; // soft budget
  maxMessages?: number;
  halfLifeMinutes?: number; // recency decay half-life
}) {
  const {
    sessionId,
    maxTokens = 3000,
    maxMessages = 30,
    halfLifeMinutes = 30,
  } = opts;
  const messages = chatStore.sessionMessages.get(sessionId) ?? [];
  const now = Date.now();
  const decay = (t: number) => {
    const dtMin = (now - t) / 60000;
    return Math.pow(0.5, dtMin / halfLifeMinutes);
  };
  const roleWeight = (role: ChatMessage["role"]) =>
    role === "assistant" ? 1.0 : role === "user" ? 0.9 : 0.5;

  const scored = messages.map((m) => ({
    msg: m,
    score: decay(m.timestamp) * roleWeight(m.role),
    estTokens: Math.ceil(m.content.length / 4),
  }));

  // Sort by weighted recency, then take until budgets hit
  scored.sort((a, b) => b.score - a.score);
  const out: ChatMessage[] = [];
  let tokenBudget = 0;
  for (const s of scored) {
    if (out.length >= maxMessages) break;
    if (tokenBudget + s.estTokens > maxTokens) continue;
    out.push(s.msg);
    tokenBudget += s.estTokens;
  }
  // Preserve chronological order for the final window
  out.sort((a, b) => a.timestamp - b.timestamp);
  return out;
}

// Realtime (WebSocket + optional SSE)
let ws: WebSocket | null = null;
let heartbeat: number | null = null;
let es: EventSource | null = null;

export function connectRealtimeWS(
  url = typeof location !== "undefined"
    ? (() => {
        try {
          const env = (import.meta as any)?.env ?? {};
          const explicit = env["VITE_WS_URL"];
          return explicit || `${location.origin.replace(/^http/, "ws")}/api/ws`;
        } catch {
          return `${location.origin.replace(/^http/, "ws")}/api/ws`;
        }
      })()
    : ""
) {
  if (!url) return;
  try {
    chatStore.connectionStatus = "connecting";
    ws = new WebSocket(url);
    ws.onopen = () => {
      chatStore.connectionStatus = "connected";
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = setInterval(
        () =>
          ws?.readyState === WebSocket.OPEN &&
          ws.send(JSON.stringify({ type: "ping" })),
        25_000
      ) as any as number;
    };
    ws.onclose = () => {
      chatStore.connectionStatus = "disconnected";
      if (heartbeat) clearInterval(heartbeat);
    };
    ws.onerror = () => {
      chatStore.connectionStatus = "error";
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        if (data.type === "chat.message")
          addMessage(data.payload as ChatMessage);
        if (data.type === "presence.update")
          setUserActivity(data.payload as UserActivity);
        if (data.type === "recommendations")
          chatStore.recommendations = data.payload as Recommendation[];
      } catch {
        // ignore
      }
    };
  } catch {
    chatStore.connectionStatus = "error";
  }
}

export function connectRealtimeSSE(
  url = typeof location !== "undefined" ? `${location.origin}/api/realtime` : ""
) {
  if (!url) return;
  try {
    es = new EventSource(url);
    es.onopen = () => (chatStore.connectionStatus = "connected");
    es.onerror = () => (chatStore.connectionStatus = "error");
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "chat.message")
          addMessage(data.payload as ChatMessage);
        if (data.type === "presence.update")
          setUserActivity(data.payload as UserActivity);
        if (data.type === "recommendations")
          chatStore.recommendations = data.payload as Recommendation[];
      } catch {
        // ignore
      }
    };
  } catch {
    chatStore.connectionStatus = "error";
  }
}

export function sendRealtime(payload: any) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  // For SSE, send via fetch POST to /api/realtime
  if (!ws && typeof fetch !== "undefined") {
    fetch("/api/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
}

export function disconnectRealtime() {
  if (heartbeat) clearInterval(heartbeat);
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  if (es) es.close();
  ws = null;
  es = null;
  chatStore.connectionStatus = "disconnected";
}
