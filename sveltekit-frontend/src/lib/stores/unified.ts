/**
 * Unified Store Barrel Export with Type Compatibility
 *
 * This file re-exports everything from ./unified/index.ts
 * allowing imports like:
 *   import { aiAssistant } from '$lib/stores/unified'
 */

export * from './unified/index';

/**
 * Type compatibility exports for components expecting specific interfaces
 */
export type {
  Message,
  MessageRole,
  AIModel,
  AIAssistantState,
} from './unified/ai-assistant-store';

export type {
  User,
  AuthState,
  UserPreferences,
} from './unified/user-store';

export type {
  Notification,
  NotificationType,
} from './unified/notification-store';

export type {
  Evidence,
  EvidenceType,
  EvidenceStatus,
} from './unified/evidence-store';

export type {
  Case,
  CaseStatus,
  CaseFilter,
} from './unified/case-store';

export type {
  Report,
  ReportSection,
  ReportStatus,
} from './unified/report-store';

export type {
  Citation,
  CitationType,
} from './unified/citation-store';

export type {
  SearchQuery,
  SearchResult,
} from './unified/search-store';

export type {
  Canvas,
  CanvasElement,
} from './canvas-store';

export type {
  POI,
  POINetwork,
  POIAnalysis,
} from './poi-store';
