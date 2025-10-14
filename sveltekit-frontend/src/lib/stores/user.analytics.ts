import { writable } from 'svelte/store';
import { createMachine, interpret } from 'xstate';

export interface UserEvent {
  type: 'CLICK' | 'TYPING' | 'NAVIGATE' | 'MESSAGE';
  payload: Record<string, any>;
}

export const userEvents = writable<UserEvent[]>([]);

const analyticsMachine = createMachine({
  id: 'analytics',
  initial: 'idle',
  states: {
    idle: { on: { CLICK: 'engaged' } },
    engaged: { on: { NAVIGATE: 'idle' } },
  },
});

export const analyticsService = interpret(analyticsMachine).start();

export async function logUserEvent(event: UserEvent) {
  userEvents.update(e => [...e, event]);
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: event.payload.userId || 'anonymous',
        message: event.payload.text || event.payload.message || '',
      }),
    });
    if (!response.ok) {
      console.warn('Analytics backend returned non-ok:', response.status);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('Analytics request failed:', err);
    return null;
  }
}

export default { userEvents, analyticsService, logUserEvent };
