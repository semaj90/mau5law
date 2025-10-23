/**
 * Unified Store Barrel Export with Type Compatibility
 *
 * This file re-exports everything from ./unified/index.ts
 * allowing imports like:
 *   import { aiAssistant } from '$lib/stores/unified'
 */

export * from './unified/index';

/**
 * Compatibility type aliases
 *
 * These provide minimal, compile-safe names for components that
 * expect the original exported type names. Replace with exact
 * imports from the original modules when those modules export
 * the precise types.
 */

// AI assistant
export type AIAssistantState = AIAssistantStoreState; // maps to local store type defined below
export type Message = AIMessage;
export type MessageRole = AIMessage['role'];
export type AIModel = string; // fallback, replace with actual model union if available

// User
export type User = UserStoreState; // fallback mapping
export type AuthState = Pick<UserStoreState, 'isLoggedIn' | 'id'>;
export type UserPreferences = Record<string, unknown>;

// Notifications (fallbacks)
export type Notification = Record<string, unknown>;
export type NotificationType = string;

// Evidence (fallbacks)
export type Evidence = Record<string, unknown>;
export type EvidenceType = string;
export type EvidenceStatus = string;

// Case (fallbacks)
export type Case = Record<string, unknown>;
export type CaseStatus = string;
export type CaseFilter = Record<string, unknown>;

// Report (fallbacks)
export type Report = Record<string, unknown>;
export type ReportSection = Record<string, unknown>;
export type ReportStatus = string;

// Citation (fallbacks)
export type Citation = Record<string, unknown>;
export type CitationType = string;

// Search (fallbacks)
export type SearchQuery = Record<string, unknown>;
export type SearchResult = Record<string, unknown>;

// Canvas / POI fallbacks (keep if consumers expect these)
export type Canvas = Record<string, unknown>;
export type CanvasElement = Record<string, unknown>;

export type POI = Record<string, unknown>;
export type POINetwork = Record<string, unknown>;
export type POIAnalysis = Record<string, unknown>;

// Svelte store utilities
import { writable, type Readable } from 'svelte/store';

// xstate integration (used by helper functions below)
import xstateIntegration from '$lib/services/xstate-integration';

// --- User Store Types and Store ---
export interface UserStoreState {
  isLoggedIn: boolean;
  id: string | null; // Added 'id' property to resolve compilation error
  name: string | null;
  email: string | null;
  // ... other user-related properties
}

const initialUserState: UserStoreState = {
  isLoggedIn: false,
  id: null,
  name: null,
  email: null,
};

const _user = writable<UserStoreState>(initialUserState);

export const user: Readable<UserStoreState> = {
  subscribe: _user.subscribe,
};

// --- AI Assistant Store Types and Store ---
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIAssistantStoreState {
  isOpen: boolean;
  currentMessages: AIMessage[]; // Added 'currentMessages' to resolve compilation error
  isProcessing: boolean; // Added 'isProcessing' to resolve compilation error
  error: string | null; // Added 'error' to resolve compilation error
  currentCaseId: string | null; // To store the caseId for context
  // ... other AI assistant related properties
}

const initialAIAssistantState: AIAssistantStoreState = {
  isOpen: false,
  currentMessages: [],
  isProcessing: false,
  error: null,
  currentCaseId: null,
};

const _aiAssistant = writable<AIAssistantStoreState>(initialAIAssistantState);

export const aiAssistant: Readable<AIAssistantStoreState> = {
  subscribe: _aiAssistant.subscribe,
};

// --- XState Integration for AI Assistant ---
const AI_ASSISTANT_MACHINE_ID = 'aiAssistantMachine'; // As per copilot-instructions.md

// Strongly-typed events for the AI assistant XState machine.
// Add or extend variants as needed by your state machine.
export type AIAssistantEvent =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SEND_MESSAGE'; payload: { content: string; model?: AIModel; caseId?: string } }
  | { type: 'RECEIVE_MESSAGE'; payload: AIMessage }
  | { type: 'SET_CASE'; payload: { caseId: string | null } }
  // Fallback to allow custom/extension events while still avoiding `any`
  | { type: string; [key: string]: unknown };

// Function to send events to the AI Assistant XState machine
export function sendToAIAssistant(event: AIAssistantEvent) {
  console.log(`[unified.ts] Sending event to AI Assistant machine:`, event);
  xstateIntegration.sendEvent(AI_ASSISTANT_MACHINE_ID, event);
}

// Note: In a full implementation, you would subscribe to the XState machine's
// state changes via `xstateIntegration` and update `_user` and `_aiAssistant`
// writable stores accordingly. This file provides the necessary types and
// functions for the Svelte component to interact with the stores and XState.
