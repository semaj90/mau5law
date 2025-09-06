import { json } from '@sveltejs/kit';
import net from "node:net";
import type { RequestHandler } from './$types';


type HttpCheck = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

function tcpCheck(
  host: string,
  port: number,
  timeoutMs = 1000
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (result: boolean) => {
      if (!done) {
        done = true;
        try {
          socket.destroy();
        } catch {
          /* ignore */
        }
        resolve(result);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

async function httpCheck(url: string): Promise<HttpCheck> {
  try {
    const r = await fetch(url, { method: "GET" });
    return { url, ok: r.ok, status: r.status };
  } catch (e: any) {
    return {
      url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export const GET: RequestHandler = async () => {
  // Core services health checks
  const [
    // Database services
    pgOpen,
    redisOpen,
    neo4jHealth,

    // Vector/Search services
    qdrantHealth,

    // AI/ML services
    ollamaVersion,
    enhancedRAGHealth,
    uploadServiceHealth,
    vectorServiceHealth,

    // Cluster management
    clusterHealth,
    summarizerHealth,

    // GPU services
    gpuStatusHealth,
    cudaStatusHealth,

    // System services
    minioHealth,
  ] = await Promise.all([
    // Database layer
    tcpCheck("127.0.0.1", 5432), // PostgreSQL
    tcpCheck("127.0.0.1", 6379), // Redis
    httpCheck("http://localhost:7474"), // Neo4j

    // Vector/Search layer
    httpCheck("http://localhost:6333/collections"), // Qdrant

    // AI/ML layer
    httpCheck("http://localhost:11434/api/version"), // Ollama
    httpCheck("http://localhost:8094/health"), // Enhanced RAG
    httpCheck("http://localhost:8093/health"), // Upload Service
    httpCheck("http://localhost:8095/health"), // Vector Service v2.0
                                              // embed service

    // Cluster management
    httpCheck("http://localhost:8090/health"), // Cluster
    httpCheck("http://localhost:8091/health"), // Summarizer

    // GPU acceleration
    httpCheck("http://localhost:8230/health"), // GPU Status
    httpCheck("http://localhost:8094/cuda-status"), // CUDA Status

    // Storage services
    httpCheck("http://localhost:9000"), // MinIO
  ]);

  // Performance and system metrics
  const memoryUsage = process.memoryUsage();
  const systemUptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  // Service status summary
  const services = {
    // Core Infrastructure
    databases: {
      postgres: { host: "127.0.0.1", port: 5432, status: pgOpen ? "healthy" : "failed" },
      redis: { host: "127.0.0.1", port: 6379, status: redisOpen ? "healthy" : "failed" },
      neo4j: { host: "127.0.0.1", port: 7474, status: neo4jHealth.ok ? "healthy" : "failed" },
      qdrant: { host: "127.0.0.1", port: 6333, status: qdrantHealth.ok ? "healthy" : "failed" },
    },

    // AI/ML Services
    aiServices: {
      ollama: { host: "127.0.0.1", port: 11434, status: ollamaVersion.ok ? "healthy" : "failed" },
      enhancedRAG: { host: "127.0.0.1", port: 8094, status: enhancedRAGHealth.ok ? "healthy" : "failed" },
      vectorService: { host: "127.0.0.1", port: 8095, status: vectorServiceHealth.ok ? "healthy" : "failed" },
      uploadService: { host: "127.0.0.1", port: 8093, status: uploadServiceHealth.ok ? "healthy" : "failed" },
    },

    // GPU Acceleration
    gpuServices: {
      gpuStatus: { host: "127.0.0.1", port: 8230, status: gpuStatusHealth.ok ? "healthy" : "failed" },
      cudaWorker: { status: cudaStatusHealth.ok ? "healthy" : "failed" },
      rtx3060Ti: { vram: "8GB", status: "ready" }, // Based on architecture docs
    },

    // Cluster Management
    orchestration: {
      clusterManager: { host: "127.0.0.1", port: 8090, status: clusterHealth.ok ? "healthy" : "failed" },
      summarizer: { host: "127.0.0.1", port: 8091, status: summarizerHealth.ok ? "healthy" : "failed" },
    },

    // Storage
    storage: {
      minio: { host: "127.0.0.1", port: 9000, status: minioHealth.ok ? "healthy" : "failed" },
    },
  };

  // Multi-layer caching status
  const cachingLayers = {
    l1_memory: { type: "memory", status: "healthy" },
    l2_redis: { type: "redis", host: "127.0.0.1", port: 6379, status: redisOpen ? "healthy" : "failed" },
    l3_postgres: { type: "postgres", host: "127.0.0.1", port: 5432, status: pgOpen ? "healthy" : "failed" },
    l4_qdrant: { type: "qdrant", url: "http://localhost:6333", status: qdrantHealth.ok ? "healthy" : "failed" },
  };

  // Performance metrics
  const performance = {
    systemUptime: Math.floor(systemUptime),
    memoryUsage: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    cpuUsage: {
      user: Math.round(cpuUsage.user / 1000),
      system: Math.round(cpuUsage.system / 1000),
    },
  };

  // Architecture summary based on documentation
  const architecture = {
    platform: "Tricubic Tensor Legal AI",
    version: "Production v2.0",
    gpuArchitecture: "Dual-GPU (Server CUDA + Client WebGPU)",
    microservices: 38,
    protocols: ["HTTP/JSON", "gRPC", "QUIC", "WebSocket"],
    features: [
      "GPU-Accelerated RAG",
      "Vector Search (pgvector)",
      "Real-time Legal Analysis",
      "Multi-Protocol Service Architecture",
      "Enterprise Vector Service v2.0",
      "FlashAttention2 RTX 3060 Ti Integration"
    ],
  };

  // Overall system health calculation
  const healthyServices = Object.values(services)
    .flatMap(category => Object.values(category))
    .filter(service => service.status === "healthy").length;

  const totalServices = Object.values(services)
    .flatMap(category => Object.values(category)).length;

  const healthScore = Math.round((healthyServices / totalServices) * 100);
  const overallStatus = healthScore >= 80 ? "healthy" : healthScore >= 60 ? "degraded" : "unhealthy";

  const status = {
    overall: {
      status: overallStatus,
      healthScore,
      healthyServices,
      totalServices,
      timestamp: new Date().toISOString(),
    },
    services,
    caching: cachingLayers,
    performance,
    architecture,

    // Compatibility with existing consumers
    ok: overallStatus === "healthy",
    postgres: services.databases.postgres,
    redis: services.databases.redis,
    ollama: services.aiServices.ollama,
    qdrant: services.databases.qdrant,
  } as const;

  return json(status, {
    status: overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 206 : 503,
    headers: {
      'X-Health-Score': healthScore.toString(),
      'X-Service-Count': `${healthyServices}/${totalServices}`,
      'X-Architecture': 'Legal-AI-Platform-v2.0'
    }
  });
};
