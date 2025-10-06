<![CDATA[
// Compact Enhanced Neo4j Path Context Reranker (clean, syntactically valid)
import { QdrantService } from './qdrant-service.js';
import type { DocumentEmbedding } from './som-rag-system.js';

export type UserContext = {
  user_id: string;
  case_id?: string;
  role: 'prosecutor' | 'detective' | 'admin';
  search_intent: 'evidence' | 'precedent' | 'analysis';
};

export interface EntityRelationship {
  source_entity: string;
  target_entity: string;
  relationship_type: 'references' | 'contradicts' | 'supports' | 'contains';
  confidence: number;
  legal_weight: number;
  source_document: string;
}

export interface ConfidenceScores {
  legal_relevance: number;
  factual_accuracy: number;
  chain_of_custody: number;
  precedent_strength: number;
  overall_confidence: number;
}

export interface AuditEntry {
  timestamp: number;
  action: 'query' | 'rerank' | 'search' | 'score_adjustment';
  user_id: string;
  query_hash: string;
  score_before?: number;
  score_after?: number;
  reasoning: string;
}

export interface Neo4jPathContext {
  document_id: string;
  case_id: string;
  evidence_chain: string[];
  legal_precedents: string[];
  entity_relationships: EntityRelationship[];
  confidence_scores: ConfidenceScores;
  audit_trail: AuditEntry[];
}

export interface EnhancedRerankerConfig {
  enable_neo4j_paths: boolean;
  enable_boolean_patterns: boolean;
  accuracy_threshold: number;
  max_path_depth: number;
  legal_weight_multiplier: number;
  audit_enabled: boolean;
}

export interface RerankingResult {
  document_id: string;
  original_score: number;
  enhanced_score: number;
  neo4j_boost: number;
  boolean_pattern_match: boolean[][];
  confidence_metrics: ConfidenceScores;
  path_context: Neo4jPathContext;
  explanation: string;
}

export class EnhancedNeo4jReranker {
  private qdrantService = new QdrantService({ url: process.env.QDRANT_URL ?? 'http://localhost:6333', collectionName: 'legal_documents', vectorSize: 768, apiKey: process.env.QDRANT_API_KEY });
  private auditLog: AuditEntry[] = [];
  private isInitialized = false;
  private config: EnhancedRerankerConfig;
  // Optional Neo4j driver and session factory (loaded dynamically)
  private neo4jDriver: any | null = null;

  constructor(config: Partial<EnhancedRerankerConfig> = {}) {
    this.config = {
      enable_neo4j_paths: true,
      enable_boolean_patterns: true,
      accuracy_threshold: 0.5,
      max_path_depth: 5,
      legal_weight_multiplier: 1.0,
      audit_enabled: false,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    await this.qdrantService.ensureCollection();
    // Optionally initialize Neo4j driver if URL provided via env or config
    const boltUrl = (this.config as any).neo4j_bolt_url || process.env.NEO4J_BOLT_URL;
    if (boltUrl) {
      try {
        // dynamic import so package is optional
        const neo4j = await import('neo4j-driver');
        this.neo4jDriver = neo4j.driver(boltUrl, neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'test'));
        // quick connectivity check
        const session = this.neo4jDriver.session();
        await session.run('RETURN 1');
        await session.close();
        console.log('✅ Neo4j driver initialized');
      } catch (e) {
        console.warn('Neo4j not available or driver not installed; continuing with mock path context', String(e));
        this.neo4jDriver = null;
      }
    }
    this.isInitialized = true;
  }

  async enhancedRerank(query: string, documents: Array<DocumentEmbedding | unknown>, userContext: UserContext): Promise<RerankingResult[]> {
    if (!this.isInitialized) throw new Error('Reranker not initialized');
    const start = Date.now();
    const results: RerankingResult[] = [];
    for (const raw of documents) {
      const doc = this.ensureDocumentEmbedding(raw);
      try {
        const original = await this.calculateSemanticSimilarity(query, doc);
        const path = await this.getNeo4jPathContext(doc, userContext);
        const conf = this.getDefaultConfidenceScores();
        const enhanced = Math.min(original + (path.evidence_chain.length * 0.02), 1.0);
        results.push({ document_id: doc.id, original_score: original, enhanced_score: enhanced, neo4j_boost: enhanced - original, boolean_pattern_match: [[false]], confidence_metrics: conf, path_context: path, explanation: 'computed' });
      } catch (err) {
        results.push({ document_id: (raw as any)?.id ?? 'unknown', original_score: 0, enhanced_score: 0, neo4j_boost: 0, boolean_pattern_match: [[false]], confidence_metrics: this.getDefaultConfidenceScores(), path_context: this.getDefaultPathContext({ id: (raw as any)?.id ?? 'unknown', content: '', embedding: [], metadata: {} as any }), explanation: String(err) });
      }
    }
    results.sort((a, b) => b.enhanced_score - a.enhanced_score);
    const filtered = results.filter(r => (r.confidence_metrics?.overall_confidence ?? 0) >= this.config.accuracy_threshold);
    console.log(`Enhanced rerank completed in ${Date.now() - start}ms, returned ${filtered.length}/${results.length}`);
    return filtered;
  }

  // minimal helpers
  private ensureDocumentEmbedding(raw: unknown): DocumentEmbedding {
    if (!raw || typeof raw !== 'object') return { id: 'unknown', content: '', embedding: [], metadata: {} as any } as DocumentEmbedding;
    const r = raw as any;
    return { id: r.id ?? r.document_id ?? 'unknown', content: r.content ?? r.text ?? '', embedding: Array.isArray(r.embedding) ? r.embedding : [], metadata: r.metadata ?? {} } as DocumentEmbedding;
  }

  private async getNeo4jPathContext(document: DocumentEmbedding, userContext: UserContext): Promise<Neo4jPathContext> {
    // If Neo4j is configured, query for related paths/entities; otherwise return a mock context
    if (this.neo4jDriver) {
      try {
        const session = this.neo4jDriver.session();
        // Example cypher: find connected entities and evidence chain up to configured depth
        const depth = (this.config && (this.config as any).max_path_depth) || 3;
        const cypher = `MATCH (d:Document {id: $id})-[r*1..${depth}]-(n) RETURN d, r, n LIMIT 50`;
        const res = await session.run(cypher, { id: document.id });
        await session.close();

        const evidence_chain: string[] = [];
        const legal_precedents: string[] = [];
        const entity_relationships: EntityRelationship[] = [];

        for (const rec of res.records) {
          // r is a path - collect node ids and relationship info when present
          const r = rec.get('r');
          const nodes = Array.isArray(r) ? r : [r];
          nodes.forEach((p: any) => {
            try {
              if (p && p.start && p.end && p.type) {
                entity_relationships.push({ source_entity: p.start?.properties?.id ?? 'unknown', target_entity: p.end?.properties?.id ?? 'unknown', relationship_type: (p.type || 'references') as any, confidence: 0.8, legal_weight: 1.0, source_document: document.id });
              }
            } catch {}
          });
        }

        return {
          document_id: document.id,
          case_id: userContext.case_id ?? 'UNKNOWN',
          evidence_chain,
          legal_precedents,
          entity_relationships,
          confidence_scores: this.getDefaultConfidenceScores(),
          audit_trail: [],
        };
      } catch (e) {
        console.warn('Neo4j query failed, falling back to mock path context', String(e));
        // fall through to mock
      }
    }
    // fallback mock
    return { document_id: document.id, case_id: userContext.case_id ?? 'UNKNOWN', evidence_chain: ['evidence_collection', 'chain_of_custody'], legal_precedents: ['State v. Example (2020)'], entity_relationships: [{ source_entity: 'entity_a', target_entity: 'entity_b', relationship_type: 'contains', confidence: 0.9, legal_weight: 0.8, source_document: document.id }], confidence_scores: this.getDefaultConfidenceScores(), audit_trail: [] };
  }

  private async calculateSemanticSimilarity(_q: string, document: DocumentEmbedding): Promise<number> {
    const words = (document.content || '').toLowerCase().split(/\s+/).filter(Boolean);
    return Math.min(words.length / 10, 1.0);
  }

  private getDefaultConfidenceScores(): ConfidenceScores {
    return { legal_relevance: 0.6, factual_accuracy: 0.7, chain_of_custody: 0.6, precedent_strength: 0.5, overall_confidence: 0.65 };
  }

  private getDefaultPathContext(document: DocumentEmbedding): Neo4jPathContext {
    return { document_id: document.id, case_id: 'UNKNOWN', evidence_chain: [], legal_precedents: [], entity_relationships: [], confidence_scores: this.getDefaultConfidenceScores(), audit_trail: [] };
  }

  getAuditTrail(): AuditEntry[] {
    return [...this.auditLog];
  }
}

export function createEnhancedNeo4jReranker(config: Partial<EnhancedRerankerConfig> = {}) {
  return new EnhancedNeo4jReranker(config);
}

export default EnhancedNeo4jReranker;
]]>
