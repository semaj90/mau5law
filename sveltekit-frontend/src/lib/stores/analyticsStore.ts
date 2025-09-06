
// Svelte store for analytics events (frontend)
import { writable } from "svelte/store";
import { EventEmitter } from "events";
// TODO: Fix import - // Orphaned content: import {  export const analyticsEvents = writable([]);

export function logAnalyticsEvent(event) {
  analyticsEvents.update((events) => [...events, event]);
  // Optionally POST to backend
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
}

// Export main store for backward compatibility
export const analyticsStore = {
  events: analyticsEvents,
  logEvent: logAnalyticsEvent
};
