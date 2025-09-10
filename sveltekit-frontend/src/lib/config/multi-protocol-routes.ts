import http from "http";
/**
 * Multi-Protocol API Routing Configuration
 * Native Windows Legal AI Platform - Production Ready
 *
 * Supports HTTP, gRPC, QUIC, and WebSocket protocols
 * Using existing compiled Go binaries for maximum performance
 */

export interface ServiceConfig {
  name: string;
  port: number;
  protocols: ('http' | 'grpc' | 'quic' | 'ws')[];
  healthEndpoint: string;
  binary?: string;
  tier: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ProtocolRoute {
  service: string;
  endpoint: string;
  protocols: {
    http?: string;
    grpc?: string;
    quic?: string;
    ws?: string;
  };
  fallback: string[];
  timeout: number;
}

// Complete 37 Services Configuration using existing binaries
export const SERVICES_CONFIG: Record<string, ServiceConfig> = {
  // TIER 1: Core Infrastructure (Ports 6000-7000)
  postgresql: {
    name: 'PostgreSQL',
    port: 5432,
    protocols: ['http'],
    healthEndpoint: '/health',
    tier: 1,
    priority: 'critical'
  },
  redis: {
    name: 'Redis',
    port: 6379,
    protocols: ['http'],
    healthEndpoint: '/ping',
    tier: 1,
    priority: 'critical'
  },
  qdrant: {
    name: 'Qdrant Vector DB',
    port: 6333,
    protocols: ['http'],
    healthEndpoint: '/collections',
    tier: 1,
    priority: 'critical'
  },
  neo4j: {
    name: 'Neo4j Graph DB',
    port: 7474,
    protocols: ['http'],
    healthEndpoint: '/db/system/tx/commit',
    tier: 1,
    priority: 'high'
  },
  minio: {
    name: 'MinIO Object Storage',
    port: 9000,
    protocols: ['http'],
    healthEndpoint: '/minio/health/live',
    tier: 1,
    priority: 'high'
  },
  ollama: {
    name: 'Ollama AI Server',
    port: 11434,
    protocols: ['http'],
    healthEndpoint: '/api/tags',
    tier: 1,
    priority: 'critical'
  },

  // TIER 2: Core Go Services (Ports 8090-8099)
  enhancedRag: {
    name: 'Enhanced RAG Service',
    port: 8094,
    protocols: ['http', 'grpc', 'quic'],
    healthEndpoint: '/health',
    binary: 'enhanced-rag.exe',
    tier: 2,
    priority: 'critical'
  },
  uploadService: {
    name: 'Upload Service',
    port: 8093,
    protocols: ['http', 'ws'],
    healthEndpoint: '/health',
    binary: 'upload-service.exe',
    tier: 2,
    priority: 'critical'
  },
  enhancedRagV2: {
    name: 'Enhanced RAG V2',
    port: 8095,
    protocols: ['http', 'grpc'],
    healthEndpoint: '/health',
    binary: 'enhanced-rag.exe',
    tier: 2,
    priority: 'high'
  },
  aiSummary: {
    name: 'AI Summary Service',
    port: 8097,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'ai-enhanced.exe',
    tier: 2,
    priority: 'high'
  },

  // TIER 3: Management & Orchestration (Ports 8210-8219)
  xstateManager: {
    name: 'XState Manager',
    port: 8212,
    protocols: ['http', 'ws'],
    healthEndpoint: '/health',
    binary: 'xstate-manager.exe',
    tier: 3,
    priority: 'high'
  },
  clusterManager: {
    name: 'Cluster HTTP Manager',
    port: 8213,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'cluster-http.exe',
    tier: 3,
    priority: 'high'
  },
  quicGateway: {
    name: 'QUIC Gateway',
    port: 8216,
    protocols: ['quic', 'http'],
    healthEndpoint: '/health',
    binary: 'quic-gateway.exe',
    tier: 3,
    priority: 'high'
  },
  simdHealth: {
    name: 'SIMD Health Monitor',
    port: 8217,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'simd-health.exe',
    tier: 3,
    priority: 'medium'
  },
  context7Pipeline: {
    name: 'Context7 Error Pipeline',
    port: 8219,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'context7-error-pipeline.exe',
    tier: 3,
    priority: 'medium'
  },

  // TIER 4: Specialized Services (Ports 8200-8209, 8220-8229)
  liveAgent: {
    name: 'Live Agent Enhanced',
    port: 8200,
    protocols: ['http', 'ws'],
    healthEndpoint: '/health',
    binary: 'live-agent-enhanced.exe',
    tier: 4,
    priority: 'high'
  },
  legalAI: {
    name: 'Legal AI Service',
    port: 8202,
    protocols: ['http', 'grpc'],
    healthEndpoint: '/health',
    binary: 'enhanced-legal-ai.exe',
    tier: 4,
    priority: 'high'
  },
  gpuIndexer: {
    name: 'GPU Indexer Service',
    port: 8220,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'gpu-indexer-service.exe',
    tier: 4,
    priority: 'medium'
  },
  loadBalancer: {
    name: 'Load Balancer',
    port: 8222,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'load-balancer.exe',
    tier: 4,
    priority: 'critical'
  },
  recommendations: {
    name: 'Recommendation Service',
    port: 8223,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'recommendation-service.exe',
    tier: 4,
    priority: 'medium'
  },
  summarizerHttp: {
    name: 'Summarizer HTTP',
    port: 8224,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'summarizer-http.exe',
    tier: 4,
    priority: 'medium'
  },
  summarizerService: {
    name: 'Summarizer Service',
    port: 8225,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'summarizer-service.exe',
    tier: 4,
    priority: 'medium'
  },
  simdParser: {
    name: 'SIMD Parser',
    port: 8226,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'simd-parser.exe',
    tier: 4,
    priority: 'low'
  },
  ginUpload: {
    name: 'Gin Upload Service',
    port: 8227,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'gin-upload.exe',
    tier: 4,
    priority: 'low'
  },
  simpleUpload: {
    name: 'Simple Upload Service',
    port: 8228,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'simple-upload.exe',
    tier: 4,
    priority: 'low'
  },

  // TIER 5: Additional Services (Ports 8230-8236)
  legalClean: {
    name: 'Enhanced Legal Clean',
    port: 8229,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'enhanced-legal-ai-clean.exe',
    tier: 5,
    priority: 'low'
  },
  legalFixed: {
    name: 'Enhanced Legal Fixed',
    port: 8230,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'enhanced-legal-ai-fixed.exe',
    tier: 5,
    priority: 'low'
  },
  legalRedis: {
    name: 'Enhanced Legal Redis',
    port: 8231,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'enhanced-legal-ai-redis.exe',
    tier: 5,
    priority: 'low'
  },
  multicore: {
    name: 'Enhanced Multicore',
    port: 8232,
    protocols: ['http'],
    healthEndpoint: '/health',
    binary: 'enhanced-multicore.exe',
    tier: 5,
    priority: 'medium'
  },
  ragKratos: {
    name: 'RAG Kratos',
    port: 8233,
    protocols: ['grpc', 'http'],
    healthEndpoint: '/health',
    binary: 'rag-kratos.exe',
    tier: 5,
    priority: 'medium'
  },
  ragQuicProxy: {
    name: 'RAG QUIC Proxy',
    port: 8234,
    protocols: ['quic', 'http'],
    healthEndpoint: '/health',
    binary: 'rag-quic-proxy.exe',
    tier: 5,
    priority: 'medium'
  },

  // gRPC Services (Ports 50051-50052)
  grpcServer: {
    name: 'gRPC Server',
    port: 50051,
    protocols: ['grpc'],
    healthEndpoint: '/grpc.health.v1.Health/Check',
    binary: 'grpc-server.exe',
    tier: 2,
    priority: 'high'
  },
  kratosServer: {
    name: 'Kratos gRPC Server',
    port: 50052,
    protocols: ['grpc'],
    healthEndpoint: '/grpc.health.v1.Health/Check',
    binary: 'kratos-server.exe',
    tier: 2,
    priority: 'high'
  }
};

// Multi-Protocol API Routes Configuration
export const API_ROUTES: ProtocolRoute[] = [
  // Enhanced RAG Routes
  {
    service: 'enhancedRag',
    endpoint: '/api/v1/rag',
    protocols: {
      quic: 'quic://localhost:8094/api/v1/rag',
      grpc: 'grpc://localhost:50051/rag.v1.RAGService',
      http: 'http://localhost:8094/api/v1/rag',
      ws: 'ws://localhost:8094/api/v1/rag/stream'
    },
    fallback: ['quic', 'grpc', 'http'],
    timeout: 30000
  },

  // Upload Routes
  {
    service: 'uploadService',
    endpoint: '/api/v1/upload',
    protocols: {
      http: 'http://localhost:8093/upload',
      ws: 'ws://localhost:8093/upload/stream'
    },
    fallback: ['http'],
    timeout: 60000
  },

  // AI Summary Routes
  {
    service: 'aiSummary',
    endpoint: '/api/v1/ai/summary',
    protocols: {
      http: 'http://localhost:8097/api/v1/summary',
      ws: 'ws://localhost:8097/api/v1/summary/stream'
    },
    fallback: ['http'],
    timeout: 45000
  },

  // Legal AI Routes
  {
    service: 'legalAI',
    endpoint: '/api/v1/legal',
    protocols: {
      grpc: 'grpc://localhost:50051/legal.v1.LegalService',
      http: 'http://localhost:8202/api/v1/legal'
    },
    fallback: ['grpc', 'http'],
    timeout: 30000
  },

  // QUIC Gateway Routes
  {
    service: 'quicGateway',
    endpoint: '/api/v1/quic',
    protocols: {
      quic: 'quic://localhost:8216/api/v1/gateway',
      http: 'http://localhost:8216/api/v1/gateway'
    },
    fallback: ['quic', 'http'],
    timeout: 5000
  },

  // Cluster Management Routes
  {
    service: 'clusterManager',
    endpoint: '/api/v1/cluster',
    protocols: {
      http: 'http://localhost:8213/api/v1/cluster'
    },
    fallback: ['http'],
    timeout: 15000
  },

  // XState Management Routes
  {
    service: 'xstateManager',
    endpoint: '/api/v1/state',
    protocols: {
      http: 'http://localhost:8212/api/v1/state',
      ws: 'ws://localhost:8212/api/v1/state/events'
    },
    fallback: ['http'],
    timeout: 10000
  },

  // Load Balancer Routes
  {
    service: 'loadBalancer',
    endpoint: '/api/v1/lb',
    protocols: {
      http: 'http://localhost:8222/api/v1/balance'
    },
    fallback: ['http'],
    timeout: 5000
  },

  // GPU Indexer Routes
  {
    service: 'gpuIndexer',
    endpoint: '/api/v1/gpu/index',
    protocols: {
      http: 'http://localhost:8220/api/v1/index'
    },
    fallback: ['http'],
    timeout: 60000
  },

  // Recommendation Routes
  {
    service: 'recommendations',
    endpoint: '/api/v1/recommendations',
    protocols: {
      http: 'http://localhost:8223/api/v1/recommend'
    },
    fallback: ['http'],
    timeout: 15000
  }
];

// Protocol Priority Configuration
export const PROTOCOL_PRIORITY = {
  performance: ['quic', 'grpc', 'http', 'ws'],
  reliability: ['http', 'grpc', 'quic', 'ws'],
  realtime: ['ws', 'quic', 'grpc', 'http']
} as const;

// Service Health Check Configuration
export const HEALTH_CHECK_CONFIG = {
  interval: 30000, // 30 seconds
  timeout: 5000,   // 5 seconds
  retries: 3,
  unhealthyThreshold: 3,
  healthyThreshold: 2
};

// Protocol-specific configurations
export const PROTOCOL_CONFIG = {
  http: {
    timeout: 30000,
    retries: 3,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Legal-AI-Platform/1.0'
    }
  },
  grpc: {
    timeout: 15000,
    retries: 3,
    keepAlive: true,
    keepAliveTimeout: 30000
  },
  quic: {
    timeout: 5000,
    retries: 2,
    keepAlive: true,
    maxStreams: 100
  },
  ws: {
    timeout: 0, // No timeout for WebSocket
    pingInterval: 30000,
    pongTimeout: 5000,
    reconnectDelay: 1000
  }
};

// Service Discovery Configuration
export const SERVICE_DISCOVERY = {
  enabled: true,
  refreshInterval: 60000, // 1 minute
  healthCheckEnabled: true,
  autoFailover: true,
  circuitBreakerEnabled: true
};

export default {
  SERVICES_CONFIG,
  API_ROUTES,
  PROTOCOL_PRIORITY,
  HEALTH_CHECK_CONFIG,
  PROTOCOL_CONFIG,
  SERVICE_DISCOVERY
};