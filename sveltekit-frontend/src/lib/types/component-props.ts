// Centralized Component Props for Svelte 5 Components
// This file contains strongly typed prop interfaces for reusable components

import type { User } from './user';

// Base Props
export interface BaseComponentProps {
  class?: string;
  id?: string;
  'data-testid'?: string;
}

// AI Assistant Chat Props
export interface AIAssistantChatProps extends BaseComponentProps {
  height?: string;
  showSettings?: boolean;
  enableContext7?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  onMessage?: (message: string) => void;
}

// Enhanced Auth Form Props
export interface EnhancedAuthFormProps extends BaseComponentProps {
  mode?: 'login' | 'register';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (user: User) => void;
  allowGuestMode?: boolean;
  loading?: boolean;
}

// Evidence Validation Modal Props
export interface EvidenceValidationModalProps extends BaseComponentProps {
  open?: boolean;
  evidenceId?: string;
  onClose?: () => void;
  onValidationComplete?: (result: ValidationResult) => void;
}

// LLM Provider Selector Props
export interface LLMProviderSelectorProps extends BaseComponentProps {
  selectedProvider?: string;
  onProviderChange?: (provider: string) => void;
  availableProviders?: LLMProvider[];
  disabled?: boolean;
}

// Real Time Legal Search Props
export interface RealTimeLegalSearchProps extends BaseComponentProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onResults?: (results: SearchResult[]) => void;
  filters?: SearchFilters;
  debounceMs?: number;
}

// YoRHa Detective Command Center Props
export interface YoRHaDetectiveCommandCenterProps extends BaseComponentProps {
  cases?: CaseData[];
  onCaseSelect?: (caseId: string) => void;
  theme?: 'light' | 'dark' | 'yorha';
  showAnalytics?: boolean;
}

// AI Analysis Form Props
export interface AIAnalysisFormProps extends BaseComponentProps {
  documentId?: string;
  analysisType?: AnalysisType;
  onAnalysisComplete?: (result: AnalysisResult) => void;
  autoStart?: boolean;
}

// Button Component Props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' | 'danger' | 'success' | 'warning' | 'info' | 'default' | 'nier' | 'crimson' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onclick?: () => void;
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
  type?: 'button' | 'submit' | 'reset';
}

// Badge Component Props  
export interface BadgeProps extends BaseComponentProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

// Checkbox Component Props
export interface CheckboxProps extends BaseComponentProps {
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  required?: boolean;
}

// Input Component Props
export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  autocomplete?: string;
  oninput?: (event: Event) => void;
  onchange?: (event: Event) => void;
  onfocus?: (event: FocusEvent) => void;
  onblur?: (event: FocusEvent) => void;
}

// Select Component Props
export interface SelectProps extends BaseComponentProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

// Textarea Component Props
export interface TextareaProps extends BaseComponentProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  name?: string;
  rows?: number;
  cols?: number;
  oninput?: (event: Event) => void;
  onchange?: (event: Event) => void;
}

// Card Component Props
export interface CardProps extends BaseComponentProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Modal/Dialog Component Props
export interface DialogProps extends BaseComponentProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  modal?: boolean;
}

// Supporting Types
export interface ValidationResult {
  isValid: boolean;
  score?: number;
  issues?: string[];
  recommendations?: string[];
}

export interface LLMProvider {
  id: string;
  name: string;
  description?: string;
  available: boolean;
  type?: 'ollama' | 'vllm' | 'autogen' | 'crewai';
  endpoint?: string;
  models?: LLMModel[];
  capabilities?: string[];
  status?: LLMStatus;
  performance?: PerformanceMetrics;
}

export interface LLMModel {
  id: string;
  name: string;
  size?: string;
  specialization?: 'general' | 'legal' | 'code' | 'reasoning';
  performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  avgResponseTime?: number;
  tokensPerSecond?: number;
  memoryUsage?: string;
  uptime?: number;
}

export type LLMStatus = 'online' | 'offline' | 'busy' | 'loading';

export interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  type: 'case' | 'document' | 'precedent' | 'statute';
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  jurisdiction?: string;
  documentType?: string[];
  relevanceThreshold?: number;
}

export interface CaseData {
  id: string;
  title: string;
  status: 'active' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface AnalysisResult {
  id: string;
  type: AnalysisType;
  summary: string;
  confidence: number;
  findings: string[];
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

export type AnalysisType = 
  | 'semantic'
  | 'legal'
  | 'evidence'
  | 'timeline'
  | 'entity_extraction'
  | 'sentiment'
  | 'risk_assessment';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

// Bits UI Demo Props
export interface BitsDemoProps extends BaseComponentProps {
  caseTypes?: Array<{
    value: string;
    label: string;
  }>;
  useLibrary?: 'bits-ui' | 'melt-ui';
}

// Document Upload Form Props
export interface DocumentUploadFormProps extends BaseComponentProps {
  caseId?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
}

// Smart Document Form Props
export interface SmartDocumentFormProps extends BaseComponentProps {
  documentId?: string;
  initialData?: DocumentFormData;
  onSave?: (data: DocumentFormData) => void;
  onCancel?: () => void;
  autoSave?: boolean;
}

// Ollama Agent Shell Props
export interface OllamaAgentShellProps extends BaseComponentProps {
  modelName?: string;
  endpoint?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  onResponse?: (response: string) => void;
  onError?: (error: string) => void;
}

// Supporting Upload Types
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface DocumentFormData {
  title: string;
  description?: string;
  content: string;
  tags: string[];
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  attachments: UploadedFile[];
}