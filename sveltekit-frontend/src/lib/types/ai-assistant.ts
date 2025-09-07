/**
 * AI Assistant Types - Complete type definitions for multi-backend AI system
 */

export type Backend = 'vllm' | 'ollama' | 'webasm' | 'go-micro';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sessionId: string;
  metadata?: {
    backend?: Backend;
    model?: string;
    tokenCount?: number;
    processingTime?: number;
    confidence?: number;
    legalContext?: string;
    processingPath?: string;
    processingNodes?: string[];
    cacheHit?: boolean;
  };
}

export interface AssistantConfig {
  temperature: number;
  maxTokens: number;
  model: string;
  systemPrompt: string;
  autoSwitchBackend: boolean;
  persistHistory: boolean;
}

export interface ChatSession {
  id: string;
  title?: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: {
    totalMessages: number;
    primaryBackend: Backend;
    legalDomain?: string;
    averageResponseTime: number;
  };
}

export interface BackendResponse {
  text: string;
  model: string;
  backend: Backend;
  tokenCount?: number;
  confidence?: number;
  processingTime?: number;
  processingPath?: string;
  processingNodes?: string[];
  cacheHit?: boolean;
}

export interface BackendHealth {
  backend: Backend;
  healthy: boolean;
  latency: number;
  lastChecked: number;
  version?: string;
  capabilities?: string[];
  loadLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SearchResult {
  item: ChatMessage;
  score?: number;
  matches?: any[];
}

export interface ContextualEmbedding {
  id: string;
  content: string;
  embedding: number[];
  timestamp: number;
  sessionId: string;
  metadata?: {
    legalDomain?: string;
    documentType?: string;
    importance?: number;
  };
}

export interface SemanticSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: any;
  context?: string;
}

// Postgres/pgvector types
export interface VectorSearchQuery {
  query: string;
  embedding?: number[];
  limit?: number;
  threshold?: number;
  filters?: {
    sessionId?: string;
    legalDomain?: string;
    dateRange?: [number, number];
  };
}

export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  timestamp: number;
  metadata?: any;
}

// Loki.js specific types
export interface LokiMessage extends ChatMessage {
  $loki?: number;
  meta?: {
    created: number;
    revision: number;
    version: number;
  };
}

// Fuse.js configuration
export interface FuseSearchOptions {
  keys: string[];
  includeScore: boolean;
  threshold: number;
  includeMatches: boolean;
  limit?: number;
}

// Performance monitoring
export interface PerformanceMetrics {
  backend: Backend;
  averageLatency: number;
  requestCount: number;
  errorRate: number;
  lastUpdated: number;
  healthScore: number;
}

export interface BackendCapabilities {
  name: Backend;
  maxTokens: number;
  supportedModels: string[];
  features: {
    streaming?: boolean;
    functionCalling?: boolean;
    multimodal?: boolean;
    codeGeneration?: boolean;
    legalAnalysis?: boolean;
  };
  pricing?: {
    inputTokens: number;
    outputTokens: number;
    currency: string;
  };
}

// Legal context specific types
export interface LegalContext {
  domain: 'contracts' | 'deeds' | 'litigation' | 'compliance' | 'general';
  jurisdiction?: string;
  practiceArea?: string;
  confidentiality: 'public' | 'confidential' | 'privileged';
  caseId?: string;
  documentIds?: string[];
}

export interface LegalAnalysisResult {
  summary: string;
  keyPoints: string[];
  risks: {
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation?: string;
  }[];
  citations: {
    type: 'statute' | 'case_law' | 'regulation' | 'contract';
    citation: string;
    relevance: number;
  }[];
  confidence: number;
}

// WebGPU and CUDA integration types
export interface GPUAcceleration {
  enabled: boolean;
  device?: 'webgpu' | 'cuda' | 'opencl';
  memoryUsage?: number;
  computeUnits?: number;
  performance?: {
    tokensPerSecond: number;
    latencyMs: number;
    throughput: number;
  };
}

export interface WebGPUConfig {
  maxBufferSize: number;
  preferredLimits?: GPULimits;
  enableOptimizations: boolean;
  fallbackToCPU: boolean;
}

// Go microservice types
export interface GoMicroRequest {
  service: string;
  method: string;
  payload: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface GoMicroResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingNodes: string[];
    totalProcessingTime: number;
    queueTime: number;
    retryCount?: number;
  };
}

// WebAssembly specific types
export interface WebASMConfig {
  modelPath: string;
  contextLength: number;
  nThreads: number;
  enableGPU: boolean;
  memorySize: number;
  cacheSize: number;
}

export interface WebASMResponse {
  text: string;
  tokensGenerated: number;
  processingTime: number;
  confidence: number;
  fromCache: boolean;
  cacheHit: boolean;
  processingPath: 'cpu' | 'gpu' | 'hybrid';
}

// Export formats
export type ExportFormat = 'json' | 'markdown' | 'pdf' | 'docx' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  dateRange?: [number, number];
  filterBy?: {
    backend?: Backend;
    role?: 'user' | 'assistant';
    hasLegalContext?: boolean;
  };
}

// Real-time features
export interface RealtimeConfig {
  enableVoiceInput: boolean;
  enableVoiceOutput: boolean;
  enableTypingIndicators: boolean;
  enableReadReceipts: boolean;
  voiceSettings?: {
    language: string;
    voice: string;
    rate: number;
    pitch: number;
  };
}

export interface VoiceInputResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
}

// Integration with existing legal platform
export interface LegalPlatformIntegration {
  evidenceId?: string;
  caseId?: string;
  documentId?: string;
  citationId?: string;
  analysisType?: 'evidence' | 'contract' | 'citation' | 'general';
  permissions?: {
    read: boolean;
    write: boolean;
    share: boolean;
  };
}

// Cache optimization types
export interface CacheStrategy {
  type: 'lru' | 'lfu' | 'ttl' | 'hybrid';
  maxSize: number;
  ttlMs?: number;
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageHitTime: number;
  averageMissTime: number;
  memoryUsage: number;
  diskUsage: number;
}