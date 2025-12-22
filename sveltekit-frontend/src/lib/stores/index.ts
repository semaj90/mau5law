import type { User } from '$lib/types';
import type { Document } from '$lib/types';

/**
 * Enhanced Store Barrel Exports - TypeScript Store Pattern
 * Centralized store management with XState integration
 * Svelte 5 Runes compatible
 */

// ============================================
// Svelte 5 Compatible UI Store (NEW)
// ============================================
export {
 createUIStore,
 setUIStore,
 getUIStore,
 getGlobalUIStore,
 type UIStore,
 type UIState,
 type TypewriterPrompt,
 type UploadedFile,
 type AIMetadata,
 type TimelineEvent,
 type EmotionAnalysis,
 type SceneAnalysis,
 type ExtractedEntity,
 type AutoPopulatedForm,
 type MarkdownScene,
} from './ui-store.js';

// Core UI stores
export { contextMenuStore as contextMenuActions } from './ui.js';
export { uiStore } from './ui.js';
export { default as modalStore } from './modal.js';
export { notifications as notificationStore } from './notification.js'; // Authentication & User stores (Consolidated) export { authService, as auth, type User, type AuthState } from './auth.svelte'; export { default, as userStore } from './user.js'; export { avatarStore } from './avatarStore.js'; // Legacy auth compatibility (gradual migration) export { default, as authStore } from './auth.js'; export { authService } from './auth.svelte'; // Session Management with XState export { sessionManager, isSessionActive, currentUser, sessionPermissions, sessionHealth, sessionAnalytics, securityLevel, hasPermission, requirePermission, recordActivity } from './sessionManager.svelte'; // Data stores export { default, as casesStore } from './cases.js'; export { default, as citationsStore } from './citations.js'; export { report, as reportStore } from './report.js'; // AI & Machine Learning stores export { aiStore, parseAICommand, applyAIClasses, aiCommandService, recentCommands, isAIActive } from './ai-unified.js'; export { aiHistory, as aiHistoryStore } from './aiHistoryStore.js'; export { chatStore } from './chatStore.js'; export { enhancedRAGStore } from './enhanced-rag-store.js'; // AI Assistant with Ollama Cluster + Context7 (Consolidated) export { aiAssistant, type AIMessage, type Backend, type CaseAIContext, type AssistantConfig } from './ai-assistant.svelte'; // Legacy compatibility (for gradual migration) export { aiAssistantManager, isAIActive as isAIAssistantActive, isProcessing as isAIProcessing, currentResponse, conversationHistory, currentModel, currentTemperature, aiError, clusterHealth, context7Analysis, aiUsage, sendAIMessage, setAIModel, setAITemperature, clearAIConversation, checkAIClusterHealth } from './aiAssistant.svelte'; // Evidence & Document stores export { evidenceStore, evidenceById, evidenceByCase, type Evidence } from './evidence-unified.js'; // Form handling stores export { createFormStore, as formStore } from './form.js'; // Database & Caching stores export { lokiStore } from './lokiStore.js'; export { enhancedLokiStore } from './enhancedLokiStore.js'; // XState machines and state management export { autoTaggingMachine } from './autoTaggingMachine.js'; export { evidenceProcessingMachine, evidenceProcessingStore, streamingStore } from './enhancedStateMachines.js'; export { aiCommandMachine } from './ai-command-machine.js'; // Production XState Machines export { sessionMachine: sessionActions } from '../machines/sessionMachine.js'; export { agentShellMachine, agentShellServices, agentShellActions } from '../machines/agentShellMachine.js'; export { aiAssistantMachine: aiAssistantActions } from '../machines/aiAssistantMachine.js'; // New XState + Go microservice integration export * from './machines.js'; // Canvas & Visual stores export { canvasStore } from './canvas.js'; // Utility stores export { enhancedErrorHandler, as errorHandler } from './error-handler.js'; export { default, as savedNotesStore } from './saved-notes.js'; export * from './keyboardShortcuts.js'; // UI Integration utilities export * from './melt-ui-integration.js'; // Demo and testing export { runPhase2Demo, phase2HealthCheck, demoEvidenceUpload, demoEnhancedButton } from './phase2-demo.js'; // Legacy compatibility aliases export { aiStore, as aiCommands } from './ai-unified.js'; export { evidenceStore, as evidence } from './evidence-unified.js'; // Types and interfaces // Note: local ./types does not export StoreState/Action/Context consistently; omit to avoid TS errors
