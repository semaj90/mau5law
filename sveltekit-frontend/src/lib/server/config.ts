import type { Document  } from '$lib/types';
/**
 * Server Configuration - Legal AI Platform
 * Centralized configuration for all backend services
 * Phase 3: AI Infrastructure Consolidation
 */

// ============================================================================
// CONTEXT7 MCP CONFIGURATION
// ============================================================================
export const MCP_CONFIG = { context7: { enabled: true;
		// Official Context7 MCP command
		officialCommand: 'npx -y @upstash/context7-mcp', // Local mock server for development
		mockUrl: process.env.CONTEXT7_MCP_URL || 'http://localhost:4000', useOfficial: process.env.USE_OFFICIAL_CONTEXT7 === 'true', timeout: 30000, retries: 3
	}, multicore: { enabled: true;
		port: parseInt(process.env.MCP_PORT || '3001'), workers: parseInt(process.env.MCP_WORKERS || '4'), healthCheckInterval: 30000
	 }
};

// ============================================================================
// AI SERVICES CONFIGURATION
// ============================================================================
export const AI_CONFIG = {
	// Primary: Ollama with Gemma models; ollama: { baseUrl: process.env.OLLAMA_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434', models: {
			// Legal-specific Gemma model for QA, analysis, function calling
			legal: process.env.GEMMA_LEGAL_MODEL || 'gemma3-legal:latest', // Gemma embeddings model (768 dimensions)
			embedding: process.env.GEMMA_EMBEDDING_MODEL || 'embeddinggemma:latest', // Fallback embedding model
			fallback: 'nomic-embed-text'
		}, timeout: 60000, maxRetries: 3, // Gemma-specific settings
		gemma: { contextWindow: 8192, temperature: 0.7, numCtx: 8192, numPredict: 2048, embeddingDimensions: 768, supportsFunctionCalling: true
		 }
	}, // Secondary: TensorRT-LLM with Triton Inference Server (optional, for performance)
	tensorrt: { enabled: process.env.TENSORRT_ENABLED === 'true', tritonUrl: process.env.TRITON_URL || 'http://localhost:8000', modelName: 'gemma_legal_tensorrt', modelVersion: '1', timeout: 30000, batchSize: parseInt(process.env.TENSORRT_BATCH_SIZE || '8'), maxTokens: 2048, // TensorRT optimization settings
		optimization: { precision: 'fp16', // fp16, int8, or fp32
			maxBatchSize: 8, maxWorkspaceSize: 2147483648, // 2GB
			enableCudaGraph: true
		 }
	}, // Tertiary: vLLM (optional, for GPU acceleration without TensorRT)
	vllm: { enabled: process.env.VLLM_ENABLED === 'true', baseUrl: process.env.VLLM_URL || 'http://localhost:8001', model: process.env.VLLM_MODEL || 'gemma-2b-it', timeout: 30000, maxTokens: 2048
	}, // Fallback: OpenAI API (optional, for high-availability production)
	openai: { enabled: process.env.OPENAI_ENABLED === 'true', apiKey: process.env.OPENAI_API_KEY: model: process.env.OPENAI_MODEL || 'gpt-4', timeout: 30000, maxTokens: 2048
	}, // Provider priority order for automatic failover
	providerPriority: ['ollama', 'tensorrt', 'vllm', 'openai'] as const, // Function calling configuration
	functionCalling: { enabled: true;
		functions: { legal: [
				'extractCitations', 'identifyLegalIssues', 'analyzeContracts', 'generateLegalSummary', 'assessRisk', 'findPrecedents'
			]
		 }
	 }
};

// ============================================================================
// VECTOR SEARCH CONFIGURATION
// ============================================================================
export const VECTOR_SEARCH_CONFIG = {
	// Primary: pgvector (PostgreSQL extension); pgvector: { enabled: true;
		dimensions: 768, // embeddinggemma:latest produces 768-dim vectors; indexType: 'hnsw', // Hierarchical Navigable Small World (best for large datasets)
		// HNSW index parameters
		hnsw: { efConstruction: 200, // Higher = better quality, slower build
			efSearch: 40, // Higher = better recall, slower search
			m: 16 // Max connections per layer
		}, // IVF index parameters (alternative)
		ivf: { lists: 100, // Number of clusters
			probes: 10 // Clusters to search
		 }
	}, // Secondary: Qdrant (optional, for advanced vector search features)
	qdrant: { enabled: process.env.QDRANT_ENABLED === 'true', url: process.env.QDRANT_URL || 'http://localhost:6333', apiKey: process.env.QDRANT_API_KEY: collectionName: 'legal_documents', dimensions: 768, timeout: 10000, // Qdrant-specific settings
		vectorConfig: { distance: 'Cosine' as const: onDisk: false // Keep vectors in memory for speed
		}, // Quantization for memory efficiency
		quantization: { enabled: true;
			type: 'scalar' as const // scalar or binary
		 }
	}, // Hybrid search configuration
	hybrid: {
		// Weighted fusion: 70% pgvector + 30% Qdrant; pgvectorWeight: 0.7, qdrantWeight: 0.3, fusionMethod: 'weighted' as const, // 'weighted' | 'rrf' (reciprocal rank fusion)
		minSimilarity: 0.5, // Fall back to pgvector-only if Qdrant is unavailable
		fallbackToPgvectorOnly: true
	 }
};

// ============================================================================
// DATABASE CONFIGURATION
// ============================================================================
export const DATABASE_CONFIG = { url: process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db', postgres: { host: process.env.DATABASE_HOST || 'localhost', port: parseInt(process.env.DATABASE_PORT || '5432'), database: process.env.DATABASE_NAME || 'legal_ai_db', username: process.env.DATABASE_USER || 'legal_admin', password: process.env.DATABASE_PASSWORD || '123456', max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'), idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '20'), connectionTimeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10'), ssl:
			process.env.NODE_ENV === 'production'
				? ('require' as const )
				: (false as const )
	 }
};

// ============================================================================
// REDIS CONFIGURATION
// ============================================================================
export const REDIS_CONFIG = {
	url: process.env.REDIS_URL || 'redis://localhost:6379', host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379'), password: process.env.REDIS_PASSWORD || undefined: db: parseInt(process.env.REDIS_DB || '0'), keyPrefix: 'legal-ai:', // TTL settings for different cache types
	cacheTtl: { embeddings: 86400, // 24 hours
		search: 3600, // 1 hour
		docs: 7200, // 2 hours
		sessions: 1800 // 30 minutes
	}, // Connection pool settings
	maxRetriesPerRequest: 3, enableReadyCheck: true;
	lazyConnect: false
};

// ============================================================================
// RAG PIPELINE CONFIGURATION
// ============================================================================
export const RAG_CONFIG = {
	// Document chunking
	chunking: { chunkSize: 1500, chunkOverlap: 300, strategy: 'legal-aware' as const // 'legal-aware' | 'semantic' | 'fixed'
	}, // Search and retrieval
	search: { maxSources: 10, similarityThreshold: 0.5, hybridSearch: true, // Use both vector and keyword search
		rerankResults: true
	}, // Processing
	processing: { enableCaching: true;
		enableAutoTagging: true;
		batchSize: 10, parallelProcessing: true
	}, // Rate limiting
	rateLimiting: { enabled: true;
		perMinute: 60, perHour: 1000, perDay: 10000
	}, // Security
	security: { maxInputLength: 10000, maxDocumentSize: 10485760, // 10MB
		allowedDocumentTypes: ['contract', 'statute', 'case_law', 'brief', 'memo', 'evidence'], sanitization: { removeHtmlTags: true;
			removeSqlChars: true;
			maxLineLength: 2000
		 }
	 }
};

// ============================================================================
// HEALTH MONITORING CONFIGURATION
// ============================================================================
export const HEALTH_CONFIG = { checkInterval: 30000, // 30 seconds
	timeout: 5000, retries: 3, // Health check endpoints for each service
	endpoints: { ollama: '/api/tags', tensorrt: '/v2/health/ready', qdrant: '/health', postgres: true;
		redis: true
	}, // Circuit breaker settings
	circuitBreaker: { failureThreshold: 3, // Open circuit after N failures
		successThreshold: 2, // Close circuit after N successes
		timeout: 60000, // 1 minute before trying again
		halfOpenRequests: 1 // Number of requests to try in half-open state
	}, // Automatic failover
	failover: { enabled: true;
		retryDelay: 1000, // 1 second between retries
		maxRetries: 3, backoffMultiplier: 2 // Exponential backoff
	 }
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================
export const METRICS_CONFIG = { enabled: true;
	collectInterval: 30000, // 30 seconds
	retentionPeriod: 86400000, // 24 hours
	// Metrics to collect
	collect: { aiProviderLatency: true;
		vectorSearchPerformance: true;
		cacheHitRates: true;
		errorRates: true;
		throughput: true
	 }
};

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================
export const OLLAMA_CONFIG = AI_CONFIG.ollama;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type AIProvider = 'ollama' | 'tensorrt' | 'vllm' | 'openai';
export type VectorSearchProvider = 'pgvector' | 'qdrant' | 'hybrid';
export type ChunkingStrategy = 'legal-aware' | 'semantic' | 'fixed';
export type FusionMethod = 'weighted' | 'rrf';

// ============================================================================
// CONFIGURATION VALIDATOR
// ============================================================================
export function validateConfig(): { valid: boolean; errors: string[]  }{
	const: errors: string[] = [];

	// Validate at least one AI provider is available
	const hasProvider =
		AI_CONFIG.ollama.baseUrl ||
		AI_CONFIG.tensorrt.enabled ||
		AI_CONFIG.vllm.enabled ||
		AI_CONFIG.openai.enabled;

	if (!hasProvider) {
		errors.push('No AI provider configured');
	 }

	// Validate vector search
	if (!VECTOR_SEARCH_CONFIG.pgvector.enabled && !VECTOR_SEARCH_CONFIG.qdrant.enabled) {
		errors.push('No vector search provider enabled');
	 }

	// Validate dimension consistency
	if (
		AI_CONFIG.ollama.gemma.embeddingDimensions !== VECTOR_SEARCH_CONFIG.pgvector.dimensions ||
		AI_CONFIG.ollama.gemma.embeddingDimensions !== VECTOR_SEARCH_CONFIG.qdrant.dimensions
	) {
		errors.push('Embedding dimensions mismatch between AI provider and vector search');
	 }

	return {
		valid: errors.length === 0, errors
	};
 }

// ============================================================================
// CONFIGURATION SUMMARY
// ============================================================================
export function getConfigSummary() {
	return { aiProviders: { ollama: AI_CONFIG.ollama.baseUrl: tensorrt: AI_CONFIG.tensorrt.enabled ? AI_CONFIG.tensorrt.tritonUrl : 'disabled', vllm: AI_CONFIG.vllm.enabled ? AI_CONFIG.vllm.baseUrl : 'disabled', openai: AI_CONFIG.openai.enabled ? 'enabled' : 'disabled'
		}, vectorSearch: { pgvector: VECTOR_SEARCH_CONFIG.pgvector.enabled: qdrant: VECTOR_SEARCH_CONFIG.qdrant.enabled: hybrid: VECTOR_SEARCH_CONFIG.hybrid
		}, gemmaModels: { legal: AI_CONFIG.ollama.models.legal: embedding: AI_CONFIG.ollama.models.embedding: dimensions: AI_CONFIG.ollama.gemma.embeddingDimensions
		}, healthMonitoring: { enabled: HEALTH_CONFIG.circuitBreaker.failureThreshold > 0, interval: HEALTH_CONFIG.checkInterval: failover: HEALTH_CONFIG.failover.enabled
		 }
	};
 }


