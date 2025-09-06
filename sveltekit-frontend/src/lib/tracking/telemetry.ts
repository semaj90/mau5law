import { browser } from "$app/environment";

export type TelemetryPayload = {
  session_id: string;
  user_id?: string;
  is_typing?: boolean;
  visible?: boolean;
  long_tasks?: number;
  hints?: string[];
};

// Placeholder realtime communication service
const realtimeComm = {
  sendMessage: async (type: string, data: any, priority: string) => {
    console.log(`Telemetry: ${type}`, data);
  }
};

let typingTimer: ReturnType<typeof setTimeout> | null = null;
const TYPING_IDLE_MS = 800;

export function initTypingDetector(getSession: () => string, getUser?: () => string) {
  if (!browser) return;
  
  const send = (data: Partial<TelemetryPayload>) => {
    const payload: TelemetryPayload = {
      session_id: getSession(),
      user_id: getUser?.(),
      ...data,
    };
    realtimeComm.sendMessage('user_activity', { telemetry: payload }, 'low').catch(() => {});
  };

  const onInput = () => {
    if (typingTimer) clearTimeout(typingTimer);
    send({ is_typing: true });
    typingTimer = setTimeout(() => send({ is_typing: false }), TYPING_IDLE_MS);
  };

  const onVisibilityChange = () => {
    send({ visible: !document.hidden });
  };

  // Add event listeners
  document.addEventListener('input', onInput, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

  // Performance observer for long tasks
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      const longTasks = list.getEntries().length;
      if (longTasks > 0) {
        send({ long_tasks: longTasks });
      }
    });
    observer.observe({ entryTypes: ['longtask'] });
  }

  // Initial visibility state
  send({ visible: !document.hidden });

  // Cleanup function
  return () => {
    document.removeEventListener('input', onInput);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (typingTimer) clearTimeout(typingTimer);
  };
}

export function trackUserHint(hint: string, getSession: () => string) {
  if (!browser) return;
  
  const payload: TelemetryPayload = {
    session_id: getSession(),
    hints: [hint]
  };
  
  realtimeComm.sendMessage('user_hint', { telemetry: payload }, 'normal').catch(() => {});
}