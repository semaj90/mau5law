/**
 * Legal Case Management XState Machine
 * Type-Safe Implementation with Production-Grade Error Handling
 */

import { createMachine, assign, fromPromise } from 'xstate';
import type { CaseForm, TimelineEvent, LegalContext, CaseMetrics } from '../types/case.js';
import type { User } from '../types/user.js';
import crypto from "crypto";

// Legal Case Events - Strongly Typed
export type LegalCaseEvent =
  | { type: 'LOAD_CASE'; caseId: string }
  | { type: 'CREATE_CASE'; caseData: Partial<CaseForm> }
  | { type: 'UPDATE_CASE'; caseId: string; updates: Partial<CaseForm> }
  | { type: 'DELETE_CASE'; caseId: string }
  | { type: 'ADD_EVIDENCE'; evidenceData: EvidenceData }
  | { type: 'REMOVE_EVIDENCE'; evidenceId: string }
  | { type: 'ADD_DOCUMENT'; documentData: DocumentData }
  | { type: 'REMOVE_DOCUMENT'; documentId: string }
  | { type: 'ADD_TIMELINE_EVENT'; event: Partial<TimelineEvent> }
  | { type: 'UPDATE_TIMELINE_EVENT'; eventId: string; updates: Partial<TimelineEvent> }
  | { type: 'START_AI_ANALYSIS'; query: string; analysisType?: AnalysisType }
  | { type: 'CANCEL_AI_ANALYSIS' }
  | { type: 'ASSIGN_USER'; userId: string; role: AssignmentRole }
  | { type: 'UNASSIGN_USER'; userId: string }
  | { type: 'SET_PRIORITY'; priority: CaseForm['priority'] }
  | { type: 'SET_STATUS'; status: CaseForm['status'] }
  | { type: 'LOAD_LEGAL_CONTEXT'; jurisdictionCode?: string }
  | { type: 'REFRESH_METRICS' }
  | { type: 'EXPORT_CASE'; format: ExportFormat }
  | { type: 'ARCHIVE_CASE'; reason?: string }
  | { type: 'RESTORE_CASE' }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Legal Case Context - Production Ready
export interface LegalCaseContext {
  // Core case data
  currentCase: CaseForm | null;
  caseId: string | null;
  isLoading: boolean;
  lastUpdated: Date | null;

  // Case components
  evidence: EvidenceItem[];
  id: 'legalCase',
  timeline: TimelineEvent[];
  assignedUsers: CaseAssignment[];

  // AI and analysis
  aiAnalysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  analysisProgress: number;
  analysisQueue: AnalysisRequest[];

  // Legal context
  legalContext: LegalContext | null;
  jurisdiction: JurisdictionInfo | null;
  applicableLaws: LegalReference[];
  precedents: LegalPrecedent[];

  // Metrics and analytics
  caseMetrics: CaseMetrics | null;
  performanceData: PerformanceData;
  auditTrail: AuditLogEntry[];

  // UI state
  activeTab: string;
  selectedItems: string[];
  filters: CaseFilters;
  sortBy: SortOptions;

  // Error handling
  error: ErrorState | null;
  retryCount: number;
  lastError: Date | null;

  // Permissions and access
  currentUser: User | null;
  permissions: CasePermissions;
  accessLevel: AccessLevel;

  // Real-time collaboration
  collaborators: ActiveCollaborator[];
  notifications: CaseNotification[];
  conflictResolution: ConflictResolutionState;
}

// Supporting Types
export interface EvidenceData {
  id?: string;
  type: 'document' | 'physical' | 'digital' | 'testimony' | 'expert_opinion';
  title: string;
  description: string;
  source: string;
  dateCollected: Date;
  custodyChain: CustodyEntry[];
  metadata: Record<string, unknown>;
}

export interface EvidenceItem extends EvidenceData {
  id: string;
  caseId: string;
  status: 'pending' | 'verified' | 'challenged' | 'excluded';
  verifiedBy?: string;
  verifiedAt?: Date;
  challenges?: Challenge[];
}

export interface DocumentData {
  id?: string;
  title: string;
  type: 'contract' | 'correspondence' | 'filing' | 'discovery' | 'exhibit' | 'memo';
  file?: File;
  url?: string;
  confidentiality: 'public' | 'confidential' | 'attorney_client' | 'work_product';
  tags: string[];
}

export interface DocumentItem extends DocumentData {
  id: string;
  caseId: string;
  uploadedAt: Date;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
  version: number;
  parentId?: string;
}

export type AnalysisType =
  | 'case_strength'
  | 'risk_assessment'
  | 'precedent_analysis'
  | 'document_review'
  | 'timeline_analysis'
  | 'evidence_correlation'
  | 'legal_research';

export interface AIAnalysisResult {
  id: string;
  type: AnalysisType;
  query: string;
  result: string;
  confidence: number;
  sources: AnalysisSource[];
  recommendations: string[];
  createdAt: Date;
  processingTime: number;
}

export interface AnalysisRequest {
  id: string;
  type: AnalysisType;
  query: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedAt: Date;
  estimatedTime?: number;
}

export interface AnalysisSource {
  type: 'document' | 'precedent' | 'statute' | 'regulation';
  id: string;
  title: string;
  relevanceScore: number;
  excerpt: string;
}

export type AssignmentRole =
  | 'lead_attorney'
  | 'associate_attorney'
  | 'paralegal'
  | 'investigator'
  | 'expert_witness'
  | 'consultant'
  | 'client';

export interface CaseAssignment {
  userId: string;
  user: User;
  role: AssignmentRole;
  assignedAt: Date;
  assignedBy: string;
  permissions: string[];
  responsibilities: string[];
  status: 'active' | 'inactive' | 'pending';
}

export type ExportFormat = 'pdf' | 'docx' | 'json' | 'csv' | 'zip';

export interface JurisdictionInfo {
  code: string;
  name: string;
  type: 'federal' | 'state' | 'local';
  courts: CourtInfo[];
  statutes: StatuteReference[];
}

export interface CourtInfo {
  id: string;
  name: string;
  level: 'trial' | 'appellate' | 'supreme';
  address: string;
  jurisdiction: string;
  rules: RuleReference[];
}

export interface LegalReference {
  id: string;
  type: 'statute' | 'regulation' | 'case_law' | 'rule';
  citation: string;
  title: string;
  summary: string;
  relevanceScore: number;
  applicability: 'direct' | 'analogous' | 'distinguishable';
}

export interface LegalPrecedent extends LegalReference {
  court: string;
  date: Date;
  outcome: string;
  keyFacts: string[];
  legalPrinciples: string[];
}

export interface StatuteReference extends LegalReference {
  code: string;
  section: string;
  effectiveDate: Date;
  amendments: Amendment[];
}

export interface RuleReference extends LegalReference {
  ruleNumber: string;
  category: string;
  lastModified: Date;
}

export interface Amendment {
  date: Date;
  description: string;
  impact: 'major' | 'minor' | 'technical';
}

export interface PerformanceData {
  loadTime: number;
  queryTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRatio: number;
  errorRate: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata: Record<string, unknown>;
}

export interface CaseFilters {
  status?: CaseForm['status'][];
  priority?: CaseForm['priority'][];
  caseType?: CaseForm['caseType'][];
  assignedTo?: string[];
  dateRange?: { start: Date; end: Date };
  tags?: string[];
}

export interface SortOptions {
  field: keyof CaseForm | 'lastActivity' | 'priority' | 'dueDate';
  direction: 'asc' | 'desc';
}

export interface ErrorState {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface CasePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddEvidence: boolean;
  canAddDocuments: boolean;
  canAssignUsers: boolean;
  canExport: boolean;
  canArchive: boolean;
}

export type AccessLevel = 'read_only' | 'contributor' | 'editor' | 'admin' | 'owner';

export interface ActiveCollaborator {
  userId: string;
  user: User;
  status: 'online' | 'away' | 'editing';
  lastActivity: Date;
  currentSection?: string;
}

export interface CaseNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ConflictResolutionState {
  hasConflicts: boolean;
  conflicts: DataConflict[];
  resolutionStrategy: 'auto' | 'manual' | 'latest_wins' | 'merge';
}

export interface DataConflict {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  timestamp: Date;
  userId: string;
}

export interface CustodyEntry {
  transferredTo: string;
  transferredFrom: string;
  transferDate: Date;
  reason: string;
  condition: string;
  witnessed?: string;
}

export interface Challenge {
  id: string;
  type: 'authenticity' | 'relevance' | 'hearsay' | 'privilege' | 'chain_of_custody';
  challenger: string;
  reason: string;
  status: 'pending' | 'sustained' | 'overruled';
  filedAt: Date;
  resolvedAt?: Date;
}

// XState Machine Implementation
export const legalCaseMachine = createMachine({
  id: 'legalCase',
  initial: 'idle',

  context: {
    currentCase: null,
    caseId: null,
    isLoading: false,
    lastUpdated: null,
    evidence: [],
    documents: [],
    timeline: [],
    assignedUsers: [],
    aiAnalysis: null,
    isAnalyzing: false,
    analysisProgress: 0,
    analysisQueue: [],
    legalContext: null,
    jurisdiction: null,
    applicableLaws: [],
    precedents: [],
    caseMetrics: null,
    performanceData: {
      loadTime: 0,
      queryTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      cacheHitRatio: 0,
      errorRate: 0
    },
    auditTrail: [],
    activeTab: 'overview',
    selectedItems: [],
    filters: {},
    sortBy: { field: 'dateCreated', direction: 'desc' },
    error: null,
    retryCount: 0,
    lastError: null,
    currentUser: null,
    permissions: {
      canView: false,
      canEdit: false,
      canDelete: false,
      canAddEvidence: false,
      canAddDocuments: false,
      canAssignUsers: false,
      canExport: false,
      canArchive: false
    },
    accessLevel: 'read_only',
    collaborators: [],
    notifications: [],
    conflictResolution: {
      hasConflicts: false,
      conflicts: [],
      resolutionStrategy: 'auto'
    }
  },

  states: {
    idle: {
      on: {
        LOAD_CASE: {
          target: 'loading',
          actions: assign({
            caseId: ({ event }) => event.caseId,
            isLoading: true,
            error: null
          })
        },
        CREATE_CASE: {
          target: 'creating',
          actions: assign({
            isLoading: true,
            error: null
          })
        }
      }
    },

    loading: {
      invoke: {
        id: 'loadCase',
        src: fromPromise(async ({ input }: { input: { caseId: string } }) => {
          const response = await fetch(`/api/v1/cases/${input.caseId}`);
          if (!response.ok) {
            throw new Error(`Failed to load case: ${response.statusText}`);
          }
          return response.json();
        }),
        input: ({ context }) => ({ caseId: context.caseId! }),
        onDone: {
          target: 'loaded',
          actions: assign({
            currentCase: ({ event }) => event.output,
            isLoading: false,
            lastUpdated: new Date(),
            error: null,
            retryCount: 0
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            isLoading: false,
            error: ({ event, context }) => ({
              code: 'LOAD_FAILED',
              message: (event.error as any)?.message || 'Failed to load case',
              timestamp: new Date(),
              recoverable: true,
              context: { caseId: context.caseId }
            }),
            lastError: new Date()
          })
        }
      }
    },

    creating: {
      invoke: {
        id: 'createCase',
        src: fromPromise(async ({ input }: { input: { caseData: Partial<CaseForm> } }) => {
          const response = await fetch('/api/v1/cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input.caseData)
          });
          if (!response.ok) {
            throw new Error(`Failed to create case: ${response.statusText}`);
          }
          return response.json();
        }),
        input: ({ event }) => ({ caseData: event.caseData }),
        onDone: {
          target: 'loaded',
          actions: assign({
            currentCase: ({ event }) => event.output,
            caseId: ({ event }) => event.output.id,
            isLoading: false,
            lastUpdated: new Date(),
            error: null
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            isLoading: false,
            error: ({ event }) => ({
              code: 'CREATE_FAILED',
              message: (event.error as any)?.message || 'Failed to create case',
              timestamp: new Date(),
              recoverable: true
            })
          })
        }
      }
    },

    loaded: {
      on: {
        UPDATE_CASE: {
          target: 'updating',
          actions: assign({
            isLoading: true
          })
        },
        DELETE_CASE: {
          target: 'deleting'
        },
        ADD_EVIDENCE: {
          actions: assign({
            evidence: ({ context, event }) => [
              ...context.evidence,
              {
                ...event.evidenceData,
                id: crypto.randomUUID(),
                caseId: context.caseId!,
                status: 'pending' as const
              }
            ]
          })
        },
        ADD_DOCUMENT: {
          actions: assign({
            documents: ({ context, event }) => [
              ...context.documents,
              {
                ...event.documentData,
                id: crypto.randomUUID(),
                caseId: context.caseId!,
                uploadedAt: new Date(),
                uploadedBy: context.currentUser?.id || 'unknown',
                fileSize: 0,
                mimeType: '',
                checksum: '',
                version: 1
              }
            ]
          })
        },
        START_AI_ANALYSIS: {
          target: 'analyzing',
          actions: assign({
            isAnalyzing: true,
            analysisProgress: 0
          })
        },
        SET_STATUS: {
          actions: assign({
            currentCase: ({ context, event }) =>
              context.currentCase ? {
                ...context.currentCase,
                status: event.status
              } : null
          })
        },
        SET_PRIORITY: {
          actions: assign({
            currentCase: ({ context, event }) =>
              context.currentCase ? {
                ...context.currentCase,
                priority: event.priority
              } : null
          })
        }
      }
    },

    updating: {
      invoke: {
        id: 'updateCase',
        src: fromPromise(async ({ input }: { input: { caseId: string; updates: Partial<CaseForm> } }) => {
          const response = await fetch(`/api/v1/cases/${input.caseId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input.updates)
          });
          if (!response.ok) {
            throw new Error(`Failed to update case: ${response.statusText}`);
          }
          return response.json();
        }),
        input: ({ context, event }) => ({
          caseId: context.caseId!,
          updates: event.updates
        }),
        onDone: {
          target: 'loaded',
          actions: assign({
            currentCase: ({ event }) => event.output,
            isLoading: false,
            lastUpdated: new Date()
          })
        },
        onError: {
          target: 'loaded',
          actions: assign({
            isLoading: false,
            error: ({ event }) => ({
              code: 'UPDATE_FAILED',
              message: (event.error as any)?.message || 'Failed to update case',
              timestamp: new Date(),
              recoverable: true
            })
          })
        }
      }
    },

    analyzing: {
      invoke: {
        id: 'runAnalysis',
        src: fromPromise(async ({ input }: { input: { query: string; analysisType?: AnalysisType; caseId?: string } }) => {
          const response = await fetch('/api/v1/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: input.query,
              type: input.analysisType || 'case_strength',
              caseId: input.caseId
            })
          });
          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
          }
          return response.json();
        }),
        input: ({ event }) => ({
          query: event.query,
          analysisType: event.analysisType
        }),
        onDone: {
          target: 'loaded',
          actions: assign({
            aiAnalysis: ({ event }) => event.output,
            isAnalyzing: false,
            analysisProgress: 100
          })
        },
        onError: {
          target: 'loaded',
          actions: assign({
            isAnalyzing: false,
            analysisProgress: 0,
            error: ({ event }) => ({
              code: 'ANALYSIS_FAILED',
              message: (event.error as any)?.message || 'AI analysis failed',
              timestamp: new Date(),
              recoverable: true
            })
          })
        }
      },
      on: {
        CANCEL_AI_ANALYSIS: {
          target: 'loaded',
          actions: assign({
            isAnalyzing: false,
            analysisProgress: 0
          })
        }
      }
    },

    deleting: {
      invoke: {
        id: 'deleteCase',
        src: fromPromise(async ({ input }: { input: { caseId: string } }) => {
          const response = await fetch(`/api/v1/cases/${input.caseId}`, {
            method: 'DELETE'
          });
          if (!response.ok) {
            throw new Error(`Failed to delete case: ${response.statusText}`);
          }
          return response.json();
        }),
        input: ({ context }) => ({ caseId: context.caseId! }),
        onDone: {
          target: 'idle',
          actions: assign({
            currentCase: null,
            caseId: null,
            evidence: [],
            documents: [],
            timeline: [],
            assignedUsers: []
          })
        },
        onError: {
          target: 'loaded',
          actions: assign({
            error: ({ event }) => ({
              code: 'DELETE_FAILED',
              message: (event.error as any)?.message || 'Failed to delete case',
              timestamp: new Date(),
              recoverable: true
            })
          })
        }
      }
    },

    error: {
      on: {
        RETRY: [
          {
            target: 'loading',
            guard: ({ context }) => context.retryCount < 3,
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              error: null
            })
          },
          {
            actions: assign({
              error: {
                code: 'MAX_RETRIES_EXCEEDED',
                message: 'Maximum retry attempts exceeded',
                timestamp: new Date(),
                recoverable: false
              }
            })
          }
        ],
        RESET: {
          target: 'idle',
          actions: assign({
            currentCase: null,
            caseId: null,
            error: null,
            retryCount: 0,
            isLoading: false
          })
        }
      }
    }
  }
});