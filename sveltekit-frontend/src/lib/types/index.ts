/**
 * Central type export hub for all API response types
 *
 * Three Comprehensive Type Definitions:
 * 1. DATABASE RESPONSE TYPES - All db.query() operations
 * 2. ADMIN API TYPES - Health checks, cluster status, metrics
 * 3. WORKER/CLUSTER TYPES - Background workers and file uploads
 */

// ============================================================================
// ENDPOINT 1: DATABASE RESPONSE TYPES
// ============================================================================
export type {
  // Health checks
  DatabaseHealthResponse,
  HealthCheck,

  // Core entity types
  User,
  Case,
  CaseMetadata,
  Evidence,
  EvidenceAnalysis,
  EvidenceMetadata,
  ChainOfCustodyRecord,
  Document,
  ChatMessage,
  ChatMessageMetadata,
  AnalysisResult,

  // Query response types
  QueryResult,
  ListQueryResult,
  PaginationInfo,
  CreateQueryResult,
  UpdateQueryResult,
  DeleteQueryResult,

  // Domain-specific query results
  CaseQueryResult,
  CaseListResult,
  EvidenceQueryResult,
  EvidenceListResult,
  UserQueryResult,
  UserListResult,
  ChatMessageQueryResult,
  ChatMessageListResult,
  DocumentQueryResult,
  DocumentListResult,
  AnalysisResultQueryResult,
  AnalysisResultListResult,

  // Vector search types
  VectorSearchResult,
  VectorSearchQueryResult,

  // Batch operations
  BatchQueryResult,
  Transaction,
} from './database';

// ============================================================================
// ENDPOINT 2: ADMIN API RESPONSE TYPES
// ============================================================================
export type {
  // Health checks
  AdminHealthResponse,
  AdminHealthData,
  AdminHealth,
  ServiceStatus,

  // System metrics
  SystemMetrics,
  CPUMetrics,
  MemoryMetrics,
  DiskMetrics,
  NetworkMetrics,

  // Admin status
  AdminStatusResponse,
  AdminStatus,
  ServiceHealthStatus,
  ServiceHealth,

  // Database status
  DatabaseStatus,
  DatabaseQueryStats,

  // Cache status
  CacheStatus,

  // Message queue status
  MessageQueueStatus,
  QueueInfo,

  // Vector store status
  VectorStoreStatus,
  IndexInfo,

  // Configuration
  AdminConfigResponse,
  AdminConfiguration,
  DatabaseConfig,
  CacheConfig,
  MessageQueueConfig,
  VectorStoreConfig,
  GPUConfig,
  StorageConfig,
  SecurityConfig,

  // Audit logs
  AuditLogResponse,
  AuditLog,
  AuditLogPagination,

  // Admin actions
  AdminActionResponse,
  DatabaseMaintenanceResponse,
  CacheClearResponse,
  ServiceRestartResponse,
} from './admin';

// ============================================================================
// ENDPOINT 3: WORKER/CLUSTER STATE TYPES
// ============================================================================
export type {
  // Process types
  ProcessMemory,
  CPUUsage,
  ProcessInfo,

  // Cluster status
  Worker,
  ClusterStatusResponse,
  ClusterStatus,
  ClusterMetadata,

  // Background workers
  BackgroundWorkerStatus,
  WorkerHealthCheckResponse,
  WorkerMetrics,
  WorkerPool,

  // Job queues
  BackgroundJob,
  JobQueueStats,
  JobStatusResponse,
  JobBatchResponse,

  // File upload & processing
  FileUploadJob,
  FileUploadInfo,
  FileProcessingStage,
  FileUploadResponse,
  FileUploadBatchResponse,
  FileProcessingProgress,

  // OCR worker
  OCRWorkerStatus,
  OCRJob,

  // Embedding worker
  EmbeddingWorkerStatus,
  EmbeddingJob,

  // Autotag worker
  AutotagWorkerStatus,
  AutotagJob,

  // Cluster events
  ClusterEvent,
  ClusterEventStreamResponse,

  // Cluster commands
  ClusterCommandResponse,
  ClusterRestartResponse,
  WorkerScaleResponse,
} from './cluster';

export * from './search';
export * from './api';
// Add other type exports here as your project grows, e.g.,
// export * from './database';
// export * from './admin';
// export * from './cluster';
