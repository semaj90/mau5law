import { writable } from 'svelte/store';

export const chatSessions = writable<any[]>([]);
export const chatMessages = writable<Record<string, any[]>>({});

export async function loadSessions() {
  const r = await fetch('/api/chat/history');
  if (!r.ok) return;
  const j = await r.json();
  chatSessions.set(j.sessions || []);
}

export async function loadMessages(sessionId: string) {
  const r = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
  if (!r.ok) return;
  const j = await r.json();
  chatMessages.update((m) => ({ ...m, [sessionId]: j.messages || [] }));
}
