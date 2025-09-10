/**
 * Orchestrated UI Components
 * Integrates N64 headless UI with Enhanced-Bits Legal AI components
 * Connected to XState orchestration system for state management
 */

import HeadlessDialog from '$lib/headless/HeadlessDialog.svelte';
import HeadlessSelectField from '$lib/headless/HeadlessSelectField.svelte';
import LoadingButton from '$lib/headless/LoadingButton.svelte';

// Enhanced-Bits Legal AI components
import { 
  Button, 
  Card, 
  Dialog as EnhancedDialog, 
  Select as EnhancedSelect,
  Input 
} from '$lib/components/ui/enhanced-bits';

// Legal AI specific components
export interface LegalEvidenceItem {
  id: string;
  title: string;
  type: "document" | "image" | "video" | "audio" | "transcript";
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAnalysisResult {
  confidence: number;
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  themes: Array<{
    topic: string;
    weight: number;
  }>;
  summary: string;
}

// Orchestrated Dialog - combines headless functionality with enhanced styling
export const OrchestratedDialog = Object.assign(HeadlessDialog, {
  Root: HeadlessDialog,
  Content: HeadlessDialog,
  Enhanced: EnhancedDialog,
  // Legal AI specific dialog variants
  EvidenceAnalysis: HeadlessDialog,
  CaseManagement: HeadlessDialog,
  AIInsights: HeadlessDialog,
});

// Orchestrated Select - combines accessibility with legal categories
export const OrchestratedSelect = Object.assign(HeadlessSelectField, {
  Root: HeadlessSelectField,
  Enhanced: EnhancedSelect,
  // Legal AI specific variants
  EvidenceType: HeadlessSelectField,
  PriorityLevel: HeadlessSelectField,
  CaseStatus: HeadlessSelectField,
});

// Orchestrated Button - combines loading states with legal actions
export const OrchestratedButton = Object.assign(LoadingButton, {
  Enhanced: Button,
  // Legal AI specific button variants
  AnalyzeEvidence: LoadingButton,
  ProcessDocument: LoadingButton,
  GenerateReport: LoadingButton,
  SearchSimilar: LoadingButton,
});

// Orchestrated Card - legal evidence display
export const OrchestratedCard = Object.assign(Card, {
  Evidence: Card,
  Analysis: Card,
  CaseFile: Card,
  AIInsight: Card,
});

// State management integration
export interface OrchestrationState {
  currentRoute: string;
  activeDialog: string | null;
  loadingOperations: Set<string>;
  evidenceItems: LegalEvidenceItem[];
  analysisResults: Map<string, AIAnalysisResult>;
  cacheStatus: 'idle' | 'loading' | 'syncing' | 'error';
  gpuAcceleration: boolean;
}

// Export the orchestration context for state machine integration
export const OrchestrationContext = {
  // XState machine integration
  stateMachine: null as any, // Will be injected by the orchestration system
  
  // Cache coordination
  cacheService: null as any,
  
  // GPU acceleration status
  webgpuService: null as any,
  
  // Vector search integration
  vectorService: null as any,
};

// Legal AI utility functions
export function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.9) return 'confidence-very-high';
  if (confidence >= 0.7) return 'confidence-high';
  if (confidence >= 0.5) return 'confidence-medium';
  return 'confidence-low';
}

export function getPriorityClass(priority: LegalEvidenceItem['priority']): string {
  return `priority-${priority}`;
}

export function formatAnalysisDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

// Component registration for orchestration system
export const ORCHESTRATED_COMPONENTS = {
  Dialog: OrchestratedDialog,
  Select: OrchestratedSelect,
  Button: OrchestratedButton,
  Card: OrchestratedCard,
  Input,
} as const;

// Type exports
export type {
  LegalEvidenceItem,
  AIAnalysisResult,
  OrchestrationState
};