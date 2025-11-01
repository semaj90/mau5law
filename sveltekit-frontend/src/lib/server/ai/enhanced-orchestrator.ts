// Enhanced AI Synthesis Orchestrator with Full Stack Integration
// Connects Neo4j, PostgreSQL/pgvector, XState, Redis, Ollama, and Go services
import { logger } from './logger.js';
import { createHash } from 'node:crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, vector, timestamp, json, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import type { PoolConfig } from 'pg';
import { eq, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama';
import { Neo4jVectorStore } from '@langchain/community/vectorstores/neo4j_vector';
import Redis from 'ioredis';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { aiAssistantSynthesizer } from './ai-assistant-input-synthesizer.js';
import { legalBERT } from './legalbert-middleware.js';
import { monitoringService } from './monitoring-service.js';

// ===== DATABASE SCHEMA (Drizzle ORM TypeScript Safe) =====
export const legalDocuments = pgTable('legal_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 384 }),
  metadata: json('metadata'),
  documentType: text('document_type'),
  caseId: text('case_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
export const autoSolveResults = pgTable('autosolve_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  query: text('query').notNull(),
  solution: json('solution'),
  confidence: integer('confidence'),
  processingTime: integer('processing_time'),
  serviceUsed: text('service_used'),
  success: boolean('success'),
  createdAt: timestamp('created_at').defaultNow(),
});
export const synthesisCache = pgTable('synthesis_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  queryHash: text('query_hash').unique().notNull(),
  result: json('result'),
  metadata: json('metadata'),
  hitCount: integer('hit_count').default(0),
  lastAccessed: timestamp('last_accessed').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ===== DYNAMIC PORT CONFIGURATION =====
// previously relied on `portManager` / `getServicePort` which may not exist.
// Implement a safe, best-effort initializer and a fallback that reads env vars.
async function initializeDynamicPorts(): Promise<Map<string, number>> {
  try {
    // Attempt best-effort dynamic import of the optional dynamic-ports module.
    const mod: any = await import('../config/dynamic-ports.js').catch(() => null);
    if (mod && typeof mod.portManager?.initializeAllServices === 'function') {
      try {
        const allocatedPorts = await mod.portManager.initializeAllServices();
        logger.info('🔌 Dynamic ports allocated:', Array.from(allocatedPorts.entries ? allocatedPorts.entries() : []));
        return allocatedPorts;
      } catch (e) {
        logger.debug('[Orchestrator] portManager.initializeAllServices failed', e);
      }
    }
  } catch (e) {
    logger.debug('[Orchestrator] dynamic-ports import failed or not present', e);
  }
  // Fallback: no dynamic ports available — return empty map and continue using env/fallbacks.
  logger.info('[Orchestrator] dynamic ports not used, falling back to env/fallbacks');
  return new Map();
}

// Prefer environment overrides for per-service ports, fallback to provided default.
function getServicePortWithFallback(serviceName: string, fallbackPort: number): number {
  // map service name like: "enhanced-rag" -> ENV key ENHANCED_RAG_PORT
  const envKey = `${serviceName.replace(/-/g, '_').toUpperCase()}_PORT`;
  const envVal = process.env[envKey];
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return fallbackPort;
}

// ===== SERVICE CONFIGURATION =====
const services = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  },
  goMicroservice: {
    enhancedRAG: `http://localhost:${getServicePortWithFallback('enhanced-rag', 8094)}`,
    gpuOrchestrator: `http://localhost:${getServicePortWithFallback('gpu-orchestrator', 8095)}`,
    vectorConsumer: `http://localhost:${getServicePortWithFallback('vector-consumer', 8096)}`,
    binaryVectorEngine: `http://localhost:${getServicePortWithFallback('binary-vector-engine', 8091)}`,
    quicServer: `quic://localhost:${getServicePortWithFallback('quic-gateway', 8443)}`,
  },
  ollama: {
    baseUrl: `http://localhost:${getServicePortWithFallback('ollama', 11434)}`,
    models: {
      legal: 'gemma3-legal:latest',
      embedding: 'embeddinggemma:latest',
    },
  },
  context7: process.env.CONTEXT7_URL || 'http://localhost:4000',
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || String(getServicePortWithFallback('postgresql', 5432)), 10),
    database: process.env.POSTGRES_DB || 'legal_ai_db',
    user: process.env.POSTGRES_USER || 'legal_admin',
    password: process.env.POSTGRES_PASSWORD || '123456',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || String(getServicePortWithFallback('redis', 6379)), 10),
    db: 0,
    keyPrefix: 'legal-ai:',
  },
};

// ===== DATABASE CONNECTION =====
const pgConnection = postgres({
  host: services.postgres.host,
  port: services.postgres.port,
  database: services.postgres.database,
  user: services.postgres.user,
  password: services.postgres.password,
  max: 20,
  idle_timeout: 10_000,
  connect_timeout: 10_000,
} as any);
export const db = drizzle(pgConnection as any, {
  schema: { legalDocuments, autoSolveResults, synthesisCache },
});

// ===== REDIS CONNECTION =====
let redis: Redis | null = null;
try {
  redis = new Redis({
    host: services.redis.host,
    port: services.redis.port,
    db: services.redis.db,
    keyPrefix: services.redis.keyPrefix,
    maxRetriesPerRequest: 1, // fail fast
    connectTimeout: 5000,
  });
  // non-throwing observation handlers
  redis.on('error', err => logger.warn('[Redis] error', err));
  redis.on('connect', () => logger.info('[Redis] connected'));
} catch (e) {
  logger.warn('Redis initialization failed, continuing without Redis:', e);
  redis = null;
}

// --- runtime-safe fetch helper (works in Node without global fetch) ---
async function getFetch(): Promise<typeof fetch> {
  if (typeof fetch !== 'undefined') return fetch;
  try {
    const mod = await import('node-fetch');
    return (mod.default ?? mod) as unknown as typeof fetch;
  } catch (e) {
    // try undici as a secondary fallback
    try {
      const undici = await import('undici');
      if (typeof undici.fetch === 'function') return undici.fetch as unknown as typeof fetch;
    } catch (e2) {
      logger.error('[Orchestrator] fetch not available and polyfills failed', e2);
    }
    logger.error('[Orchestrator] fetch not available and node-fetch import failed', e);
    throw new Error('Fetch API is not available');
  }
}

// ===== UTILITY FUNCTIONS =====
function generateCacheKey(query: string): string {
  return createHash('sha256').update(query).digest('hex');
}
function calculateJaccardSimilarity(textA: string, textB: string): number {
  const a = (textA || '').toLowerCase().split(/\s+/).filter(Boolean);
  const b = (textB || '').toLowerCase().split(/\s+/).filter(Boolean);
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
  const union = new Set([...Array.from(setA), ...Array.from(setB)]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}
function applyMMR(documents: any[], lambda = 0.7, maxSelected = 10): any[] {
  if (!documents || documents.length <= 1) return documents;
  const selected: any[] = [documents[0]];
  const remaining = documents.slice(1);
  while (remaining.length > 0 && selected.length < maxSelected) {
    let bestScore = -Infinity;
    let bestIndex = -1;
    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.crossEncoderScore || 0;
      let maxSim = 0;
      for (const s of selected) {
        const sim = calculateJaccardSimilarity(
          cand.pageContent || cand.content || cand.text || '',
          s.pageContent || s.content || s.text || ''
        );
        if (sim > maxSim) maxSim = sim;
      }
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = i;
      }
    }
    if (bestIndex >= 0) {
      selected.push(remaining.splice(bestIndex, 1)[0]);
    } else {
      break;
    }
  }
  return selected;
}

// Add small typed shapes used by the prompt builder
type LegalBertEntity = { text?: string };
type LegalBertConcept = { concept?: string };
type LegalBertAnalysis = {
  entities?: LegalBertEntity[];
  concepts?: LegalBertConcept[];
  complexity?: { legalComplexity?: number };
  jurisdiction?: string;
};
type RankedSource = {
  metadata?: { title?: string };
  pageContent?: string;
  content?: string;
  text?: string;
  crossEncoderScore?: number;
  score?: number;
};
type EnhancedPromptInput = {
  query?: string;
  legalBertAnalysis?: LegalBertAnalysis | null;
  rankedResults?: RankedSource[] | null;
  context7Docs?: unknown;
  goLlamaResponse?: unknown;
};

// ===== ORCHESTRATOR CLASS (simplified, robust pipeline) =====
export class EnhancedAISynthesisOrchestrator {
  private neo4jStore: InstanceType<typeof Neo4jVectorStore> | null = null;
  private pgVectorStore: InstanceType<typeof PGVectorStore> | null = null;
  private ollama!: ChatOllama;
  private embeddings!: OllamaEmbeddings;
  private initialized = false;

  constructor() {
    // initialization deferred to be async-safe
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    logger.info('[Orchestrator] Initializing...');
    try {
      await initializeDynamicPorts();
      // initialize Ollama / embeddings
      this.ollama = new ChatOllama({
        baseUrl: services.ollama.baseUrl,
        model: services.ollama.models.legal,
        temperature: 0.3,
        format: 'json',
      } as any);
      this.embeddings = new OllamaEmbeddings({
        baseUrl: services.ollama.baseUrl,
        model: services.ollama.models.embedding,
      } as any);

      // Try to initialize vector stores (best-effort)
      try {
        // instantiate Neo4jVectorStore defensively (constructor signatures vary across versions)
        this.neo4jStore = new (Neo4jVectorStore as any)(this.embeddings, {
          url: services.neo4j.uri,
          username: services.neo4j.user,
          password: services.neo4j.password,
          indexName: 'legal_documents',
        });
      } catch (e) {
        this.neo4jStore = null;
        logger.warn('[Orchestrator] Neo4j init failed:', e);
      }

      try {
        const pgConfig: PoolConfig = {
          host: services.postgres.host,
          port: services.postgres.port,
          database: services.postgres.database,
          user: services.postgres.user,
          password: services.postgres.password,
          max: 20,
        };
        this.pgVectorStore = new (PGVectorStore as any)(this.embeddings, {
          postgresConnectionOptions: pgConfig,
          tableName: 'legal_documents',
          columns: {
            idColumnName: 'id',
            vectorColumnName: 'embedding',
            contentColumnName: 'content',
            metadataColumnName: 'metadata',
          },
          distanceStrategy: 'cosine',
        });
      } catch (e) {
        this.pgVectorStore = null;
        logger.warn('[Orchestrator] PGVector init failed:', e);
      }

      // Ensure index exists - best effort
      try {
        await pgConnection`
          CREATE INDEX IF NOT EXISTS idx_legal_documents_embedding
          ON legal_documents USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100);
        `;
      } catch (e) {
        logger.debug('[Orchestrator] ensure index failed', e);
      }

      this.initialized = true;
      logger.info('[Orchestrator] Initialized');
    } catch (err) {
      logger.error('[Orchestrator] Initialization error:', err);
      throw err;
    }
  }

  // --- Small helper wrappers around external pieces ---
  private async checkCache(query: string): Promise<{ hit: boolean; data?: any; source?: 'redis' | 'db' }> {
    const key = generateCacheKey(query);
    if (redis) {
      try {
        const r = await redis.get(key);
        if (r) {
          // parse safely
          let parsed: any = null;
          try {
            parsed = JSON.parse(r);
          } catch (e) {
            logger.debug('[Cache] Redis JSON parse failed, ignoring redis value', e);
            parsed = null;
          }
          // Best-effort: increment DB hit counter if row exists so DB reflects hits
          try {
            const rows = await db.select().from(synthesisCache).where(eq(synthesisCache.queryHash, key)).limit(1);
            if (rows && (rows as any[]).length > 0) {
              const hitRow = (rows as any[])[0];
              await db
                .update(synthesisCache)
                .set({
                  hitCount: sql`${synthesisCache.hitCount} + 1`,
                  lastAccessed: new Date(),
                })
                .where(eq(synthesisCache.id, hitRow.id));
            }
          } catch (e) {
            logger.debug('[Cache] best-effort DB hit increment failed', e);
          }
          return { hit: true, data: parsed, source: 'redis' };
        }
      } catch (e) {
        logger.debug('[Cache] Redis read failed', e);
      }
    }
    const rows = await db.select().from(synthesisCache).where(eq(synthesisCache.queryHash, key)).limit(1);
    if (rows && (rows as any[]).length > 0) {
      const hit = (rows as any[])[0];
      // Update hit / lastAccessed
      await db
        .update(synthesisCache)
        .set({
          hitCount: sql`${synthesisCache.hitCount} + 1`,
          lastAccessed: new Date(),
        })
        .where(eq(synthesisCache.id, hit.id));
      if (redis) {
        try {
          await redis.setex(key, 3600, JSON.stringify(hit.result));
        } catch (e) {
          logger.debug('[Cache] Redis setex failed', e);
        }
      }
      return { hit: true, data: hit.result, source: 'db' };
    }
    return { hit: false };
  }

  private async analyzeWithLegalBERT(query: string) {
    try {
      return await legalBERT.analyzeLegalText(query);
    } catch (e) {
      logger.warn('[LegalBERT] analysis failed, using fallback', e);
      return { entities: [], concepts: [], complexity: { legalComplexity: 0.5 } };
    }
  }

  private async generateNomicEmbeddings(query: string) {
    try {
      return await this.embeddings.embedQuery(query);
    } catch (e) {
      logger.warn('[Embeddings] failed:', e);
      return null;
    }
  }

  private async searchNeo4j(query: string, limit = 10) {
    if (!this.neo4jStore) return [];
    try {
      return await this.neo4jStore.similaritySearch(query, limit);
    } catch (e) {
      logger.warn('[Neo4j] search failed:', e);
      return [];
    }
  }

  private async searchPGVector(query: string, limit = 10) {
    if (!this.pgVectorStore) return [];
    try {
      const res = await this.pgVectorStore.similaritySearch(query, limit);
      return (res || []).map((d: any, i: number) => ({ ...d, score: 1.0 - i * 0.1 }));
    } catch (e) {
      logger.warn('[PGVector] search failed:', e);
      return [];
    }
  }

  private async runEnhancedRAGPipeline(input: { query: string; embeddings?: any }) {
    try {
      const fetchImpl = await getFetch();
      const response = await fetchImpl(`${services.goMicroservice.enhancedRAG}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input.query,
          limit: 10,
          useGPU: true,
          embedding: input.embeddings || null,
        }),
      });
      if (!response.ok) throw new Error('enhancedRAG failed');
      return await response.json();
    } catch (e) {
      logger.warn('[EnhancedRAG] pipeline failed', e);
      return { documents: [] };
    }
  }

  private async runGoLlamaPipeline(input: { query: string; legalBertAnalysis?: any }) {
    try {
      const fetchImpl = await getFetch();
      const response = await fetchImpl(`${services.goMicroservice.enhancedRAG}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3-legal:latest',
          prompt: input.query,
          context: input.legalBertAnalysis,
          temperature: 0.3,
          max_tokens: 2000,
          stream: false,
        }),
      });
      if (response.ok) {
        const result = await response.json();
        return result.response ?? result;
      }
    } catch (e) {
      logger.warn('[Go-Llama] unavailable', e);
    }
    return null;
  }

  private async rankWithCrossEncoder(context: any) {
    const all = [
      ...(context.neo4jResults || []),
      ...(context.pgVectorResults || []),
      ...((context.ragResults && context.ragResults.documents) || []),
    ];
    const ranked: any[] = [];
    for (const r of all) {
      try {
        const text = r.pageContent || r.content || r.text || '';
        const sim = await legalBERT.calculateLegalSimilarity(context.query, text);
        ranked.push({
          ...r,
          crossEncoderScore: sim.similarity || 0,
          legalRelevance: sim.legalRelevance || sim.confidence || 0.5,
        });
      } catch {
        ranked.push({ ...r, crossEncoderScore: 0.0, legalRelevance: 0.0 });
      }
    }
    const sorted = ranked.sort((a, b) => (b.crossEncoderScore || 0) - (a.crossEncoderScore || 0));
    return applyMMR(sorted, 0.7);
  }

  private async enhanceWithContext7(context: any) {
    try {
      const fetchImpl = await getFetch();
      const response = await fetchImpl(`${services.context7}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: context.query,
          context: context.legalBertAnalysis,
          includeLibraries: ['langchain', 'drizzle-orm', 'xstate', 'neo4j'],
          maxTokens: 5000,
        }),
      });
      if (response.ok) return await response.json();
    } catch (e) {
      logger.warn('[Context7] enhancement failed', e);
    }
    return null;
  }

  private async generateWithGemma3Legal(input: any) {
    const prompt = buildEnhancedPrompt(input);
    // Try GPU orchestrator
    try {
      const fetchImpl = await getFetch();
      const gpuResp = await fetchImpl(`${services.goMicroservice.gpuOrchestrator}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3-legal:latest',
          prompt,
          useGPU: true,
          workers: 8,
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });
      if (gpuResp.ok) {
        const res = await gpuResp.json();
        return res.response ?? res;
      }
    } catch (e) {
      logger.debug('[GPU Orchestrator] fallback to ollama', e);
    }
    // Fallback to Ollama
    try {
      const fetchImpl2 = await getFetch();
      const resp = await fetchImpl2(`${services.ollama.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: services.ollama.models.legal, prompt, stream: false }),
      });
      if (resp.ok) {
        const r = await resp.json();
        return r.response ?? r;
      }
    } catch (e) {
      logger.warn('[Ollama] generation failed', e);
    }
    throw new Error('Generation failed');
  }

  private async performFinalSynthesis(input: any) {
    return aiAssistantSynthesizer.synthesizeInput({
      query: input.query,
      context: {
        legalBertAnalysis: input.legalBertAnalysis,
        userId: input.userId || 'default',
      },
      options: {
        enableMMR: true,
        enableCrossEncoder: true,
        enableLegalBERT: true,
        enableRAG: true,
        maxSources: 10,
        similarityThreshold: 0.7,
        diversityLambda: 0.3,
      },
    });
  }

  private async cacheResult(query: string, finalSynthesis: any, perfStart: number) {
    const key = generateCacheKey(query);
    const metadata = {
      processingTime: Date.now() - perfStart,
      servicesUsed: ['neo4j', 'pgvector', 'enhanced-rag', 'ollama'],
      confidence: finalSynthesis?.metadata?.confidence ?? null,
    };
    if (redis) {
      try {
        await redis.setex(key, 3600, JSON.stringify(finalSynthesis));
      } catch (e) {
        logger.debug('[Cache] Redis setex failed', e);
      }
    }
    try {
      await db.insert(synthesisCache).values({
        queryHash: key,
        result: finalSynthesis,
        metadata,
        hitCount: 1,
        lastAccessed: new Date(),
      });
    } catch (e: any) {
      // If insert failed (likely unique constraint), attempt an update as a fallback (upsert-like)
      logger.debug('[Cache] DB write failed, attempting update fallback', e?.message ?? e);
      try {
        await db
          .update(synthesisCache)
          .set({
            result: finalSynthesis,
            metadata,
            hitCount: sql`${synthesisCache.hitCount} + 1`,
            lastAccessed: new Date(),
          })
          .where(eq(synthesisCache.queryHash, key));
      } catch (e2) {
        logger.debug('[Cache] DB upsert fallback failed', e2);
      }
    }
  }

  // ===== PUBLIC API =====
  async process(query: string, options?: Record<string, any>): Promise<any> {
    await this.initialize();
    const perfStart = Date.now();
    logger.info(`[Orchestrator] Processing query: "${query}"`);
    // 1) Cache
    const cache = await this.checkCache(query);
    if (cache.hit) {
      logger.info('[Orchestrator] Cache hit', { query, source: cache.source });
      // Attach lightweight metadata and clone to avoid mutation of stored object
      const result = cache.data && typeof cache.data === 'object' ? JSON.parse(JSON.stringify(cache.data)) : cache.data;
      const enriched = {
        ...result,
        _cached: true,
        _cacheSource: cache.source ?? 'unknown',
        _cachedAt: new Date().toISOString(),
      };
      // Best-effort monitoring emit
      try {
        if (typeof monitoringService?.record === 'function') {
          monitoringService.record('cache_hit', { query, source: cache.source, elapsedMs: Date.now() - perfStart });
        } else if (typeof monitoringService?.increment === 'function') {
          monitoringService.increment('cache_hits');
        }
      } catch (e) {
        logger.debug('[Monitoring] record/increment failed', e);
      }
      return enriched;
    }
    // 2) LegalBERT analysis
    const legalBertAnalysis = await this.analyzeWithLegalBERT(query);
    // 3) Embeddings
    const embedding = await this.generateNomicEmbeddings(query);
    // 4) Parallel searches (best-effort)
    const [neo4jResults, pgVectorResults, ragResults, goLlamaResponse] = await Promise.all([
      this.searchNeo4j(query),
      this.searchPGVector(query),
      this.runEnhancedRAGPipeline({ query, embeddings: embedding }),
      this.runGoLlamaPipeline({ query, legalBertAnalysis }),
    ]);
    // 5) Ranking
    const ranked = await this.rankWithCrossEncoder({
      query,
      neo4jResults,
      pgVectorResults,
      ragResults,
    });
    // 6) Context7 augmentation
    const context7Docs = await this.enhanceWithContext7({ query, legalBertAnalysis });
    // 7) Generate response
    const generation = await this.generateWithGemma3Legal({
      query,
      legalBertAnalysis,
      rankedResults: ranked,
      context7Docs,
      goLlamaResponse,
    });
    // 8) Final synthesis
    const finalSynthesis = await this.performFinalSynthesis({
      query,
      legalBertAnalysis,
      generation,
      rankedResults: ranked,
      context7Docs,
    });
    // 9) Cache
    await this.cacheResult(query, finalSynthesis, perfStart);
    // 10) Record autosolve_results (best-effort)
    try {
      await db.insert(autoSolveResults).values({
        query,
        solution: finalSynthesis,
        confidence: finalSynthesis?.confidence_score ?? finalSynthesis?.metadata?.confidence ?? null,
        processingTime: Date.now() - perfStart,
        serviceUsed: 'enhanced-orchestrator',
        success: true,
      });
    } catch (e) {
      logger.debug('[Orchestrator] autosolve_results insert failed', e);
    }
    return finalSynthesis;
  }

  async health(): Promise<any> {
    await this.initialize().catch(() => {});
    return {
      status: this.initialized ? 'healthy' : 'initializing',
      services: {
        postgres: await this.checkPostgres(),
        redis: await this.checkRedis(),
        neo4j: this.neo4jStore !== null,
        pgVector: this.pgVectorStore !== null,
        ollama: await this.checkOllama(),
        enhancedRAG: await this.checkService(services.goMicroservice.enhancedRAG),
        gpuOrchestrator: await this.checkService(services.goMicroservice.gpuOrchestrator),
        context7: await this.checkService(services.context7),
      },
    };
  }

  private async checkPostgres(): Promise<boolean> {
    try {
      await pgConnection`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
  private async checkRedis(): Promise<boolean> {
    try {
      if (!redis) return false;
      await redis.set('health-check', 'ok', 'EX', 1);
      return true;
    } catch {
      return false;
    }
  }
  private async checkOllama(): Promise<boolean> {
    try {
      const fetchImpl = await getFetch();
      const response = await fetchImpl(`${services.ollama.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  private async checkService(url: string): Promise<boolean> {
    try {
      const fetchImpl = await getFetch();
      const response = await fetchImpl(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Helper prompt builder left mostly unchanged but cleaned
function buildEnhancedPrompt(input: EnhancedPromptInput): string {
  // defensive generic helpers (avoid any)
  const safeArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const safeJoin = <T>(arr: unknown, mapFn?: (x: T) => string) =>
    safeArray<T>(arr)
      .map(mapFn ?? ((x: T) => String(x)))
      .filter(Boolean)
      .join(', ');

  let prompt = `You are an expert legal AI assistant using gemma3-legal:latest with access to comprehensive legal knowledge.
QUERY: ${String(input?.query ?? '')}
`;
  if (input?.legalBertAnalysis) {
    const entitiesStr = safeJoin<LegalBertEntity>(input.legalBertAnalysis.entities, e => e?.text ?? '');
    const conceptsStr = safeJoin<LegalBertConcept>(input.legalBertAnalysis.concepts, c => c?.concept ?? '');
    const complexity = input.legalBertAnalysis?.complexity?.legalComplexity ?? 0;
    const jurisdiction = input.legalBertAnalysis?.jurisdiction ?? 'General';

    prompt += `LEGAL ANALYSIS:
- Identified Entities: ${entitiesStr}
- Legal Concepts: ${conceptsStr}
- Complexity Score: ${complexity}
- Jurisdiction: ${jurisdiction}
`;
  }
  if (Array.isArray(input?.rankedResults) && input.rankedResults.length > 0) {
    prompt += `RELEVANT LEGAL SOURCES:\n`;
    (input.rankedResults as RankedSource[]).slice(0, 5).forEach((source, i) => {
      const title = source?.metadata?.title || `Document ${i + 1}`;
      const content = String(source?.pageContent ?? source?.content ?? source?.text ?? '').substring(0, 500);
      const relevance =
        typeof source?.crossEncoderScore === 'number'
          ? source.crossEncoderScore
          : typeof source?.score === 'number'
            ? source.score
            : 0;
      prompt += `\n${i + 1}. ${title} (Relevance: ${(relevance * 100).toFixed(1)}%)\n${content}...\n`;
    });
  }
  if (input?.context7Docs) {
    prompt += `\nTECHNICAL DOCUMENTATION:\n${String(JSON.stringify(input.context7Docs || {})).substring(0, 1000)}...\n`;
  }
  if (input?.goLlamaResponse) {
    prompt += `\nADDITIONAL ANALYSIS:\n${String(input.goLlamaResponse).substring(0, 500)}...\n`;
  }
  prompt += `
INSTRUCTIONS:
1. Provide a comprehensive legal analysis addressing the query
2. Cite specific statutes, cases, or legal principles where applicable
3. Structure your response with clear sections
4. Include any important caveats or limitations
5. Recommend next steps or actions if appropriate
6. Distinguish between legal information and legal advice
7. Format the response in JSON with fields: summary, analysis, detailed_discussion, recommendations, caveats, confidence_score, sources_cited
RESPONSE:`;
  return prompt;
}

// Export singleton instance
export const orchestrator = new EnhancedAISynthesisOrchestrator();
export default orchestrator;
