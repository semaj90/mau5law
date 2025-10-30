/**
 * Advanced Memory Optimizer with LOD, k-means, SOM, and multi-layer caching
 * Optimizes memory usage across the entire legal AI system
 */
// Avoid importing 'worker_threads' at module-load time to keep browser/SSR builds safe.
// Worker creation happens lazily and only when Node worker threads are actually available.
import { SelfOrganizingMapRAG } from '../ai/som-rag-system.js';
import crypto from "crypto";
import {
  SIMDJSONParser,
  type ParsedLegalDocument
} from '../parsers/simd-json-parser.js';

// Initialize SIMD parser instance
const simdParser = new SIMDJSONParser({
  batchSize: 2048,
  enableSIMD: true,
  memoryLimit: 512 * 1024 * 1024, // 512MB
  parallelChunks: 4,
  validateStructure: true
});
// Native memory optimizer mock (Docker dependency removed)
class DockerResourceOptimizer {
  constructor(config?: any) {
    // Mock implementation - no actual Docker optimization
  }
  async cacheWithCompression(_key: string, data: any) {
    // Simple compression mock
    const jsonData = JSON.stringify(data);
    return {
      key: _key,
      data: jsonData,
      compressed: true,
      size: Math.floor(jsonData.length * 0.7) // Simulate 30% compression
    };
  }
  dispose() {
    // Mock cleanup
  }
}
export interface LODLevel {
  id: string;
  detail: "low" | "medium" | "high" | "ultra";
  maxMemoryMB: number;
  maxObjects: number;
  quality: number; // 0-1,
  compressionRatio: number;
}
export interface ClusterMetrics {
  id: string;
  centroid: number[];
  size: number;
  cohesion: number;
  separability: number;
  memoryUsage: number;
  processingTime: number;
}
export interface MemoryPool {
  id: string;
  type: "embedding" | "vector" | "cache" | "som" | "cluster";
  current: number;
  max: number;
  items: Map<string, any>;
  lastAccessed: number;
  priority: number;
}
export interface CacheLayer {
  name: string;
  type:
    | "loki"
    | "redis"
    | "qdrant"
    | "postgres"
    | "neo4j"
    | "rabbitmq"
    | "memory";
  size: number;
  hitRate: number;
  avgResponseTime: number;
  ttl: number;
  priority: number;
  enabled: boolean;
}

// Narrowed document-like type used by clustering / processing functions
type Embeddable = {
  id?: string;
  embedding?: number[];
  clusterId?: number;
  metadata?: Record<string, unknown>;
  [k: string]: unknown;
};

// Minimal worker-like interface (covers Node Worker and WebWorker-like wrappers)
interface WorkerLike {
  postMessage(message: any): void;
  on?(event: string, listener: (...args: any[]) => void): any;
  off?(event: string, listener: (...args: any[]) => void): any;
  removeListener?(event: string, listener: (...args: any[]) => void): any;
  addEventListener?(type: string, listener: (ev: any) => void): any;
  terminate?(): Promise<void> | void;
}

export class AdvancedMemoryOptimizer {
  private memoryPools = new Map<string, MemoryPool>();
  private clusters = new Map<string, ClusterMetrics>();
  private cacheLayers = new Map<string, CacheLayer>();
  private lodLevels: LODLevel[] = [];
  private somNetwork: SelfOrganizingMapRAG | null = null;
  private dockerOptimizer: DockerResourceOptimizer;
  private currentLOD!: LODLevel;
  private memoryPressure = 0;
  private optimizationHistory: Array<Record<string, unknown>> = [];
  private workerPool: Map<string, WorkerLike> = new Map();
  private maxWorkers = 4;

  constructor() {
    this.dockerOptimizer = new DockerResourceOptimizer();
    this.initializeLODLevels();
    this.initializeCacheLayers();
    this.initializeMemoryPools();
    this.initializeWorkerPool();
    this.currentLOD = this.lodLevels[1]; // Start with medium
    this.startMemoryMonitoring();
  }
  /**
   * Initialize Level of Detail configurations
   */
  private initializeLODLevels(): void {
    this.lodLevels = [
      {
        id: "low",
        detail: "low",
        maxMemoryMB: 512,
        maxObjects: 1000,
        quality: 0.3,
        compressionRatio: 0.1
      },
      {
        id: "medium",
        detail: "medium",
        maxMemoryMB: 1024,
        maxObjects: 5000,
        quality: 0.6,
        compressionRatio: 0.4
      },
      {
        id: "high",
        detail: "high",
        maxMemoryMB: 2048,
        maxObjects: 10000,
        quality: 0.8,
        compressionRatio: 0.7
      },
      {
        id: "ultra",
        detail: "ultra",
        maxMemoryMB: 4096,
        maxObjects: 25000,
        quality: 1.0,
        compressionRatio: 1.0
      }
    ];
  }
  /**
   * Initialize cache layers with priorities
   */
  private initializeCacheLayers(): void {
    const layers: CacheLayer[] = [
      {
        name: "memory",
        type: "memory",
        size: 0,
        hitRate: 0,
        avgResponseTime: 1,
        ttl: 300,
        priority: 1,
        enabled: true
      },
      {
        name: "loki",
        type: "loki",
        size: 0,
        hitRate: 0,
        avgResponseTime: 5,
        ttl: 300,
        priority: 2,
        enabled: true
      },
      {
        name: "redis",
        type: "redis",
        size: 0,
        hitRate: 0,
        avgResponseTime: 10,
        ttl: 3600,
        priority: 3,
        enabled: true
      },
      {
        name: "qdrant",
        type: "qdrant",
        size: 0,
        hitRate: 0,
        avgResponseTime: 25,
        ttl: 7200,
        priority: 4,
        enabled: true
      },
      {
        name: "postgres",
        type: "postgres",
        size: 0,
        hitRate: 0,
        avgResponseTime: 50,
        ttl: 86400,
        priority: 5,
        enabled: true
      },
      {
        name: "neo4j",
        type: "neo4j",
        size: 0,
        hitRate: 0,
        avgResponseTime: 75,
        ttl: 43200,
        priority: 6,
        enabled: true
      }
    ];
    layers.forEach((layer) => {
      this.cacheLayers.set(layer.name, layer);
    });
  }
  /**
   * Initialize memory pools for different data types
   */
  private initializeMemoryPools(): void {
    const pools: MemoryPool[] = [
      {
        id: "embeddings",
        type: "embedding",
        current: 0,
        max: 512 * 1024 * 1024, // 512MB
        items: new Map(),
        lastAccessed: Date.now(),
        priority: 1
      },
      {
        id: "vectors",
        type: "vector",
        current: 0,
        max: 256 * 1024 * 1024, // 256MB
        items: new Map(),
        lastAccessed: Date.now(),
        priority: 2
      },
      {
        id: "cache",
        type: "cache",
        current: 0,
        max: 1024 * 1024 * 1024, // 1GB
        items: new Map(),
        lastAccessed: Date.now(),
        priority: 3
      },
      {
        id: "som",
        type: "som",
        current: 0,
        max: 128 * 1024 * 1024, // 128MB
        items: new Map(),
        lastAccessed: Date.now(),
        priority: 4
      },
      {
        id: "clusters",
        type: "cluster",
        current: 0,
        max: 64 * 1024 * 1024, // 64MB
        items: new Map(),
        lastAccessed: Date.now(),
        priority: 5
      }
    ];
    pools.forEach((pool) => {
      this.memoryPools.set(pool.id, pool);
    });
  }
  /**
   * Initialize worker thread pool for CPU-intensive operations
   */
  private initializeWorkerPool(): void {
    console.log(`🧵 Initializing worker pool with ${this.maxWorkers} workers`);
    // Don't create workers immediately - create them on demand
    // This helps with memory usage and allows for better error handling
  }
  /**
   * Get or create a worker for k-means clustering
   */
  private async getKMeansWorker(): Promise<WorkerLike> {
    const workerId = "kmeans-worker";
    if (this.workerPool.has(workerId)) {
      return this.workerPool.get(workerId)!;
    }
    if (!this.enableWorkerThreads()) {
      throw new Error("Worker threads not available");
    }
    const workerPath = new URL("../workers/kmeans-worker.js", import.meta.url);
    try {
      // dynamic import so bundlers won't statically include 'worker_threads'
      const wt = await import("worker_threads");
      const nodeWorker = new wt.Worker(workerPath) as unknown as WorkerLike;
      if (nodeWorker.on) {
        nodeWorker.on("error", (error: any) => {
          console.error("🚨 K-means worker error:", error);
          this.workerPool.delete(workerId);
        });
        // 'exit' is Node-specific; handle gracefully if present
        try {
          (nodeWorker as any).on?.("exit", (code: number) => {
            if (code !== 0) {
              console.warn(`⚠️ K-means worker exited with code ${code}`);
            }
            this.workerPool.delete(workerId);
          });
        } catch {}
      }
      this.workerPool.set(workerId, nodeWorker);
      return nodeWorker;
    } catch (err) {
      this.workerPool.delete(workerId);
      throw new Error("Failed to spawn k-means worker: " + (err as Error).message);
    }
  }
  /**
   * Intelligent cache layer selection based on data type and access patterns
   */
  async selectOptimalCacheLayer(
    _key: string,
    _dataType: string,
    size: number,
    accessFrequency: number
  ): Promise<CacheLayer[]> {
    const enabledLayers = Array.from(this.cacheLayers.values())
      .filter((layer) => layer.enabled)
      .sort((a, b) => a.priority - b.priority);

    const scoredLayers = enabledLayers.map((layer) => {
      let score = 0;
      // Size factor
      if (size < 1024) score += 10;
      else if (size < 1024 * 1024) score += layer.priority <= 3 ? 8 : 4;
      else score += layer.priority >= 4 ? 8 : 2;
      // Access frequency factor
      if (accessFrequency > 0.8) score += layer.priority <= 2 ? 10 : 5;
      else if (accessFrequency > 0.5) score += layer.priority <= 4 ? 8 : 6;
      else score += layer.priority >= 4 ? 10 : 3;
      // Hit rate factor
      score += (layer.hitRate || 0) * 10;
      // Response time factor (inverse)
      score += Math.max(0, 100 - (layer.avgResponseTime || 0));
      return { layer, score };
    });

    return scoredLayers
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.layer);
  }
  /**
   * Adaptive LOD management based on memory pressure
   */
  async adaptiveLODManagement(): Promise<void> {
    const currentMemory = await this.getCurrentMemoryUsage();
    const maxMemory = this.currentLOD.maxMemoryMB * 1024 * 1024;
    this.memoryPressure = currentMemory / maxMemory;
    console.log(
      `🧠 Memory pressure: ${(this.memoryPressure * 100).toFixed(1)}%`
    );
    if (this.memoryPressure > 0.9) {
      // High pressure - reduce LOD
      await this.reduceLOD();
    } else if (
      this.memoryPressure < 0.5 &&
      this.currentLOD.detail !== "ultra"
    ) {
      // Low pressure - potentially increase LOD
      await this.increaseLOD();
    }
    // Adjust object limits based on pressure
    await this.adjustObjectLimits();
  }
  /**
   * K-means clustering using worker threads for CPU-intensive operations
   */
  async performKMeansClustering(
    data: Array<Embeddable>,
    k: number = 5
  ): Promise<ClusterMetrics[]> {
    const itemCount = data.length;
    console.log(`🔄 Performing k-means clustering (k=${k}) on ${itemCount} items...`);
    const startTime = Date.now();
    // Determine if we should use worker threads
    const useWorkerThread = itemCount > 1000 && this.enableWorkerThreads();
    if (useWorkerThread) {
      return this.performKMeansWithWorker(data, k);
    } else {
      // Use original in-process clustering for smaller datasets
      return this.performKMeansInProcess(data, k);
    }
  }
  /**
   * Perform k-means clustering using worker thread
   */
  private async performKMeansWithWorker(
    data: Array<Embeddable>,
    k: number
  ): Promise<ClusterMetrics[]> {
    const worker = await this.getKMeansWorker();
    return new Promise<ClusterMetrics[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        // try to remove handlers before rejecting
        try {
          if ((worker as any).off) {
            (worker as any).off("message", messageHandler);
            (worker as any).off("message", progressHandler);
          } else if ((worker as any).removeListener) {
            (worker as any).removeListener("message", messageHandler);
            (worker as any).removeListener("message", progressHandler);
          } else if ((worker as any).addEventListener) {
            // best-effort removal for browser-like workers (no standard removal for anonymous listeners here)
          }
        } catch {}
        reject(new Error("K-means clustering timeout"));
      }, 300000);

      const progressHandler = (message: any) => {
        const payload = message?.data ?? message;
        if (payload?.type === "progress") {
          console.log(`📊 K-means progress: iteration ${payload.iteration}`);
        }
      };
      const messageHandler = (message: any) => {
        const payload = message?.data ?? message;
        try {
          if (payload?.type === "result") {
            clearTimeout(timeout);
            try {
              if ((worker as any).off) {
                (worker as any).off("message", messageHandler);
                (worker as any).off("message", progressHandler);
              } else if ((worker as any).removeListener) {
                (worker as any).removeListener("message", messageHandler);
                (worker as any).removeListener("message", progressHandler);
              }
            } catch {}
            (payload.clusters || []).forEach((cluster: ClusterMetrics) => {
              this.clusters.set(cluster.id, cluster);
            });
            console.log(
              `✅ Worker k-means clustering completed in ${payload.processingTime}ms`
            );
            resolve(payload.clusters || []);
          } else if (payload?.type === "error") {
            clearTimeout(timeout);
            try {
              if ((worker as any).off) {
                (worker as any).off("message", messageHandler);
                (worker as any).off("message", progressHandler);
              } else if ((worker as any).removeListener) {
                (worker as any).removeListener("message", messageHandler);
                (worker as any).removeListener("message", progressHandler);
              }
            } catch {}
            reject(new Error(`Worker error: ${payload.error}`));
          }
        } catch (error: any) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      // Attach listeners (support Node Worker and browser worker shapes)
      try {
        if ((worker as any).on) {
          (worker as any).on("message", messageHandler);
          (worker as any).on("message", progressHandler);
        } else if ((worker as any).addEventListener) {
          (worker as any).addEventListener("message", (ev: any) => messageHandler(ev.data));
        } else {
          // fallback: no listener attachment available
        }
      } catch (err) {
        clearTimeout(timeout);
        return reject(err);
      }

      // Post the task to the worker (Node worker_threads typically expect type:'module' for ESM files;
      // the worker creation already happens dynamically in getKMeansWorker).
       try {
         worker.postMessage({ type: "run", data, k });
       } catch (err) {
         clearTimeout(timeout);
         try {
           if ((worker as any).terminate) (worker as any).terminate();
         } catch {}
         reject(err);
       }
     });
   }

  // --- Helper implementations to keep code self-contained and type-safe ---

  private enableWorkerThreads(): boolean {
    try {
      // Available only in Node-like runtimes; browsers will return false
      return typeof process !== "undefined" && !!(process as any).versions && !!(process as any).versions.node;
    } catch {
      return false;
    }
  }

  private async performKMeansInProcess(data: Array<Embeddable>, k: number): Promise<ClusterMetrics[]> {
    const start = Date.now();
    const items = data.filter((d) => Array.isArray(d.embedding) && d.embedding!.length > 0);
    if (items.length === 0) return [];

    // Simple deterministic seeding: use first k distinct items (or random if less)
    const centroids: number[][] = [];
    for (let i = 0; i < Math.min(k, items.length); i++) {
      centroids.push(items[i].embedding!.slice());
    }
    // One iteration average-assignment (cheap but deterministic)
    const clusters: Array<Embeddable[]> = Array.from({ length: centroids.length }, () => []);
    items.forEach((it) => {
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      centroids.forEach((c, idx) => {
        const dist = this.euclideanDistanceSquared(c, it.embedding!);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      clusters[bestIdx].push(it);
    });

    const results: ClusterMetrics[] = clusters.map((group, idx) => {
      const centroid = group.length
        ? group[0].embedding!.map((_, dim) => {
            let sum = 0;
            for (let g of group) sum += (g.embedding as number[])[dim] ?? 0;
            return sum / group.length;
          })
        : centroids[idx] || [];

      return {
        id: `cluster_${idx}`,
        centroid,
        size: group.length,
        cohesion: 0,
        separability: 0,
        memoryUsage: group.length * 1024, // rough estimate
        processingTime: Date.now() - start
      };
    });

    results.forEach((r) => this.clusters.set(r.id, r));
    console.log(`✅ In-process k-means clustering completed in ${Date.now() - start}ms`);
    return results;
  }

  private euclideanDistanceSquared(a: number[], b: number[]) {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const d = (a[i] || 0) - (b[i] || 0);
      s += d * d;
    }
    return s;
  }

  private async getCurrentMemoryUsage(): Promise<number> {
    try {
      if (typeof process !== "undefined" && (process as any).memoryUsage) {
        const mu = (process as any).memoryUsage();
        return mu.rss || mu.heapUsed || 0;
      }
    } catch {}
    return 0;
  }

  private startMemoryMonitoring(): void {
    // run once immediately, then periodically
    this.adaptiveLODManagement().catch(() => {});
    setInterval(() => {
      this.adaptiveLODManagement().catch((e) => {
        console.warn("Memory monitoring error:", e);
      });
    }, 60_000); // every minute
  }

  private async reduceLOD(): Promise<void> {
    const idx = this.lodLevels.findIndex((l) => l.id === this.currentLOD.id);
    if (idx > 0) {
      this.currentLOD = this.lodLevels[idx - 1];
      console.log(`🔽 Reduced LOD to ${this.currentLOD.detail}`);
    }
  }

  private async increaseLOD(): Promise<void> {
    const idx = this.lodLevels.findIndex((l) => l.id === this.currentLOD.id);
    if (idx >= 0 && idx < this.lodLevels.length - 1) {
      this.currentLOD = this.lodLevels[idx + 1];
      console.log(`🔼 Increased LOD to ${this.currentLOD.detail}`);
    }
  }

  private async adjustObjectLimits(): Promise<void> {
    // Simple placeholder: trim largest pools if over LOD maxObjects
    const max = this.currentLOD.maxObjects;
    for (const pool of this.memoryPools.values()) {
      if (pool.items.size > max) {
        // remove oldest entries until under limit (best-effort)
        const keys = Array.from(pool.items.keys()).slice(0, pool.items.size - max);
        for (const k of keys) pool.items.delete(k);
      }
    }
  }
}
    if (idx >= 0 && idx < this.lodLevels.length - 1) {
      this.currentLOD = this.lodLevels[idx + 1];
      console.log(`🔼 Increased LOD to ${this.currentLOD.detail}`);
    }
  }

  private async adjustObjectLimits(): Promise<void> {
    // Simple placeholder: trim largest pools if over LOD maxObjects
    const max = this.currentLOD.maxObjects;
    for (const pool of this.memoryPools.values()) {
      if (pool.items.size > max) {
        const keys = Array.from(pool.items.keys()).slice(0, pool.items.size - max);
        for (const k of keys) pool.items.delete(k);
      }