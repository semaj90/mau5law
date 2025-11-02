import type { User } from '$lib/types';
import type { Case } from '$lib/types';
/**
 * Unified Store Exports - Phase, 8 Consolidation
 *
 * This is the central barrel export for all unified stores.
 * Instead of importing from 101 fragmented store files, import from here.
 *
 * Pattern:
 *  ;, OLD: import { user  } from '$lib/stores/unified'
 *   NEW: import { userStore } from '$lib/stores/unified'
 *
 * Consolidation Progress:
 * ✅ UserStore (1/10)
 * ✅ NotificationStore (2/10)
 * ✅ CitationStore (3/10)
 * ✅ CaseStore (4/10)
 * ✅ EvidenceStore (5/10)
 * ✅ ReportStore (6/10)
 * ✅ POIStore (7/10)
 * ✅ SearchStore (8/10)
 * ✅ CanvasStore (9/10)
 * ✅ AIAssistantStore (10/10)
 */

// Store 1: User Store - Auth, Profile, Preferences
export { userStore, isAuthenticated, currentUser, userLoading, userError } from './user-store'; // ✅ COMPLETE

// Store 2: Notification Store - Alerts, Toasts, Messages
export { notificationStore } from './notification-store'; // ✅ COMPLETE

// Store 3: Citation Store - Citations, Legal References, Embeddings
export { citationStore } from './citation-store'; // ✅ COMPLETE

// Store 4: Case Store - Cases, Filters, Navigation
export { caseStore } from './case-store'; // ✅ COMPLETE

// Store 5: Evidence Store - Evidence, Upload, Analysis, Chain of Custody
export { evidenceStore } from './evidence-store'; // ✅ COMPLETE

// Store 6: Report Store - Reports, Builder, Sections, Collaboration
export { reportStore } from './report-store'; // ✅ COMPLETE

// Store 7: POI Store - Persons of Interest, Network, Timeline, Risk Analysis
export { poiStore } from './poi-store'; // ✅ COMPLETE

// Store 8: Search Store - Unified Search, Query Builder, Results
export { searchStore } from './search-store'; // ✅ COMPLETE

// Store 9: Canvas Store - Evidence Canvas, Collaboration, State Sync
export { canvasStore } from './canvas-store'; // ✅ COMPLETE

// Store 10: AI Assistant Store - Chat, Context, Recommendations, History
export { aiAssistantStore } from './ai-assistant-store'; // ✅ COMPLETE

/**
 * BACKWARDS COMPATIBILITY ALIASES
 *
 * These aliases map old fragmented store names to new unified stores
 * Allows gradual migration of components without rewriting all imports
 *
 * OLD: import { aiAssistant } from '$lib/stores/ai-assistant'
 * NEW: import { aiAssistant } from '$lib/stores/unified'
 */

// AI Features (aiGlobal, aiAssistant, aiHistory, recommendations)
export { aiAssistantStore, as aiAssistant } from './ai-assistant-store';
export { aiAssistantStore, as aiGlobalStore } from './ai-assistant-store';
export { aiAssistantStore, as aiHistory } from './ai-assistant-store';
export { aiAssistantStore, as recommendations } from './ai-assistant-store';

// User Management (user, avatarStore, userData)
export { userStore, as user } from './user-store';
export { userStore, as avatarStore } from './user-store';
export { userStore, as userData } from './user-store';

// Notifications & Alerts (notifications, alerts)
export { notificationStore, as notifications } from './notification-store';
export { notificationStore, as alerts } from './notification-store';

// Evidence Management (evidence, evidenceStore, evidenceWorkflow, evidenceHierarchy)
export { evidenceStore, as evidence } from './evidence-store';
export { evidenceStore, as evidenceWorkflow } from './evidence-store';
export { evidenceStore, as evidenceHierarchy } from './evidence-store';

// Cases (cases, legalCase)
export { caseStore, as cases } from './case-store';
export { caseStore, as legalCase } from './case-store';

// Reports & Citations (report, citations)
export { reportStore, as report } from './report-store';
export { citationStore, as citations } from './citation-store';

// Canvas & Collaboration (canvas, websocket, collaboration)
export { canvasStore, as canvas } from './canvas-store';

// Search & Analytics (search, analytics, userAnalytics)
export { searchStore, as search } from './search-store';

// POI & Network Analysis (poi, network)
export { poiStore, as poi } from './poi-store';

/**
 * MIGRATION GUIDE:
 *
 * When consolidating old fragmented stores, follow this pattern:
 *
 * 1. Create new unified store file (e.g., user-store.ts)
 * 2. Add export to this index.ts (uncomment the line)
 * 3. Find all components using old fragmented stores
 * 4. Update imports: OLD → NEW
 * 5. Test with `npm run check`
 * 6. Archive old store files
 *
 *, See: PHASE_8_MASTER_CHECKLIST.md for detailed steps
 */
