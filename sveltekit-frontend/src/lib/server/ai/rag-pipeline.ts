import { createHash } from 'crypto';
import Redis from 'ioredis';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '$lib/server/db/unified-schema';
import { Ollama } from '@langchain/community/llms/ollama';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PromptTemplate } from '@langchain/core/prompts';
import { Document as LangChainDocument } from '@langchain/core/documents';

// Configuration (env-driven with safe defaults)
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || 'gemma3-legal:latest';
const getLocalOllamaBaseUrl = () => (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, '');
const OLLAMA_BASE_URL = getLocalOllamaBaseUrl();

const DATABASE_URL = process.env.DATABASE_URL || `postgresql://legal_admin:123456@localhost:5432/legal_ai_db`;
const sql = postgres(DATABASE_URL, { max: 20, idle_timeout: 10, prepare: true });
const db = drizzle(sql, { schema });

const redis = new Redis(process.env.REDIS_URL || 'redis://:redis@localhost:6379/0', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: times => Math.min(times * 50, 2000),
});

type OllamaEmbeddingsOptions = { baseUrl?: string; model: string; requestOptions?: Record<string, unknown> };
class OllamaEmbeddingsClient {
  private baseUrl: string;
  private model: string;
  private requestOptions: Record<string, unknown>;

  constructor(opts: OllamaEmbeddingsOptions) {
    this.baseUrl = (opts.baseUrl || OLLAMA_BASE_URL).replace(/\/$/, '');
    this.model = opts.model;
    this.requestOptions = opts.requestOptions || {};
  }

  async embedQuery(input: string): Promise<number[]> {
    const url = `${this.baseUrl}/api/embeddings`;
    const payload = { model: this.model, input, options: this.requestOptions ?? {} };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama embeddings error: ${res.status} ${res.statusText} ${text}`);
    }
    const json = await res.json().catch(() => ({} as any));
    if (Array.isArray(json) && json[0]?.embedding && Array.isArray(json[0].embedding)) return json[0].embedding as number[];
    if (json?.embedding && Array.isArray(json.embedding)) return json.embedding as number[];
    if (json?.embeddings && Array.isArray(json.embeddings) && Array.isArray(json.embeddings[0])) return json.embeddings[0] as number[];
    return [];
  }
}

const embeddings = new OllamaEmbeddingsClient({ baseUrl: OLLAMA_BASE_URL, model: EMBEDDING_MODEL, requestOptions: { num_thread: 8 } });
const llm = new Ollama({ baseUrl: OLLAMA_BASE_URL, model: LLM_MODEL, temperature: 0.3 });

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 300,
  separators: [
    '\n\nSECTION',
    '\n\nARTICLE',
    '\n\nCLAUSE',
    '\n\n§',
    '\n\n¶',
    '\n\n',
    '\n',
    '.',
    '!',
    '?',
    ';',
    ':',
    ' ',
  ],
  keepSeparator: true,
});

const S = schema as unknown as Record<string, any>;

// Consolidated, single implementation of LegalRAGPipeline
export class LegalRAGPipeline {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const test = await sql`SELECT 1 as ok`;
    if (!test || test[0]?.ok !== 1) throw new Error('Database test failed');
    await redis.set('health-check', 'ok');
    const testEmb = await embeddings.embedQuery('health check');
    if (!Array.isArray(testEmb)) throw new Error('Embeddings provider returned invalid shape');
    this.initialized = true;
  }

  // Minimal ingestion pipeline
  async ingestLegalDocument(params: {
    title: string;
    content: string;
    documentType: string;
    metadata?: Record<string, unknown>;
    caseId?: string | null;
    userId?: string | null;
  }): Promise<{ documentId?: string; chunksCreated: number; tags?: string[] }> {
    const { title, content, documentType, metadata = {}, caseId, userId } = params;
    const chunks = await this.smartLegalChunking(content);
    const chunksData: Array<{ text: string; embedding: number[] }> = [];

    for (const chunk of chunks) {
      const emb = await this.generateEmbedding(chunk);
      chunksData.push({ text: chunk, embedding: emb });
    }

    try {
      if (S.documents) {
        const insert = await db.insert(S.documents).values({
          title,
          content,
          documentType,
          metadata,
          caseId,
          userId,
          createdAt: new Date(),
        }).returning();
        const docId = insert[0]?.id;
        if (S.documentChunks) {
          await db.insert(S.documentChunks).values(
            chunksData.map((c, i) => ({ documentId: docId, chunkIndex: i, text: c.text, embedding: c.embedding }))
          );
        } else if (S.embeddings) {
          await db.insert(S.embeddings).values(
            chunksData.map((c, i) => ({ documentId: docId, chunkIndex: i, text: c.text, vector: c.embedding }))
          );
        } else {
          await db.update(S.documents).set({ chunks: JSON.stringify(chunksData) }).where(S.documents.id.eq(docId));
        }
        return { documentId: String(docId), chunksCreated: chunksData.length, tags: [] };
      } else {
        const insertRes = await sql`
          INSERT INTO documents (title, content, document_type, metadata, case_id, user_id, created_at)
          VALUES (${title}, ${content}, ${documentType}, ${JSON.stringify(metadata)}, ${caseId ?? null}, ${userId ?? null}, now())
          RETURNING id
        `;
        const docId = insertRes?.[0]?.id ?? null;
        if (docId) {
          await sql`
            INSERT INTO document_chunks (document_id, chunk_index, text, embedding)
            SELECT ${String(docId)}, x.index, x.text, x.embedding
            FROM jsonb_to_recordset(${JSON.stringify(chunksData.map((c, i) => ({ index: i, text: c.text, embedding: c.embedding })))}::jsonb) AS x(index int, text text, embedding jsonb)
          `;
        }
        return { documentId: docId ? String(docId) : undefined, chunksCreated: chunksData.length, tags: [] };
      }
    } catch (err) {
      console.warn('[RAG] ingestLegalDocument DB write failed, returning metadata-only result:', err);
      return { documentId: undefined, chunksCreated: chunksData.length, tags: [] };
    }
  }

  // QUESTION ANSWERING
  async answerLegalQuestion(params: {
    question: string;
    caseId?: string;
    conversationContext?: string;
    userId?: string;
  }): Promise<{
    answer: string;
    sources: Array<{ id?: string; score?: number }>;
    confidence: number;
  }> {
    const startTime = Date.now();
    const { question, caseId, conversationContext, userId } = params;

    try {
      const relevantDocs = await this.hybridSearch({ query: question, caseId, limit: 5, threshold: 0.6 });

      if (!relevantDocs || relevantDocs.length === 0) {
        return {
          answer:
            "I couldn't find relevant information in the knowledge base to answer your question. Please provide more context or try rephrasing your question.",
          sources: [],
          confidence: 0,
        };
      }

      const context = relevantDocs.map((doc, idx) => `[Source ${idx + 1}]:\n${doc.pageContent}`).join('\n\n---\n\n');

      const promptTemplate = PromptTemplate.fromTemplate(`
You are a legal AI assistant. Answer the question based ONLY on the provided context.
${conversationContext ? `Previous Context:\n${conversationContext}\n\n` : ``}
Context: {context}
Question: {question}
Instructions:
1. Provide a clear, accurate answer based on the context.
2. Cite specific sources using [Source N] notation.
3. Identify any legal principles or precedents mentioned.
4. Note any important caveats or limitations.
5. If the context doesn't fully answer the question, clearly state what information is missing.
Answer:
      `);

      const promptText = await promptTemplate.format({ context, question });
      const llmResult = await llm.invoke(promptText);
      const answer = String(llmResult ?? '');
      const analysis = this.analyzeAnswer(answer, relevantDocs);

      try {
        if (S.userAiQueries) {
          await db.insert(S.userAiQueries).values({
            userId,
            caseId,
            query: question,
            response: answer,
            model: LLM_MODEL,
            queryType: 'legal_research',
            confidence: String(analysis.confidence),
            processingTime: Date.now() - startTime,
            metadata: { sourcesCount: relevantDocs.length, keyPoints: analysis.keyPoints },
          });
        }
      } catch (e) {
        console.warn('[RAG] Warning: failed to persist userAiQueries:', e);
      }

      return {
        answer,
        sources: relevantDocs.map(d => ({ id: (d.metadata as any)?.documentId as string | undefined, score: (d.metadata as any)?.score as number | undefined })),
        confidence: analysis.confidence,
      };
    } catch (error: unknown) {
      console.error('[RAG] error: ', error);
      throw error;
    }
  }

  // Contract analysis
  async analyzeContract(contractText: string) {
    const contractPrompt = PromptTemplate.fromTemplate(`
You are a legal expert specializing in contract analysis. Analyze the following contract and provide a structured assessment.
Contract: {contract}
Provide your analysis in clear sections (CONTRACT TYPE, PARTIES, KEY TERMS, RISK ASSESSMENT, LEGAL ISSUES, RECOMMENDATIONS).
    `);

    try {
      const prompt = await contractPrompt.format({ contract: contractText });
      const llmResult = await llm.invoke(prompt);
      const analysisText = String(llmResult ?? '');
      return this.parseContractAnalysis(analysisText);
    } catch (err) {
      console.error('[RAG] analyzeContract error:', err);
      throw err;
    }
  }

  // Correlate evidence
  async correlateEvidence(evidenceIds: string[]) {
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) return '';

    try {
      const evidenceRecords: Array<{ id: string; title: string | null; description: string | null; summary: string | null }> =
        await sql`SELECT id, title, description, COALESCE(summary, '') AS summary FROM evidence WHERE id = ANY(${evidenceIds}::uuid[])`;

      const formattedEvidence = evidenceRecords.map(
        (e, i) => `Evidence ${i + 1} (${e.title ?? 'Untitled'}):\n${e.description ?? ''}\n${e.summary ?? ''}`
      );

      const correlationPrompt = PromptTemplate.fromTemplate(`
As a legal analyst, examine the relationships between these pieces of evidence:
{evidence_blob}
Provide an analysis covering DIRECT CONNECTIONS, TIMELINE ANALYSIS, CONTRADICTIONS & INCONSISTENCIES, CORROBORATION, LEGAL SIGNIFICANCE, and RECOMMENDED ACTIONS.
      `);

      const promptText = await correlationPrompt.format({ evidence_blob: formattedEvidence.join('\n\n') });
      const llmResult = await llm.invoke(promptText);
      return String(llmResult ?? '');
    } catch (err) {
      console.error('[RAG] correlateEvidence error:', err);
      return '';
    }
  }

  // Hybrid search: Qdrant first, Postgres fallback
  async hybridSearch(options: {
    query: string;
    caseId?: string;
    documentType?: string;
    limit?: number;
    threshold?: number;
  }): Promise<LangChainDocument[]> {
    const { query, caseId, documentType, limit = 5 } = options;
    const queryEmbedding = await this.generateEmbedding(query);

    const QDRANT_URL = process.env.QDRANT_URL;
    if (QDRANT_URL) {
      try {
        const collection = process.env.QDRANT_COLLECTION || 'documents';
        const qdrantFilter: any[] = [];
        if (caseId) qdrantFilter.push({ key: 'caseId', match: { value: caseId } });
        if (documentType) qdrantFilter.push({ key: 'documentType', match: { value: documentType } });

        const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: queryEmbedding,
            limit,
            with_payload: true,
            with_vector: false,
            filter: qdrantFilter.length > 0 ? { must: qdrantFilter } : undefined,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const hits = (json?.result || json?.data || []);
          return hits.map((h: any) => ({
            pageContent: (h.payload?.text || h.payload?.content || h.payload?.excerpt || '').toString(),
            metadata: { score: h.score ?? undefined, documentId: h.id, ...h.payload },
          })) as LangChainDocument[];
        }
      } catch (qErr) {
        console.warn('[RAG] Qdrant search failed, falling back to Postgres text search:', qErr);
      }
    }

    // Postgres fallback using ILIKE pattern
    try {
      const pattern = `%${query.replace(/[%_]/g, '\\$&')}%`;
      const rows = await sql<Array<Record<string, unknown>>>`
        SELECT id, title, content, COALESCE(summary, '') AS summary
        FROM documents
        ${caseId ? sql`WHERE case_id = ${caseId} AND content ILIKE ${pattern}` : sql`WHERE content ILIKE ${pattern}`}
        ORDER BY char_length(content) DESC
        LIMIT ${limit}
      `;
      return (rows || []).map((r: Record<string, unknown>, idx: number) => {
        const text = (r.summary && String(r.summary).length > 0) ? String(r.summary) : (r.content ? String(r.content) : (r.title ? String(r.title) : ''));
        const score = Math.max(0, 1 - (idx * 0.15));
        return {
          pageContent: text,
          metadata: { documentId: r.id as string, title: r.title as string, score },
        } as LangChainDocument;
      });
    } catch (err) {
      console.error('[RAG] fallback hybridSearch error:', err);
      return [];
    }
  }

  // === HELPER METHODS ===
  private async generateEmbedding(text: string): Promise<number[]> {
    const key = `langcache:emb:${this.hashText(text)}`;
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as number[];
    } catch {
      /* ignore cache errors */
    }
    const vec = await embeddings.embedQuery(text);
    try {
      await redis.set(key, JSON.stringify(vec), 'EX', 60 * 60 * 24);
    } catch {
      /* ignore */
    }
    return vec;
  }

  private async smartLegalChunking(content: string): Promise<string[]> {
    if (!content) return [];
    try {
      const docs = await textSplitter.createDocuments([content]);
      return docs.map(d => d.pageContent);
    } catch {
      // Fallback simple splitter (fixed logic)
      const parts = content.match(/[^\.!\?]+[\.!\?]*/g) || [content];
      const out: string[] = [];
      let cur = '';
      for (const p of parts) {
        if ((cur + p).length > 1500) {
          if (cur) {
            out.push(cur);
            cur = p;
          } else {
            // current chunk empty but p too large -> push p as its own chunk
            out.push(p);
            cur = '';
          }
        } else {
          cur += p;
        }
      }
      if (cur) out.push(cur);
      return out;
    }
  }

  // analyzeAnswer kept simple and safe
  private analyzeAnswer(answer: string, sources: LangChainDocument[]) {
    if (!sources || sources.length === 0) return { confidence: 0, keyPoints: [] as string[] };
    const avgScore = (sources.reduce((s, d) => s + (Number((d.metadata as any)?.score || 0) || 0), 0) || 0) / Math.max(1, sources.length);
    const confidence = Math.min(0.95, avgScore);
    const keyPoints = (answer || '')
      .split(/\r?\n/)
      .map(l => l.replace(/^[\d\.\-\sâ€¢*]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return { confidence, keyPoints };
  }

  // parseContractAnalysis kept as previously implemented
  private parseContractAnalysis(text: string) {
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const sections: {
      contractType: string;
      parties: string[];
      keyTerms: string[];
      risks: string[];
      legalIssues: string[];
      recommendations: string[];
    } = {
      contractType: '',
      parties: [],
      keyTerms: [],
      risks: [],
      legalIssues: [],
      recommendations: [],
    };

    let current = '';
    for (const line of lines) {
      const up = line.toUpperCase();
      if (up.includes('CONTRACT TYPE')) current = 'contractType';
      else if (up.includes('PARTIES')) current = 'parties';
      else if (up.includes('KEY TERMS')) current = 'keyTerms';
      else if (up.includes('RISK')) current = 'risks';
      else if (up.includes('LEGAL ISSUES')) current = 'legalIssues';
      else if (up.includes('RECOMMENDATIONS')) current = 'recommendations';
      else {
        if (!current) continue;
        if (current === 'contractType') sections.contractType ||= line;
        else (sections as any)[current].push(line);
      }
    }
    return sections;
  }

  private hashText(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  async close(): Promise<void> {
    try {
      if (typeof (sql as any)?.end === 'function') await (sql as any).end();
    } catch {
      /* ignore */
    }
    try {
      if (typeof redis?.quit === 'function') await redis.quit();
    } catch {
      /* ignore */
    }
  }
}

// Export a single singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();
// Export a single singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();

  private hashText(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  async close(): Promise<void> {
    try { await sql.end(); } catch { /* ignore */ }
    try { await redis.quit(); } catch { /* ignore */ }
  }
}

// Export a singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();
    }
  }

  // === HELPER METHODS (ensure generateEmbedding & smartLegalChunking exist earlier in class) ===

  // analyzeAnswer kept simple and safe
  private analyzeAnswer(answer: string, sources: LangChainDocument[]) {
    if (!sources || sources.length === 0) return { confidence: 0, keyPoints: [] as string[] };
    const avgScore = (sources.reduce((s, d) => s + (Number(d.metadata?.score || 0) || 0), 0) || 0) / Math.max(1, sources.length);
    const confidence = Math.min(0.95, avgScore);
    const keyPoints = (answer || '')
      .split(/\r?\n/)
      .map(l => l.replace(/^[\d\.\-\sâ€¢*]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return { confidence, keyPoints };
  }

  // parseContractAnalysis kept as previously implemented (ensure there is only one copy in file)
  private parseContractAnalysis(text: string) {
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const sections: {
      contractType: string;
      parties: string[];
      keyTerms: string[];
      risks: string[];
      legalIssues: string[];
      recommendations: string[];
    } = {
      contractType: '',
      parties: [],
      keyTerms: [],
      risks: [],
      legalIssues: [],
      recommendations: [],
    };

    let current = '';
    for (const line of lines) {
      const up = line.toUpperCase();
      if (up.includes('CONTRACT TYPE')) current = 'contractType';
      else if (up.includes('PARTIES')) current = 'parties';
      else if (up.includes('KEY TERMS')) current = 'keyTerms';
      else if (up.includes('RISK')) current = 'risks';
      else if (up.includes('LEGAL ISSUES')) current = 'legalIssues';
      else if (up.includes('RECOMMENDATIONS')) current = 'recommendations';
      else {
        if (!current) continue;
        if (current === 'contractType') sections.contractType ||= line;
        else (sections as any)[current].push(line);
      }
    }
    return sections;
  }

  private hashText(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  async close(): Promise<void> {
    try { await sql.end(); } catch { /* ignore */ }
    try { await redis.quit(); } catch { /* ignore */ }
  }
}

// Export a singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();
  }
}

// Export a singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();

  // === HELPER METHODS ===
  private async generateEmbedding(text: string): Promise<number[]> {
    const key = `langcache:emb:${this.hashText(text)}`;
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as number[];
    } catch {
      /* ignore cache errors */
    }
    const vec = await embeddings.embedQuery(text);
    try {
      await redis.set(key, JSON.stringify(vec), 'EX', 60 * 60 * 24);
    } catch {
      /* ignore */
    }
    return vec;
  }

  private async smartLegalChunking(content: string): Promise<string[]> {
    if (!content) return [];
    try {
      const docs = await textSplitter.createDocuments([content]);
      return docs.map(d => d.pageContent);
    } catch {
      // Fallback simple splitter
      const parts = content.match(/[^\.!\?]+[\.!\?]*/g) || [content];
      const out: string[] = [];
      let cur = '';
      for (const p of parts) {
        if ((cur + p).length > 1500) {
          if (cur) out.push(cur);
          cur = p;
        } else cur += p;
      }
      if (cur) out.push(cur);
      return out;
    }
  }

  // Minimal ingestion pipeline: chunks + embeddings + DB insert (guarded)
  async ingestLegalDocument(params: {
    title: string;
    content: string;
    documentType: string;
    metadata?: Record<string, unknown>;
    caseId?: string;
    userId?: string;
  }): Promise<{ documentId?: string; chunksCreated: number; tags?: string[] }> {
    const { title, content, documentType, metadata = {}, caseId, userId } = params;
    const chunks = await this.smartLegalChunking(content);
    const chunksData: Array<{ text: string; embedding: number[] }> = [];

    for (const chunk of chunks) {
      const emb = await this.generateEmbedding(chunk);
      chunksData.push({ text: chunk, embedding: emb });
    }

    // Try to insert via Drizzle schema if available, otherwise raw SQL
    try {
      if ((schema as any).documents) {
        // Insert document row
        const insert = await db.insert((schema as any).documents).values({
          title,
          content,
          documentType,
          metadata,
          caseId,
          userId,
          createdAt: new Date(),
        }).returning();
        const docId = (insert as any)[0]?.id;
        // Insert chunks into documents_chunks (if schema exists) or into a generic embeddings table
        if ((schema as any).documentChunks) {
          await db.insert((schema as any).documentChunks).values(
            chunksData.map(c => ({
              documentId: docId,
              text: c.text,
              embedding: c.embedding, // depends on schema column type (pgvector/jsonb)
            }))
          );
        } else if ((schema as any).embeddings) {
          await db.insert((schema as any).embeddings).values(
            chunksData.map((c, i) => ({
              documentId: docId,
              chunkIndex: i,
              text: c.text,
              vector: c.embedding,
            }))
          );
        } else {
          // fallback: store chunks as JSONB in documents table (update)
          await db.update((schema as any).documents).set({ chunks: JSON.stringify(chunksData) }).where((schema as any).documents.id.eq(docId));
        }
        return { documentId: String(docId), chunksCreated: chunksData.length, tags: [] };
      } else {
        // Raw SQL fallback: store document and chunks as jsonb
        const insertRes = await sql`
          INSERT INTO documents (title, content, document_type, metadata, case_id, user_id, created_at)
          VALUES (${title}, ${content}, ${documentType}, ${JSON.stringify(metadata)}, ${caseId}, ${userId}, now())
          RETURNING id
        `;
        const docId = insertRes?.[0]?.id ?? null;
        if (docId) {
          await sql`
            INSERT INTO document_chunks (document_id, chunk_index, text, embedding)
            SELECT ${docId}::text, x.index, x.text, x.embedding
            FROM jsonb_to_recordset(${JSON.stringify(chunksData)}) AS x(index int, text text, embedding jsonb)
          `;
        }
        return { documentId: docId ? String(docId) : undefined, chunksCreated: chunksData.length, tags: [] };
      }
    } catch (err) {
      console.warn('[RAG] ingestLegalDocument DB write failed, returning metadata-only result:', err);
      return { documentId: undefined, chunksCreated: chunksData.length, tags: [] };
    }
  }

  // Hybrid search: prefer Qdrant, fallback to Postgres text match + basic scoring
  async hybridSearch(options: {
    query: string;
    caseId?: string;
    documentType?: string;
    limit?: number;
    threshold?: number;
  }): Promise<LangChainDocument[]> {
    const { query, caseId, documentType, limit = 5 } = options;
    const queryEmbedding = await this.generateEmbedding(query);

    // 1) Qdrant search if available
    const QDRANT_URL = process.env.QDRANT_URL;
    if (QDRANT_URL) {
      try {
        const collection = process.env.QDRANT_COLLECTION || 'documents';
        const res = await fetch(`${QDRANT_URL}/collections/${collection}/points/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vector: queryEmbedding,
            limit,
            with_payload: true,
            with_vector: false,
            filter: caseId ? { must: [{ key: 'caseId', match: { value: caseId } }] } : undefined,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const hits = (json?.result || json?.data || []);
          return hits.map((h: any, idx: number) => ({
            pageContent: (h.payload?.text || h.payload?.content || h.payload?.excerpt || '').toString(),
            metadata: { score: h.score ?? (1 - (h.score ?? 0)), documentId: h.id, ...h.payload },
          }));
        }
      } catch (qErr) {
        console.warn('[RAG] Qdrant search failed, falling back to Postgres text search:', qErr);
      }
    }

    // 2) Postgres fallback: do a simple ILIKE match and synthetic score
    try {
      const pattern = `%${query.replace(/[%_]/g, '\\$&')}%`;
      const rows = await sql<Array<any>>`
        SELECT id, title, content, COALESCE(summary, '') AS summary
        FROM documents
        ${caseId ? sql`WHERE case_id = ${caseId} AND content ILIKE ${pattern}` : sql`WHERE content ILIKE ${pattern}`}
        ORDER BY char_length(content) DESC
        LIMIT ${limit}
      `;
      // Build LangChainDocument objects with a basic score heuristic
      return (rows || []).map((r: any, idx: number) => {
        const text = (r.summary && r.summary.length > 0) ? r.summary : r.content ?? r.title ?? '';
        const score = Math.max(0, 1 - (idx * 0.15));
        return {
          pageContent: text,
          metadata: { documentId: r.id, title: r.title, score },
        } as LangChainDocument;
      });
    } catch (err) {
      console.error('[RAG] fallback hybridSearch error:', err);
      return [];
    }
  }

  // === HELPER METHODS (ensure generateEmbedding & smartLegalChunking exist earlier in class) ===

  // analyzeAnswer kept simple and safe
  private analyzeAnswer(answer: string, sources: LangChainDocument[]) {
    if (!sources || sources.length === 0) return { confidence: 0, keyPoints: [] as string[] };
    const avgScore = (sources.reduce((s, d) => s + (Number(d.metadata?.score || 0) || 0), 0) || 0) / Math.max(1, sources.length);
    const confidence = Math.min(0.95, avgScore);
    const keyPoints = (answer || '')
      .split(/\r?\n/)
      .map(l => l.replace(/^[\d\.\-\sâ€¢*]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return { confidence, keyPoints };
  }

  // parseContractAnalysis kept as previously implemented (ensure there is only one copy in file)
  private parseContractAnalysis(text: string) {
    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const sections: {
      contractType: string;
      parties: string[];
      keyTerms: string[];
      risks: string[];
      legalIssues: string[];
      recommendations: string[];
    } = {
      contractType: '',
      parties: [],
      keyTerms: [],
      risks: [],
      legalIssues: [],
      recommendations: [],
    };

    let current = '';
    for (const line of lines) {
      const up = line.toUpperCase();
      if (up.includes('CONTRACT TYPE')) current = 'contractType';
      else if (up.includes('PARTIES')) current = 'parties';
      else if (up.includes('KEY TERMS')) current = 'keyTerms';
      else if (up.includes('RISK')) current = 'risks';
      else if (up.includes('LEGAL ISSUES')) current = 'legalIssues';
      else if (up.includes('RECOMMENDATIONS')) current = 'recommendations';
      else {
        if (!current) continue;
        if (current === 'contractType') sections.contractType ||= line;
        else (sections as any)[current].push(line);
      }
    }
    return sections;
  }

  private hashText(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  async close(): Promise<void> {
    try { await sql.end(); } catch { /* ignore */ }
    try { await redis.quit(); } catch { /* ignore */ }
  }
}

// Export a singleton convenience instance
export const ragPipeline = new LegalRAGPipeline();



