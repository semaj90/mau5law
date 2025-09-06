// Svelte 5 TypeScript Patterns - Progressive Type Replacement
// Replaces generic 'any' shims with proper Svelte 5 type definitions

import type {     Component, ComponentProps, Snippet     } from 'svelte';
import type { HTMLButtonAttributes, HTMLInputAttributes } from 'svelte/elements';

// === COMPONENT PROPS PATTERNS ===

// Enhanced Button Component Props (replaces generic Button any type)
export interface EnhancedButtonProps extends HTMLButtonAttributes {
  variant?: 'default' | 'legal' | 'evidence' | 'case' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
  disabled?: boolean;
  children?: Snippet;
  onclick?: (event: MouseEvent) => void;
}

// Enhanced Input Component Props (replaces generic Input any type)
export interface EnhancedInputProps extends HTMLInputAttributes {
  variant?: 'default' | 'legal' | 'search' | 'error';
  error?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  value?: string;
  oninput?: (event: Event) => void;
  onfocus?: (event: FocusEvent) => void;
  onblur?: (event: FocusEvent) => void;
}

// Form Component Props (replaces generic Form any type)
export interface FormProps {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  action?: string;
  enhance?: boolean;
  loading?: boolean;
  errors?: Record<string, string[]>;
  onsubmit?: (event: SubmitEvent) => void | Promise<void>;
  children?: Snippet;
}

// === REACTIVE STATE PATTERNS ===

// User State Interface (replaces generic user any type)
export interface UserState {
  id: string;
  email: string;
  name: string;
  isLoggedIn: boolean;
  profile?: {
    avatarUrl?: string;
    role: 'attorney' | 'paralegal' | 'investigator' | 'admin';
    specializations: string[];
  };
}

// Case Management State (replaces generic Case any type)
export interface CaseState {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'pending' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// Evidence State (replaces generic Evidence any type)
export interface EvidenceState {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  fileType: 'PDF' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'TEXT' | 'LINK';
  filePath?: string;
  fileSize?: number;
  uploadedAt: Date;
  processedAt?: Date;
  metadata?: {
    extractedText?: string;
    ocrConfidence?: number;
    tags: string[];
  };
}

// === AI SERVICE TYPES ===

// AI Task Interface (replaces generic AITask any type)
export interface AITask {
  id: string;
  type: 'search' | 'embedding' | 'analysis' | 'classification' | 'summarization';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input: {
    query?: string;
    document?: string;
    context?: Record<string, unknown>;
  };
  output?: {
    result: unknown;
    confidence?: number;
    processingTime?: number;
  };
  providerId?: string;
  model?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// AI Response Interface (replaces generic AIResponse any type)
export interface AIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    taskId: string;
    processingTime: number;
    model: string;
    tokens?: {
      input: number;
      output: number;
    };
  };
}

// Worker Status Interface (replaces generic WorkerStatus any type)
export interface WorkerStatus {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'stopped';
  activeRequests: number;
  queueLength: number;
  performance: {
    averageResponseTime: number;
    successRate: number;
    totalProcessed: number;
  };
  lastActivity: Date;
}

// === API REQUEST/RESPONSE TYPES ===

// Case API Types (replaces generic CaseCreateRequest, etc.)
export interface CaseCreateRequest {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  metadata?: Record<string, unknown>;
}

export interface CaseUpdateRequest extends Partial<CaseCreateRequest> {
  status?: 'draft' | 'active' | 'pending' | 'closed';
}

export interface CaseSearchRequest {
  query?: string;
  status?: CaseState['status'][];
  priority?: CaseState['priority'][];
  assignedTo?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

export interface CaseSearchResponse {
  cases: CaseState[];
  total: number;
  hasMore: boolean;
  pagination: {
    limit: number;
    offset: number;
  };
}

// Evidence API Types
export interface EvidenceCreateRequest {
  caseId: string;
  title: string;
  description?: string;
  fileType: EvidenceState['fileType'];
  file?: File;
  metadata?: Record<string, unknown>;
}

export interface EvidenceSearchRequest {
  caseId?: string;
  query?: string;
  fileTypes?: EvidenceState['fileType'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
}

// === FORM TYPES ===

// Form Submission Result (replaces generic FormSubmissionResult)
export interface FormSubmissionResult<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  errors?: Record<string, string[]>;
  message?: string;
  redirectTo?: string;
}

// Bulk Operation Response
export interface BulkOperationResponse {
  processed: number;
  successful: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

// === DATABASE TYPES ===

// Vector Search Result (replaces generic VectorSearchResult any type)
export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
  sourceType: "document" | "evidence" | "case";
  rankingMatrix: number[][];
  documentId?: string;
  chunkIndex?: number;
}

// Vector Search Options
export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  model?: string;
  includeMetadata?: boolean;
  filter?: Record<string, unknown>;
}

// === COMPONENT COMPOSITION TYPES ===

// Generic Component with Props
export type EnhancedComponent<TProps = {}> = Component<TProps>;

// Component Props Utility
export type ExtractProps<TComponent> = TComponent extends Component<infer TProps> ? TProps : never;

// Event Handler Types
export interface ComponentEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onSubmit?: (event: SubmitEvent) => void;
  onInput?: (event: Event) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (value: unknown) => void;
}

// Snippet with Parameters
export type ParameterizedSnippet<TParams extends readonly unknown[]> = Snippet<TParams>;

// === STATE MANAGEMENT ===

// Shared State Pattern for Svelte 5
export interface SharedState<T> {
  value: T;
  subscribe: (callback: (value: T) => void) => () => void;
  update: (updater: (value: T) => T) => void;
  set: (value: T) => void;
}

// Store State Types
export interface StoreState {
  auth: UserState;
  ui: {
    theme: 'light' | 'dark' | 'system';
    sidebarOpen: boolean;
    loading: boolean;
    notifications: Array<{
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
      timestamp: Date;
    }>;
  };
  cases: {
    current?: CaseState;
    list: CaseState[];
    loading: boolean;
    error?: string;
  };
  evidence: {
    items: EvidenceState[];
    loading: boolean;
    uploadProgress: Record<string, number>;
  };
}

export default {
  // Export all types for easy importing
  UserState,
  CaseState,
  EvidenceState,
  AITask,
  AIResponse,
  WorkerStatus,
  VectorSearchResult,
  VectorSearchOptions,
  FormSubmissionResult,
  BulkOperationResponse
};