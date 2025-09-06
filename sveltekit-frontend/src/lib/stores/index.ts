
/**
 * Enhanced Store Barrel Exports - TypeScript Store Pattern
 * Centralized store management with XState integration
 */

// Core UI stores
export { contextMenuStore, contextMenuActions } from "./ui";
export { uiStore } from "./ui";
export { default as modalStore } from "./modal";
export { notifications as notificationStore } from "./notification";

// Authentication & User stores
export { default as authStore } from "./auth";
export { authService } from "./auth.svelte";
export { default as userStore } from "./user";
export { avatarStore } from "./avatarStore";

// Session Management with XState
export {
  sessionManager,
  isSessionActive,
  currentUser,
  sessionPermissions,
  sessionHealth,
  sessionAnalytics,
  securityLevel,
  hasPermission,
  requirePermission,
  recordActivity
} from "./sessionManager.svelte";

// Data stores
export { default as casesStore } from "./cases";
export { default as citationsStore } from "./citations";
export { report as reportStore } from "./report";

// AI & Machine Learning stores
export {
  aiStore,
  parseAICommand,
  applyAIClasses,
  aiCommandService,
  recentCommands,
  isAIActive,
} from "./ai-unified";

export { aiHistory as aiHistoryStore } from "./aiHistoryStore";
export { chatStore } from "./chatStore";
export { enhancedRAGStore } from "./enhanced-rag-store";

// AI Assistant with Ollama Cluster + Context7
export {
  aiAssistantManager,
  isAIActive as isAIAssistantActive,
  isProcessing as isAIProcessing,
  currentResponse,
  conversationHistory,
  currentModel,
  currentTemperature,
  aiError,
  clusterHealth,
  context7Analysis,
  aiUsage,
  sendAIMessage,
  setAIModel,
  setAITemperature,
  clearAIConversation,
  checkAIClusterHealth
} from "./aiAssistant.svelte";

// Evidence & Document stores
export {
  evidenceStore,
  evidenceById,
  evidenceByCase,
  type Evidence,
} from "./evidence-unified";

// Form handling stores
export { createFormStore as formStore } from "./form";

// Database & Caching stores
export { lokiStore } from "./lokiStore";
export { enhancedLokiStore } from "./enhancedLokiStore";

// XState machines and state management
export { autoTaggingMachine } from "./autoTaggingMachine";
export {
  evidenceProcessingMachine,
  evidenceProcessingStore,
  streamingStore,
} from "./enhancedStateMachines";
export { aiCommandMachine } from "./ai-command-machine";

// Production XState Machines
export {
  sessionMachine,
  sessionServices,
  sessionActions
} from "../machines/sessionMachine";
export {
  agentShellMachine,
  agentShellServices,
  agentShellActions
} from "../machines/agentShellMachine";
export {
  aiAssistantMachine,
  aiAssistantActions
} from "../machines/aiAssistantMachine";

// New XState + Go microservice integration
export * from "./machines";

// Canvas & Visual stores
export { canvasStore } from "./canvas";

// Utility stores
export { enhancedErrorHandler as errorHandler } from "./error-handler";
export { default as savedNotesStore } from "./saved-notes";
export * from "./keyboardShortcuts";

// UI Integration utilities
export * from "./melt-ui-integration";

// Demo and testing
export {
  runPhase2Demo,
  phase2HealthCheck,
  demoEvidenceUpload,
  demoEnhancedButton,
} from "./phase2-demo";

// Legacy compatibility aliases
export { aiStore as aiCommands } from "./ai-unified";
export { evidenceStore as evidence } from "./evidence-unified";

// Types and interfaces
// Note: local ./types does not export StoreState/Action/Context consistently; omit to avoid TS errors
