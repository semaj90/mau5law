/**
 * Context-Aware AI Memory Service
 * This service manages the loading, updating, and retrieval of case-specific AI memory.
 * It defensively handles data from various sources (Redis, VectorSearchService, EvidenceGraphService)
 * to ensure robustness against missing data or schema inconsistencies.
 */
import { CONFIG } from '$lib/config/env.server';
import { redis } from '$lib/server/redis';
import { VectorSearchService } from '$lib/server/db/drizzle-vector-config';
import { evidenceGraphService } from '$lib/server/graph/evidence-graph-service'; // use exported instance
import type * as Types from './context-aware-ai-memory-types';
import { RabbitMQXStateIntegration } from '$lib/messaging/rabbitmq-xstate-integration'; // Import RabbitMQ integration
import { adaptiveIndexOrchestrator } from '$lib/services/adaptive-index-orchestrator';
import { aiAnalyticsService } from '$lib/services/ai-analytics-service';
import { db } from '$lib/server/db';

// --- Local narrow helper types (keep minimal and defensive) ---
type QdrantClient = {
  search?: (collection: string, body: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  upsert?: (collection: string, body: Record<string, unknown>) => Promise<void>;
};

type RedisLike = Partial<{
  zIncrBy: (key: string, increment: number, member: string) => Promise<number>;
  zAdd: (key: string, members: Array<{ score: number; value: string }>) => Promise<number>;
  zRangeWithScores: (key: string, start: number, stop: number) => Promise<Array<{ value?: string; score?: number }>>;
  zRevRangeWithScores: (key: string, start: number, stop: number) => Promise<Array<{ value?: string; score?: number }>>;
  zRange: (key: string, start: number, stop: number) => Promise<string[]>;
  zScore: (key: string, member: string) => Promise<number | null>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, opts?: Record<string, unknown>) => Promise<void>;
}>;

type RabbitMQIntegrationLike = Partial<{
  publishEvent: (event: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
  publish: (event: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
  send: (event: string, payload: Record<string, unknown>) => Promise<unknown> | unknown;
}>;

type VectorServiceLike = Partial<{
  search: (embedding: number[], threshold?: number, limit?: number, caseNum?: number) => Promise<Array<Record<string, unknown>>>;
  searchAll: (caseIds: string[], threshold?: number, limit?: number) => Promise<Array<Record<string, unknown>>>;
  searchDocuments: (embedding: number[], caseNum?: number) => Promise<Array<Record<string, unknown>>>;
  searchEvidence: (args: unknown[], caseNum?: number) => Promise<Array<Record<string, unknown>>>;
  upsertDocument: (payload: Record<string, unknown>) => Promise<unknown>;
  upsert: (payload: Record<string, unknown>) => Promise<unknown>;
}>;


// Placeholder for the expected payload structure for VectorSearchService.upsertDocument
// This should align with your Drizzle schema for embeddings.
interface DocumentEmbeddingPayload {
  id: string; // Unique ID for the document/evidence
  caseId: string;
  type: 'document' | 'evidence';
  title: string;
  content: string; // The original text that was embedded
  embedding: number[]; // The vector embedding
  timestamp: string;
  [key: string]: any;
}

export class ContextAwareAIMemoryService {
  private memoryCache = new Map<string, Types.CaseContextMemory>();
  private readonly MEMORY_RETENTION_DAYS = 30;
  private graph = evidenceGraphService; // use exported instance (may be a no-op stub in tests)
  private qdrantClient: QdrantClient; // lightweight resilient client wrapper

  // add a narrow type for allowed visualizations
  private typeAllowedVisualizations = undefined as unknown as ('memory_palace' | 'skill_tree' | 'inventory_system' | 'character_sheet');

  constructor() {
    const cfg = CONFIG as unknown as Record<string, unknown>;
    const baseUrl = String(cfg.QDRANT_URL ?? cfg.QDRANT_ENDPOINT ?? 'http://localhost:6333');
    this.qdrantClient = {
      search: async (collection: string, body: Record<string, unknown>) => {
        try {
          const url = `${baseUrl.replace(/\/$/, '')}/collections/${collection}/points/search`;
          const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const json = await res.json().catch(() => ({} as Record<string, unknown>));
          return (json?.result as Array<Record<string, unknown>> | undefined) ?? [];
        } catch (e) { console.debug('qdrant.search fallback error', e); return []; }
      },
      upsert: async (collection: string, body: Record<string, unknown>) => {
        try {
          const url = `${baseUrl.replace(/\/$/, '')}/collections/${collection}/points?wait=true`;
          await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } catch (e) { console.debug('qdrant.upsert fallback error', e); }
      }
    } as QdrantClient;
  }

  private ensureGraph() {
    return this.graph;
  }

  // PUBLIC API
  async loadCaseMemory(caseId: string, consoleTheme = 'n64'): Promise<Types.CaseContextMemory> {
    const cached = this.memoryCache.get(caseId);
    if (cached && this.isMemoryFresh(cached)) return cached;

    try {
      const rclient = redis as unknown as RedisLike;
  const raw = await rclient.get?.(`case:memory:${caseId}`) ?? await (redis as unknown as RedisLike).get?.(`case:memory:${caseId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Types.CaseContextMemory;
        if (this.isMemoryFresh(parsed)) {
          this.memoryCache.set(caseId, parsed);
          return parsed;
        }
      }
    } catch (e: unknown) {
      console.debug('redis.get failed for case memory', caseId, e);
    }

    const built = await this.buildCaseMemory(caseId, consoleTheme);
    this.memoryCache.set(caseId, built);
    try { await redis.set(`case:memory:${caseId}`, JSON.stringify(built)); } catch (e: unknown) { /* ignore */ }
    return built;
  }

  async getContextualAIResponse(caseId: string, userQuery: string, consoleTheme = 'n64'): Promise<Types.AIResponse> {
    const memory = await this.loadCaseMemory(caseId, consoleTheme);
    const contextItems = await this.findRelevantContext(userQuery, memory);

    try {
      const topkKey = `topk:case:${caseId}`;
      const rclient = redis as unknown as RedisLike;
      for (const it of contextItems) {
        const member = `${it.type}:${it.id}`;
        if (typeof rclient.zIncrBy === 'function') {
          await rclient.zIncrBy(topkKey, 1, member).catch(() => { });
        } else if (typeof (redis as unknown as RedisLike).zAdd === 'function') {
          await ((redis as unknown as RedisLike).zAdd as Function)(topkKey, [{ score: 1, value: member }]).catch(() => { });
        }
      }
    } catch (e: unknown) {
      console.debug('Redis Top-K increment failed', e);
    }

    const prompt = this.buildContextualPrompt(userQuery, contextItems, memory);
    const aiResult = await this.callContextualAI(prompt, memory);

    const convo: Types.AIConversation = {
      timestamp: new Date().toISOString(),
      userQuery,
      aiResponse: aiResult.text,
      contextUsed: contextItems.map(c => `${c.type}:${c.id}`),
      confidenceScore: aiResult.confidence,
      followUpSuggestions: aiResult.suggestions ?? [],
    };
  memory.aiMemory = memory.aiMemory ?? ({} as unknown as Types.CaseContextMemory['aiMemory']);
    memory.aiMemory.conversationHistory = memory.aiMemory.conversationHistory || [];
    memory.aiMemory.conversationHistory.push(convo);
    memory.lastUpdated = new Date().toISOString();
    memory.contextVersion = (memory.contextVersion || 0) + 1;
    await this.updateMemory(memory).catch(() => { });

    return {
      response: aiResult.text,
      confidence: aiResult.confidence,
      contextUsed: contextItems.map(c => c.id),
      suggestions: aiResult.suggestions ?? [],
      gameElements: this.generateResponseGameElements(aiResult, consoleTheme),
    };
  }

  async updateMemoryWithNewEvidence(caseId: string, evidenceId: string, evidenceContent: string, evidenceTitle: string = 'New Evidence'): Promise<void> {
    const mem = await this.loadCaseMemory(caseId);
    mem.evidenceTimeline = mem.evidenceTimeline || [];
    mem.evidenceTimeline.push({
      evidenceId,
      timestamp: new Date().toISOString(),
      eventType: 'added',
      significance: 5,
      contextualNotes: 'New evidence',
      relatedEvidence: [],
    });
    mem.lastUpdated = new Date().toISOString();
    mem.contextVersion = (mem.contextVersion || 0) + 1;

    try {
      const graph = this.ensureGraph();
      const graphLocal = graph as unknown as { buildRelationships?: (caseId: string, evidenceTimeline: Types.EvidenceTimelineEntry[], documentMap: Types.DocumentMemory[]) => Promise<any[]> };
      if (typeof graphLocal.buildRelationships === 'function') {
        const rels = await graphLocal.buildRelationships(caseId, mem.evidenceTimeline, mem.documentMap || []);
        mem.relationshipGraph = mem.relationshipGraph || [];
        mem.relationshipGraph.push(...(Array.isArray(rels) ? rels : []));
      }
    } catch (e: unknown) {
      console.debug('graph build skipped', e);
    }

    await this.updateMemory(mem).catch(() => { });

    try {
      await this.publishToRabbit('document_ingestion', {
        caseId,
        evidenceId,
        timestamp: new Date().toISOString(),
        source: 'ContextAwareAIMemoryService',
      });
    } catch (e: unknown) {
      console.error('Failed to publish document_ingestion event to RabbitMQ', e);
    }

    try {
      await this.processAndStoreEmbedding({
        id: evidenceId,
        caseId,
        type: 'evidence',
        text: evidenceContent,
        title: evidenceTitle,
        metadata: {
          significance: 5,
          contextualNotes: 'New evidence',
        }
      });
    } catch (e: unknown) {
      console.error('Failed to process and store embedding for new evidence:', e);
    }
  }

  // INTERNAL ----------------------------------------------------------------

  private async buildCaseMemory(caseId: string, consoleTheme: string): Promise<Types.CaseContextMemory> {
    try {
      const [caseProfile, evidenceTimeline, documentMap] = await Promise.all([
        this.loadCaseProfile(caseId),
        this.loadEvidenceTimeline(caseId),
        this.loadDocumentMemory(caseId),
      ]);
      const graph = this.ensureGraph();
      let relationshipGraph: Types.ContextRelationship[] = [];
      try {
        const graphLocal = graph as unknown as { buildRelationships?: (caseId: string, evidenceTimeline: Types.EvidenceTimelineEntry[], documentMap: Types.DocumentMemory[]) => Promise<any[]> };
        if (typeof graphLocal.buildRelationships === 'function') {
          relationshipGraph = (await graphLocal.buildRelationships(caseId, evidenceTimeline, documentMap)) || [];
        }
      } catch (e: unknown) {
        relationshipGraph = [];
      }

      const aiMemory = await this.generateAIMemory(caseId, evidenceTimeline, documentMap, []);
      const gameMemory = this.generateGameMemory(caseProfile, evidenceTimeline, documentMap, consoleTheme);

      return {
        caseId,
        contextVersion: 1,
        lastUpdated: new Date().toISOString(),
        caseProfile,
        evidenceTimeline,
        documentMap,
        relationshipGraph,
        aiMemory,
        gameMemory,
      } as Types.CaseContextMemory;
    } catch (e: unknown) {
      return this.createEmptyMemory(caseId, consoleTheme);
    }
  }

  private isMemoryFresh(memory: Types.CaseContextMemory): boolean {
    try {
      const ageMs = Date.now() - new Date(memory.lastUpdated).getTime();
      const maxMs = this.MEMORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      return ageMs < maxMs;
    } catch (e: unknown) {
      return false;
    }
  }

  private async updateMemory(memory: Types.CaseContextMemory): Promise<void> {
    try {
      await redis.set(`case:memory:${memory.caseId}`, JSON.stringify(memory));
    } catch (e: unknown) {
      console.debug('Redis update failed', e);
    }
    this.memoryCache.set(memory.caseId, memory);
    try {
      await this.publishToRabbit('memory.updated', { caseId: memory.caseId, version: memory.contextVersion });
    } catch (e: unknown) {
      console.error('Failed to publish memory.updated event to RabbitMQ', e);
    }
  }

  // External loaders (defensive wrappers)
  private async loadCaseProfile(caseId: string): Promise<Types.CaseProfile> {
    try {
      const results: unknown =
        typeof VectorSearchService.searchAll === 'function'
          ? await VectorSearchService.searchAll([caseId], 0.9, 1)
          : [];
      const r = Array.isArray(results) ? (results[0] ?? {}) : (results as Partial<Record<string, unknown>> ?? {});
      return {
        title: this.extractString(r, 'title') ?? `Case ${caseId}`,
        description: this.extractString(r, 'description') ?? '',
        status: this.extractString(r, 'status') ?? 'active',
        priority: this.extractString(r, 'priority') ?? 'normal',
        keyPersons: this.normalizeStringArray(r, 'keyPersons', 'key_persons'),
        legalIssues: this.normalizeStringArray(r, 'legalIssues', 'legal_issues'),
        jurisdiction: this.extractString(r, 'jurisdiction') ?? 'N/A',
        importantDates: [],
        caseStrategy: [],
      } as Types.CaseProfile;
    } catch (e: unknown) {
      return this.createEmptyMemory(caseId, 'n64').caseProfile;
    }
  }

  private async loadEvidenceTimeline(caseId: string): Promise<Types.EvidenceTimelineEntry[]> {
    try {
      const caseNum = this.parseCaseIdToNumber(caseId);
      const raw: unknown =
        typeof VectorSearchService.searchEvidence === 'function'
          ? await VectorSearchService.searchEvidence([], caseNum)
          : [];
      const arr = Array.isArray(raw) ? raw as Partial<Record<string, unknown>>[] : [];
      return arr.map((e, i) => ({
        evidenceId: this.extractString(e, 'id', 'evidenceId') ?? String(i),
        timestamp: this.extractDateString(e, 'createdAt', 'created_at'),
        eventType: 'added',
        significance: this.extractNumber(e, 'relevanceScore', 'relevance_score') ? Math.max(1, Math.min(10, Math.round((this.extractNumber(e, 'relevanceScore', 'relevance_score') as number) / 10))) : 5,
        contextualNotes: this.extractString(e, 'description', 'notes') ?? 'Evidence',
        relatedEvidence: [],
      } as Types.EvidenceTimelineEntry));
    } catch (e: unknown) {
      return [];
    }
  }

  private async loadDocumentMemory(caseId: string): Promise<Types.DocumentMemory[]> {
    try {
      const caseNum = this.parseCaseIdToNumber(caseId);
      const raw: unknown =
        typeof VectorSearchService.searchDocuments === 'function'
          ? await VectorSearchService.searchDocuments([], caseNum)
          : [];
      const arr = Array.isArray(raw) ? raw as Partial<Record<string, unknown>>[] : [];
      return arr.map((d, i) => ({
        documentId: this.extractString(d, 'id') ?? `doc_${i}`,
        title: this.extractString(d, 'title') ?? 'Untitled Document',
        processingStatus: this.extractString(d, 'processingStatus', 'processing_status') ?? 'completed',
        keyExtracts: [],
        aiSummary: this.extractString(d, 'content', 'summary') ?? 'Pending',
        relevanceToCase: this.extractNumber(d, 'relevanceScore', 'relevance') ?? 0.8,
        lastAnalyzed: this.extractDateString(d, 'updatedAt', 'updated_at'),
      } as Types.DocumentMemory));
    } catch (e: unknown) {
      return [];
    }
  }

  private async loadConversationHistory(caseId: string): Promise<Types.AIConversation[]> {
    const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let source: 'redis' | 'postgres' | 'cold' = 'cold';
    let conversations: Types.AIConversation[] = [];

    try {
      const cached = await redis.get(`conversation:${caseId}`);
      if (cached) {
        conversations = JSON.parse(cached) as Types.AIConversation[];
        source = 'redis';
        return conversations;
      }

      // Narrowed local type for db shape access (avoid 'any')
      type DrizzleDBLike = {
        schema?: Record<string, unknown> & { aiConversations?: unknown };
        aiConversations?: unknown;
        eq?: (...args: unknown[]) => unknown;
        desc?: (...args: unknown[]) => unknown;
      };
      const dbTyped = db as unknown as DrizzleDBLike;

      const rows = await db.select()
        .from(dbTyped.schema?.aiConversations ?? dbTyped.aiConversations)
        .where(typeof dbTyped.eq === 'function' ? (dbTyped.eq as Function)((dbTyped.schema?.aiConversations as Record<string, unknown> | undefined)?.caseId ?? 'caseId', caseId) : undefined)
        .limit(100)
        .orderBy(typeof dbTyped.desc === 'function' ? (dbTyped.desc as Function)((dbTyped.schema?.aiConversations as Record<string, unknown> | undefined)?.timestamp ?? 'timestamp') : undefined);

      if (rows && (rows as unknown) && (rows as Array<Record<string, unknown>>).length > 0) {
        const typedRows = rows as Array<Record<string, unknown>>;
        conversations = typedRows.map((row) => ({
          timestamp: (row.timestamp as string) ?? undefined,
          userQuery: (row.userQuery as string) ?? undefined,
          aiResponse: (row.aiResponse as string) ?? undefined,
          contextUsed: (Array.isArray(row.contextUsed) ? (row.contextUsed as string[]) : []),
          confidenceScore: typeof row.confidenceScore === 'number' ? row.confidenceScore as number : (typeof row.confidenceScore === 'string' ? Number(row.confidenceScore) : undefined),
          followUpSuggestions: Array.isArray(row.followUpSuggestions) ? row.followUpSuggestions as string[] : [],
        })) as Types.AIConversation[];
        source = 'postgres';
        await redis.set(`conversation:${caseId}`, JSON.stringify(conversations), { EX: 3600 }).catch(() => { });
        return conversations;
      }

      return [];
    } catch (e: unknown) {
      console.error('Failed to load conversation history:', e);
      return [];
    } finally {
      await aiAnalyticsService.publishEvent('memory.load', {
        caseId,
        source,
        latency: ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start,
        recordCount: conversations.length,
        memoryType: 'conversationHistory',
      }).catch(() => { });
    }
  }

  private async generateAIMemory(caseId: string, evidenceData: Types.EvidenceTimelineEntry[], documentData: Types.DocumentMemory[], conversationHistory: Types.AIConversation[]): Promise<Types.CaseContextMemory['aiMemory']> {
    const conv = Array.isArray(conversationHistory) ? conversationHistory : await this.loadConversationHistory(caseId);
    const evidenceArr = Array.isArray(evidenceData) ? evidenceData : [];
    const docArr = Array.isArray(documentData) ? documentData : [];
    return {
      conversationHistory: conv,
      learningPatterns: await this.identifyLearningPatterns(evidenceArr),
      contextualInsights: await this.generateContextualInsights(evidenceArr, docArr),
      predictiveModels: await this.buildPredictiveModels(caseId, evidenceArr),
    };
  }

  private generateGameMemory(_caseData: Types.CaseProfile, evidenceData: Types.EvidenceTimelineEntry[], documentData: Types.DocumentMemory[], consoleTheme: string): Types.CaseContextMemory['gameMemory'] {
    const evidenceCount = Array.isArray(evidenceData) ? evidenceData.length : 0;
    const documentCount = Array.isArray(documentData) ? documentData.length : 0;
    const totalItems = evidenceCount + documentCount;
    const experienceLevel = Math.min(100, totalItems * 2);
    return {
      consoleTheme,
      memoryVisualization: this.selectMemoryVisualization(consoleTheme),
      experienceLevel,
      memoryCapacity: totalItems,
      achievementUnlocked: this.calculateAchievements(experienceLevel, totalItems),
    };
  }

  private async findRelevantContext(query: string, memory: Types.CaseContextMemory): Promise<Types.ContextItem[]> {
    const relevantItems: Types.ContextItem[] = [];
    const caseNum = this.parseCaseIdToNumber(memory.caseId);

    const queryEmbedding = await this.embedTextWithOrchestrator(query);
    if (!queryEmbedding) {
      console.warn('Failed to generate embedding for query.');
      return [];
    }

    try {
      type VectorServiceLike = { search?: Function; searchAll?: Function };
      const vs = VectorSearchService as unknown as VectorServiceLike;
      const pgVectorResults = typeof vs.search === 'function'
        ? await (vs.search as Function)(queryEmbedding, 0.7, 5, caseNum)
        : (typeof vs.searchAll === 'function' ? await (vs.searchAll as Function)([memory.caseId], 0.7, 5) : []);
      const pgTyped = Array.isArray(pgVectorResults) ? pgVectorResults as Array<Record<string, unknown>> : [];
      pgTyped.forEach((r) => {
        if (r?.type === 'evidence') relevantItems.push({ type: 'evidence', id: String(r.id), data: r } as unknown as Types.ContextItem);
        else if (r?.type === 'document') relevantItems.push({ type: 'document', id: String(r.id), data: r } as unknown as Types.ContextItem);
      });
    } catch (e: unknown) {
      console.debug('pgvector search failed', e);
    }

    try {
      const qdrantCollection = (CONFIG as unknown as Record<string, unknown>).QDRANT_COLLECTION_NAME ?? 'legal_docs';
      const qdrantResults = await this.qdrantClient.search(qdrantCollection as string, {
        vector: queryEmbedding,
        limit: 5,
        score_threshold: 0.7,
      });
      const qdrantTyped = Array.isArray(qdrantResults) ? qdrantResults as Array<Record<string, unknown>> : [];
      qdrantTyped.forEach((r) => {
        const payload = (r?.payload ?? r) as Record<string, unknown>;
        if (payload?.type && payload?.id) {
          relevantItems.push({
            // cast to the ContextItem type-safe union
            type: String(payload.type) as unknown as Types.ContextItem['type'],
            id: String(payload.id),
            data: payload as Record<string, unknown>,
          } as Types.ContextItem);
        }
      });
    } catch (e: unknown) {
      console.debug('Qdrant search failed', e);
    }

    const evidenceTimeline = Array.isArray(memory?.evidenceTimeline) ? memory.evidenceTimeline : [];
    const documentMap = Array.isArray(memory?.documentMap) ? memory.documentMap : [];
    const contextualInsights = Array.isArray(memory?.aiMemory?.contextualInsights) ? memory.aiMemory.contextualInsights : [];

    evidenceTimeline.filter(e => (e?.significance ?? 0) >= 7).forEach(e => {
      if (!relevantItems.some(item => item.id === e.evidenceId && item.type === 'evidence')) {
        relevantItems.push({ type: 'evidence', id: e.evidenceId, data: e });
      }
    });
    documentMap.filter(d => (d?.relevanceToCase ?? 0) >= 0.7).forEach(d => {
      if (!relevantItems.some(item => item.id === d.documentId && item.type === 'document')) {
        relevantItems.push({ type: 'document', id: d.documentId, data: d });
      }
    });
    contextualInsights.filter(i => (i?.confidence ?? 0) >= 0.7).slice(0, 3).forEach((i, idx) => {
      const insightId = `insight:${idx}`;
      if (!relevantItems.some(item => item.id === insightId && item.type === 'insight')) {
        relevantItems.push({ type: 'insight', id: insightId, data: i });
      }
    });

    const uniqueItems = Array.from(new Map(relevantItems.map(item => [`${item.type}:${item.id}`, item])).values());
    return uniqueItems.slice(0, 10);
  }

  private async callContextualAI(prompt: string, memory: Types.CaseContextMemory) {
    try {
      const ollamaUrl = CONFIG.OLLAMA_URL?.replace(/\/+$/, '') ?? 'http://localhost:11434';
      const url = `${ollamaUrl}/api/generate`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3',
          prompt,
          context: memory.caseId,
          options: {
            temperature: 0.7,
            num_ctx: 2048,
          }
        }),
      });
      const data = await res.json().catch(() => ({}));
      return {
        text: (data?.response as string) ?? (data?.text as string) ?? 'AI service returned no content',
        confidence: typeof data?.confidence === 'number' ? data.confidence : 0.7,
        suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
        contextUsed: Array.isArray(data?.context) ? data.context : [],
      };
    } catch (e: unknown) {
      console.error('Ollama AI call failed:', e);
      return { text: 'AI call failed (stub response)', confidence: 0.5, suggestions: [], contextUsed: [] };
    }
  }

  private async embedTextWithOrchestrator(text: string): Promise<number[] | undefined> {
    try {
      const embedding = await adaptiveIndexOrchestrator.orchestrateEmbedding({
        id: `temp-query-${Date.now()}`,
        caseId: 'N/A',
        type: 'query',
        text,
        title: 'User Query Embedding',
      });
      if (!embedding) {
        console.warn('adaptiveIndexOrchestrator returned undefined embedding.');
        return undefined;
      }
      return embedding;
    } catch (err) {
      console.error('Failed to orchestrate embedding with adaptiveIndexOrchestrator:', err);
      return undefined;
    }
  }

  private buildContextualPrompt(query: string, ctx: Types.ContextItem[], memory: Types.CaseContextMemory): string {
    const caseTitle = memory.caseProfile?.title ?? memory.caseId;
    let contextString = `Case: ${caseTitle}\n\n`;
    ctx.forEach(item => {
      contextString += `  - Type: ${item.type}, ID: ${item.id}\n`;
      if (item.type === 'document' && (item.data as Types.DocumentMemory)?.aiSummary) {
        contextString += `    Summary: ${(item.data as Types.DocumentMemory).aiSummary}\n`;
      } else if (item.type === 'evidence' && (item.data as Types.EvidenceTimelineEntry)?.contextualNotes) {
        contextString += `    Notes: ${(item.data as Types.EvidenceTimelineEntry).contextualNotes}\n`;
      }
    });
    contextString += `\nUser Query:\n${query}\n\n`;
    return contextString;
  }

  private generateResponseGameElements(_ai: { confidence?: number } | null, theme: string): Types.GameElements {
    const confidence = _ai?.confidence ?? 0.5;
    return {
      confidenceDisplay: confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
      responseRarity: theme === 'n64' ? 'retro' : 'common',
      experienceGained: 1,
    };
  }

  // --- utilities ---
  private parseCaseIdToNumber(caseId: string): number {
    const n = Number((caseId || '').replace(/\D/g, '')) || 0;
    return Math.max(0, Math.floor(n));
  }

  private extractString(obj: Partial<Record<string, unknown>> | undefined, ...keys: string[]): string | undefined {
    if (!obj) return undefined;
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      if (typeof v === 'string' && v) return v;
      if (v instanceof Date) return v.toISOString();
      if (typeof v === 'number') return String(v);
    }
    return undefined;
  }

  private extractNumber(obj: Partial<Record<string, unknown>> | undefined, ...keys: string[]): number | undefined {
    if (!obj) return undefined;
    for (const k of keys) {
      const v = (obj as Record<string, unknown>)[k];
      if (typeof v === 'number' && !Number.isNaN(v)) return v;
      if (typeof v === 'string' && v.trim()) {
        const n = Number(v);
        if (!Number.isNaN(n)) return n;
      }
    }
    return undefined;
  }

  private extractDateString(obj: Partial<Record<string, unknown>> | undefined, ...keys: string[]): string {
    const s = this.extractString(obj, ...keys);
    if (s) return s;
    return new Date().toISOString();
  }

  private extractArray(obj: Partial<Record<string, unknown>> | undefined, ...keys: string[]): unknown[] | undefined {
    if (!obj) return undefined;
    for (const key of keys) {
      const v = (obj as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v;
    }
    return undefined;
  }

  private normalizeStringArray(obj: Partial<Record<string, unknown>> | undefined, ...keys: string[]): string[] {
    if (!obj) return [];
    for (const key of keys) {
      const arr = this.extractArray(obj, key);
      if (!arr) continue;
      const out: string[] = [];
      for (const it of arr as unknown[]) {
        if (typeof it === 'string') out.push(it);
        else if (typeof it === 'number' || typeof it === 'boolean') out.push(String(it));
      }
      return out;
    }
    return [];
  }

  private createEmptyMemory(caseId: string, consoleTheme = 'n64'): Types.CaseContextMemory {
    return {
      caseId,
      contextVersion: 1,
      lastUpdated: new Date().toISOString(),
      caseProfile: { title: `Case ${caseId}`, description: '', status: 'active', priority: 'normal', keyPersons: [] as unknown as Types.Person[], legalIssues: [] as unknown as Types.LegalIssue[], jurisdiction: 'N/A', importantDates: [], caseStrategy: [] },
      evidenceTimeline: [],
      documentMap: [],
      relationshipGraph: [],
      aiMemory: { conversationHistory: [], learningPatterns: [], contextualInsights: [], predictiveModels: [] },
      gameMemory: { consoleTheme, memoryVisualization: 'memory_palace', experienceLevel: 0, memoryCapacity: 0, achievementUnlocked: [] },
    } as Types.CaseContextMemory;
  }

  // Lightweight stubs for AI-related processing to keep compile-time safe
  private async identifyLearningPatterns(_evidence: Types.EvidenceTimelineEntry[]): Promise<any[]> { return []; }
  private async generateContextualInsights(_evidence: Types.EvidenceTimelineEntry[], _docs: Types.DocumentMemory[]): Promise<any[]> { return []; }
  private async buildPredictiveModels(_caseId: string, _evidence: Types.EvidenceTimelineEntry[]): Promise<any[]> { return []; }
  private selectMemoryVisualization(_theme: string): 'memory_palace' | 'skill_tree' | 'inventory_system' | 'character_sheet' {
    // Map known console/theme identifiers to the allowed visualization literals.
    // Default to 'memory_palace' for unknown themes.
    try {
      const theme = String(_theme || '').toLowerCase();
      if (theme.includes('n64') || theme.includes('retro') || theme === '') return 'memory_palace';
      if (theme.includes('skill') || theme.includes('tree') || theme.includes('rpg')) return 'skill_tree';
      if (theme.includes('inventory') || theme.includes('items') || theme.includes('shop')) return 'inventory_system';
      if (theme.includes('character') || theme.includes('sheet') || theme.includes('avatar')) return 'character_sheet';
      return 'memory_palace';
    } catch {
      return 'memory_palace';
    }
  }
  private calculateAchievements(_experienceLevel: number, _totalItems: number): string[] { return []; }

  // Defensive RabbitMQ publish helper (handles different integration shapes)
  private async publishToRabbit(event: string, payload: any) {
    try {
      const m = RabbitMQXStateIntegration as unknown as RabbitMQIntegrationLike;
      if (m && typeof m.publishEvent === 'function') return await m.publishEvent(event, payload);
      if (m && typeof m.publish === 'function') return await m.publish(event, payload);
      if (m && typeof m.send === 'function') return await m.send(event, payload);
      if (typeof RabbitMQXStateIntegration === 'function') {
        // If the integration exports a callable function, call it defensively
        const fn = RabbitMQXStateIntegration as unknown;
        if (typeof fn === 'function') return await (fn as Function)(event, payload);
      }
      console.debug('No publish method found on RabbitMQXStateIntegration');
    } catch (e) {
      console.error('Failed to publish to RabbitMQ (defensive helper)', e);
    }
  }

  // NEW: Method to process text, generate embeddings, and store in pgvector and Qdrant
  private async processAndStoreEmbedding(
    item: {
      id: string;
      caseId: string;
      type: 'document' | 'evidence';
      text: string;
      title: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const { id, caseId, type, text, title, metadata } = item;

    // 1. Orchestrate embedding using the AdaptiveIndexOrchestrator
    let embedding: number[] | undefined;
    try {
      embedding = await adaptiveIndexOrchestrator.orchestrateEmbedding({
        id,
        caseId,
        type,
        text,
        title,
        metadata,
      });
    } catch (err) {
      console.error('orchestrateEmbedding failed:', err);
      embedding = undefined;
    }

    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      console.warn(`No embedding generated for ${type} ${id}. Skipping storage.`);
      return;
    }

    const commonPayload = {
      id,
      caseId,
      type,
      title,
      content: text,
      timestamp: new Date().toISOString(),
      ...(metadata ?? {}),
    };

    // 2. Store in pgvector via Drizzle (VectorSearchService) - defensive
    try {
      const vs = VectorSearchService as unknown as VectorServiceLike;
      if (vs && typeof vs.upsertDocument === 'function') {
        await (vs.upsertDocument as Function)({
          ...commonPayload,
          embedding,
        });
        console.log(`Stored ${type} ${id} embedding in pgvector.`);
      } else if (vs && typeof vs.upsert === 'function') {
        await (vs.upsert as Function)({ ...commonPayload, vector: embedding });
        console.log(`Stored ${type} ${id} embedding via vs.upsert.`);
      } else {
        console.debug('No upsert handler on VectorSearchService - skipping pgvector store.');
      }
    } catch (e) {
      console.error(`Failed to store ${type} ${id} embedding in pgvector:`, e);
    }

    // 3. Store in Qdrant for semantic tagging and search - defensive wrapper
    try {
      const cfg = CONFIG as unknown as Record<string, unknown>;
      const qdrantCollection = String(cfg.QDRANT_COLLECTION_NAME ?? 'legal_docs');
      await this.qdrantClient.upsert?.(qdrantCollection, {
        points: [
          {
            id,
            vector: embedding,
            payload: commonPayload,
          },
        ],
        wait: true,
      });
      console.log(`Stored ${type} ${id} embedding in Qdrant.`);
    } catch (e) {
      console.error(`Failed to store ${type} ${id} embedding in Qdrant:`, e);
    }

    // 4. Cache embedding in Redis (for hot items and quick retrieval)
    try {
      const rclient = redis as unknown as RedisLike;
      if (typeof rclient.set === 'function') {
        await (rclient.set as Function)(`embedding:${type}:${id}`, JSON.stringify(embedding), { EX: 3600 }).catch(() => { });
      } else if (typeof (redis as unknown as RedisLike).set === 'function') {
        await ((redis as unknown as RedisLike).set!)(`embedding:${type}:${id}`, JSON.stringify(embedding), { EX: 3600 }).catch(() => { });
      }
      console.log(`Cached ${type} ${id} embedding in Redis.`);
    } catch (e: unknown) {
      console.debug(`Failed to cache ${type} ${id} embedding in Redis:`, e);
    }
  }

  // PUBLIC: Return a summary of case memory, evidence counts, conversation metrics, and simple analytics
  async getMemorySummary(caseId: string) {
    const memory = await this.loadCaseMemory(caseId).catch(() => this.createEmptyMemory(caseId));
    const evidenceCount = Array.isArray(memory.evidenceTimeline) ? memory.evidenceTimeline.length : 0;
    const documentCount = Array.isArray(memory.documentMap) ? memory.documentMap.length : 0;
    const conversationCount = Array.isArray(memory.aiMemory?.conversationHistory) ? memory.aiMemory!.conversationHistory.length : 0;
    const lastUpdated = memory.lastUpdated ?? null;
    const contextVersion = memory.contextVersion ?? 0;
    const ageDays = lastUpdated ? Math.max(0, Math.round((Date.now() - new Date(lastUpdated).getTime()) / (24 * 60 * 60 * 1000))) : null;

    // Fetch Redis top-k (defensive shortcuts for different redis client shapes)
    const topkKey = `topk:case:${caseId}`;
    let topk: Array<{ member: string; score: number }> = [];
    try {
      const r = redis as unknown as RedisLike;
      if (typeof r.zRangeWithScores === 'function') {
        const items = await r.zRangeWithScores(topkKey, -10, -1) as Array<{ value?: string; score?: number }>;
        topk = (items || []).map((it) => ({ member: (it.value ?? '') as string, score: Number(it.score ?? 0) }));
      } else if (typeof r.zRevRangeWithScores === 'function') {
        const items = await r.zRevRangeWithScores(topkKey, 0, 9) as Array<{ value?: string; score?: number }>;
        topk = (items || []).map((it) => ({ member: (it.value ?? '') as string, score: Number(it.score ?? 0) }));
      } else if (typeof r.zRange === 'function' && typeof r.zScore === 'function') {
        const members = await r.zRange(topkKey, 0, -1);
        const tail = (members || []).slice(-10);
        topk = await Promise.all(tail.map(async (m: string) => ({ member: m, score: Number(await (r.zScore!(topkKey, m) as Promise<number | null>) ?? 0) })));
      } else {
        // fallback: try zRevRange
        if (typeof (r as unknown as RedisLike).zRevRange === 'function') {
          const zRevRangeFn = (r as unknown as Record<string, unknown>)['zRevRange'] as unknown as ((k: string, s: number, e: number) => Promise<string[]>);
          const members = await zRevRangeFn(topkKey, 0, 9);
          topk = (members || []).map((m: string) => ({ member: m, score: 0 }));
        }
      }
    } catch (e) {
      console.debug('Failed reading top-k from Redis', e);
    }

    // Attempt to fetch lightweight analytics (defensive)
    let analytics: Record<string, unknown> | null = null;
    try {
      const svc = aiAnalyticsService as unknown as { getMetrics?: (caseId: string) => Promise<Record<string, unknown>>; query?: (q: Record<string, unknown>) => Promise<Record<string, unknown>> };
      if (svc) {
        if (typeof svc.getMetrics === 'function') analytics = await svc.getMetrics(caseId).catch(() => null);
        else if (typeof svc.query === 'function') analytics = await svc.query({ caseId }).catch(() => null);
        else analytics = null;
      }
    } catch (e) {
      console.debug('aiAnalyticsService fetch failed', e);
    }

    // Basic conversation stats (if conversation history present)
    const conversationSummary: { total: number; latest?: string } = { total: conversationCount };
    if (conversationCount > 0) {
      const lastConv = memory.aiMemory?.conversationHistory?.[memory.aiMemory.conversationHistory.length - 1];
      (conversationSummary as { total: number; latest?: string }).latest = lastConv?.timestamp ?? undefined;
    }

    return {
      caseId,
      counts: {
        evidence: evidenceCount,
        documents: documentCount,
        conversations: conversationCount,
      },
      lastUpdated,
      ageDays,
      contextVersion,
      topk,
      analytics,
      conversationSummary,
    };
  }

} // end class ContextAwareAIMemoryService

// Single export instance (ensure only one export)
export const contextAwareAIMemoryService = new ContextAwareAIMemoryService();