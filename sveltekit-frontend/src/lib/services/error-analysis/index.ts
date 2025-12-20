/**
 * Error Analysis Services - Phase 72 LLM Self-Improvement
 *
 * This module provides services for:
 * - Change detection and caching (CacheService)
 * - Ollama embedding and generation (OllamaService)
 * - RAG retrieval with Qdrant/pgvector (RAGRetriever)
 * - Knowledge graph traversal with Neo4j (KAGTraverser)
 * - GRPO policy learning (GRPOPolicy)
 * - Fix synthesis and application (FixSynthesizer)
 * - Diagnostic tool invocation (ToolInvoker)
 * - JSONL storage with SIMD parsing (JSONLStorage)
 * - Type definitions for the entire system
 *
 * Usage:
 *   import {
 *     getCacheService,
 *     getOllamaService,
 *     getRAGRetriever,
 *     getKAGTraverser,
 *     getGRPOPolicy,
 *     getFixSynthesizer,
 *     getToolInvoker,
 *     getJSONLStorage
 *   } from '$lib/services/error-analysis';
 */

// Types
export * from './types';

// Cache Service
export { CacheService, getCacheService, computeFileHash } from './CacheService';

// Ollama Service
export { OllamaService, getOllamaService, getOllamaEndpoint } from './OllamaService';
export type { OllamaConfig, EmbeddingResult, GenerationResult } from './OllamaService';

// RAG Retriever
export { RAGRetriever, getRAGRetriever } from './RAGRetriever';
export type { RAGConfig, VectorSearchResult } from './RAGRetriever';

// KAG Traverser
export { KAGTraverser, getKAGTraverser } from './KAGTraverser';
export type { KAGConfig, GraphNode, GraphPath } from './KAGTraverser';

// GRPO Policy
export { GRPOPolicy, getGRPOPolicy } from './GRPOPolicy';
export type { GRPOConfig } from './GRPOPolicy';

// Fix Synthesizer
export { FixSynthesizer, getFixSynthesizer } from './FixSynthesizer';
export type { FixSynthesizerConfig, FixResult, ApplyResult } from './FixSynthesizer';

// Tool Invoker
export { ToolInvoker, getToolInvoker } from './ToolInvoker';
export type { ToolInvokerConfig, ToolResult } from './ToolInvoker';

// JSONL Storage
export { JSONLStorage, getJSONLStorage } from './JSONLStorage';
export type { JSONLStorageConfig, WriteResult, ReadStats, BatchWriteResult } from './JSONLStorage';

// Error Clustering
export { ErrorClustering, getErrorClustering } from './ErrorClustering';
export type { ClusteringConfig, ClusterResult, ClassificationResult } from './ErrorClustering';

// Pattern Storage
export { PatternStorage, getPatternStorage } from './PatternStorage';
export type { PatternStorageConfig, StorageResult, PatternQuery } from './PatternStorage';

// Experience Recorder
export { ExperienceRecorder, getExperienceRecorder } from './ExperienceRecorder';
export type { ExperienceRecorderConfig, RecordResult, StrategyRanking } from './ExperienceRecorder';

// Decision Engine
export { DecisionEngine, getDecisionEngine } from './DecisionEngine';
export type { DecisionEngineConfig, DecisionResult, ProcessResult } from './DecisionEngine';

// Escalation Service
export { EscalationService, getEscalationService } from './EscalationService';
export type {
  EscalationServiceConfig,
  EscalationResult,
  HumanFixResult,
  EscalationAnalysis,
} from './EscalationService';

// Learning Pipeline
export { LearningPipeline, getLearningPipeline } from './LearningPipeline';
export type { LearningPipelineConfig, PipelineStatus, UpdateResult } from './LearningPipeline';

// Metrics Collector
export { MetricsCollector, getMetricsCollector } from './MetricsCollector';
export type { MetricsConfig, MetricPoint, MetricsSnapshot } from './MetricsCollector';

// Route Consolidation
export { RouteConsolidation, getRouteConsolidation } from './RouteConsolidation';
export type { RouteConsolidationConfig, ScanResult, MigrationStep } from './RouteConsolidation';

// Multi-Language Detector
export { MultiLanguageDetector, getMultiLanguageDetector } from './MultiLanguageDetector';
export type { MultiLanguageConfig, DetectionResult } from './MultiLanguageDetector';
