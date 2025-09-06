// TypeScript types for Rust WASM Bridge integration

export interface SystemInfo {
  os: string;
  arch: string;
  total_memory: number;
  available_memory: number;
  cpu_count: number;
  gpu_info: string[];
  timestamp: string;
}

export interface FileSystemResult {
  success: boolean;
  data?: string;
  error?: string;
  file_size?: number;
  file_type?: string;
}

export interface PerformanceMetrics {
  timestamp?: number;
  memory_used?: number;
  cpu_usage?: number;
  memory_usage?: number;
  disk_io?: number;
  [key: string]: unknown; // Allow additional metrics
}

export interface WindowsService {
  name: string;
  status: 'Running' | 'Stopped' | 'Error';
  port?: number;
  description?: string;
}

export interface DocumentProcessingResult {
  processed: boolean;
  word_count: number;
  char_count: number;
  processing_time_ms: number;
  metadata?: {
    language?: string;
    document_type?: string;
    confidence?: number;
  };
}

export interface BenchmarkResult {
  textProcessing: number;
  vectorOperations: number;
  systemAccess: number;
  overallScore: number;
  details?: {
    platform: string;
    wasmSupport: boolean;
    memoryLimit?: number;
  };
}

export interface RustBridgeStatus {
  initialized: boolean;
  capabilities: string[];
  performance: boolean;
  version?: string;
  buildInfo?: {
    target: string;
    optimized: boolean;
    features: string[];
  };
}

// Legal document processing specific types
export interface LegalDocumentMetadata {
  documentType: 'contract' | 'case-law' | 'statute' | 'evidence' | 'brief' | 'other';
  jurisdiction?: string;
  dateCreated?: string;
  author?: string;
  caseNumber?: string;
  parties?: string[];
  legalCitations?: string[];
  keyTerms?: string[];
  confidentiality: 'public' | 'confidential' | 'privileged';
}

export interface LegalTextAnalysis {
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  sentenceCount: number;
  averageSentenceLength: number;
  readabilityScore: number;
  legalComplexity: 'low' | 'medium' | 'high';
  detectedLanguage: string;
  keyPhrases: string[];
  entities: LegalEntity[];
}

export interface LegalEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'statute' | 'case' | 'other';
  confidence: number;
  startOffset: number;
  endOffset: number;
}

export interface VectorSimilarityResult {
  similarity: number;
  documentId1: string;
  documentId2: string;
  computationTimeMs: number;
  method: 'cosine' | 'euclidean' | 'manhattan' | 'dot-product';
}

export interface BatchProcessingResult {
  totalDocuments: number;
  successfullyProcessed: number;
  failedDocuments: number;
  totalProcessingTimeMs: number;
  averageTimePerDocument: number;
  results: DocumentProcessingResult[];
  errors?: string[];
}

// System monitoring types
export interface SystemResourceUsage {
  cpu: {
    usage: number; // percentage
    cores: number;
    frequency?: number; // MHz
  };
  memory: {
    total: number; // bytes
    used: number;
    available: number;
    percentage: number;
  };
  disk: {
    reads: number;
    writes: number;
    totalSpace?: number;
    freeSpace?: number;
  };
  network?: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
}

export interface GpuInfo {
  name: string;
  vendor: 'NVIDIA' | 'AMD' | 'Intel' | 'Other';
  memory: number; // bytes
  computeCapability?: string;
  driverVersion?: string;
  supportsWebGL: boolean;
  supportsWebGPU: boolean;
  supportsCUDA?: boolean;
  supportsOpenCL?: boolean;
}

// Configuration types
export interface RustBridgeConfig {
  enableSystemMonitoring: boolean;
  enableFileSystemAccess: boolean;
  enableGpuAcceleration: boolean;
  allowedDirectories: string[];
  performanceLogging: boolean;
  securityLevel: 'strict' | 'normal' | 'permissive';
  cachingEnabled: boolean;
  maxCacheSize: number; // bytes
}

// Error types
export interface RustBridgeError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  stack?: string;
}

// Event types for monitoring
export interface SystemEvent {
  type: 'service-start' | 'service-stop' | 'resource-warning' | 'error' | 'info';
  timestamp: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  metadata?: unknown;
}

// Legal AI specific integration types
export interface LegalAISystemStatus {
  database: {
    postgres: boolean;
    connectionPool: number;
    activeQueries: number;
  };
  ai: {
    ollama: boolean;
    modelLoaded: string;
    availableModels: string[];
    queueLength: number;
  };
  cache: {
    redis: boolean;
    memoryUsage: number;
    hitRate: number;
  };
  search: {
    qdrant: boolean;
    indexedDocuments: number;
    searchPerformance: number; // ms average
  };
  services: {
    go: boolean;
    python: boolean;
    node: boolean;
  };
}

export interface LegalCaseContext {
  caseId: string;
  title: string;
  status: 'active' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  relatedCases: string[];
}

// Export utility types
export type RustBridgeCallback<T = any> = (result: T, error?: RustBridgeError) => void;
export type AsyncRustBridgeFunction<T = any> = (...args: any[]) => Promise<T>;
export type SystemMetricType = keyof SystemResourceUsage;