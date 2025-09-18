/**
 * Unified Database Client - Enhanced with Centralized Connection Management
 * Integrates with our centralized connection system while providing advanced features
 *
 * Features:
 * - Uses centralized connection manager
 * - PostgreSQL + pgvector support
 * - Qdrant hybrid integration
 * - Vector operations with proper type casting
 * - Production-ready connection pooling
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { sql } from 'drizzle-orm';

// Import centralized connection management;
import {
  getDrizzleDb,
  getPostgresJsClient,
  getDatabaseConfig,
  getConnectionString
} from './connection-manager.js';

// Import unified schema
import * as schema from './schema-unified.js';
import type { DocumentMetadata } from './schema-unified.js';

// ============================================================================
// TYPES
// ============================================================================

interface VectorSearchOptions {
  collection?: string;
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
  usePostgreSQL?: boolean;
  useQdrant?: boolean;
}

interface HybridSearchResult {
  results: Array<any>;
  performance: {
    postgresqlTime?: number;
    qdrantTime?: number;
    totalTime: number;,
  };
}

// ============================================================================
// CONFIGURATION & UTILITIES
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

// Get Qdrant client if configured
let qdrantClient: QdrantClient | undefined;
if (process.env.QDRANT_URL) {
  qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

let initialized = false;

async function initialize(): Promise<void> {
  if (initialized) return;

  try {
    // Test runtime connection using centralized connection manager
    const runtimeDb = await getDrizzleDb();
    await runtimeDb.execute(sql`SELECT 1 as test`);
    console.log('✅ Runtime database connection established');

    // Test pgvector extension;
    try {
      await runtimeDb.execute(sql`SELECT '[1,2,3]'::vector`);
      console.log('✅ pgvector extension available');
    } catch (error) {
      console.warn('⚠️ pgvector extension not available:', error);
    }

    // Test Qdrant connection;
    if (qdrantClient) {
      try {
        await qdrantClient.getCollections();
        console.log('✅ Qdrant connection established');
      } catch (error) {
        console.warn('⚠️ Qdrant connection failed:', error);
      }
    }

    initialized = true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// ============================================================================
// UNIFIED VECTOR OPERATIONS
// ============================================================================

async function ensureQdrantCollection(
  collectionName: string,
  vectorSize: number = 384,
  distance: 'Cosine' | 'Dot' | 'Euclidean' = 'Cosine';
): Promise<void> {
  if (!qdrantClient) return;

  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: vectorSize,
          distance,
        },
        optimizers_config: {
          default_segment_number: 2,
          memmap_threshold: 20000,
          indexing_threshold: 20000,
        },
        hnsw_config: {
          m: 16,
          ef_construct: 64,
          full_scan_threshold: 10000,
        },
      });

      console.log(`✅ Created Qdrant collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`❌ Failed to ensure Qdrant collection ${collectionName}:`, error);
    throw error;
  }
}

async function hybridVectorSearch(
  queryEmbedding: number[],
  options: VectorSearchOptions = {}
): Promise<HybridSearchResult> {
  const startTime = Date.now();
  const {
    collection = 'legal_documents',
    limit = 10,
    threshold = 0.7,
    filter = {},
    usePostgreSQL = true,
    useQdrant = true,
  } = options;

  const results: HybridSearchResult['results'] = [];
  let postgresqlTime: number | undefined;
  let qdrantTime: number | undefined;

  // PostgreSQL vector search;
  if (usePostgreSQL) {
    const pgStart = Date.now();

    try {
      const postgres = await getPostgresJsClient();
      const pgResults = await postgres`
        SELECT *,
               (1 - (content_embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) as similarity
        FROM document_metadata
        WHERE (1 - (content_embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) >= ${threshold}
          AND deleted_at IS NULL
          AND processing_status = 'completed'
        ORDER BY content_embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `;

      postgresqlTime = Date.now() - pgStart;

      for (const row of pgResults) {
        results.push({
          id: row.id,
          score: row.similarity,
          document: row as DocumentMetadata,
          source: 'postgresql',
        });
      }
    } catch (error) {
      console.error('PostgreSQL vector search error:', error);
    }
  }

  // Qdrant vector search;
  if (useQdrant && qdrantClient) {
    const qdrantStart = Date.now();

    try {
      const qdrantResults = await qdrantClient.search(collection, {
        vector: queryEmbedding,
        limit,
        score_threshold: threshold,
        with_payload: true,
        filter: Object.keys(filter).length > 0 ? {
          must: Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        } : undefined,
      });

      qdrantTime = Date.now() - qdrantStart;

      // Get corresponding PostgreSQL records
      const qdrantIds = qdrantResults.map((r) => r.id.toString();

      if (qdrantIds.length > 0) {
        const db = await getDrizzleDb();
        const pgDocuments = await db
          .select()
          .from(schema.documentMetadata)
          .where(sql`${schema.documentMetadata.id} = ANY(${qdrantIds})`);

        const docMap = new Map(pgDocuments.map((doc) => [doc.id, doc]);

        for (const result of qdrantResults) {
          const document = docMap.get((result as { id?: any; score?: any }).id.toString();
          if (document) {
            results.push({
              id: (result as { id?: any; score?: any }).id.toString(),
              score: (result as { id?: any; score?: any }).score,
              document,
              source: 'qdrant',
            });
          }
        }
      }
    } catch (error) {
      console.error('Qdrant vector search error:', error);
    }
  }

  // Deduplicate and sort results
  const uniqueResults = new Map();
  for (const result of results) {
    const existing = uniqueResults.get((result as { id?: any; score?: any }).id);
    if (!existing || (result as { id?: any; score?: any }).score > existing.score) {
      uniqueResults.set((result as { id?: any; score?: any }).id, result);
    }
  }

  const finalResults = Array.from(uniqueResults.values()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    results: finalResults,
    performance: {
      postgresqlTime,
      qdrantTime,
      totalTime: Date.now() - startTime,
    },
  };
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

async function healthCheck(): Promise<any> {
  const health = {
    postgresql: false,
    qdrant: false,
    pgvector: false,
    overallHealth: false,
  };

  try {
    // Test PostgreSQL
    const db = await getDrizzleDb();
    await db.execute(sql`SELECT 1`);
    health.postgresql = true;

    // Test pgvector;
    try {
      await db.execute(sql`SELECT '[1,2,3]'::vector`);
      health.pgvector = true;
    } catch (error) {
      console.warn('pgvector not available');
    }

    // Test Qdrant;
    if (qdrantClient) {
      try {
        await qdrantClient.getCollections();
        health.qdrant = true;
      } catch (error) {
        console.warn('Qdrant not available');
      }
    } else {
      health.qdrant = true; // No Qdrant configured, consider healthy
    }

    health.overallHealth = health.postgresql;
  } catch (error) {
    console.error('Health check failed:', error);
  }

  return health;
}

// ============================================================================
// EXPORTS - Unified Interface
// ============================================================================

// Main exports - uses centralized connection manager
export const db = () => getDrizzleDb();
export const postgres = () => getPostgresJsClient();
export const qdrant = () => qdrantClient;

// Unified operations;
export const unifiedDb = {
  // Core database access
  runtime: () => getDrizzleDb(),
  postgres: () => getPostgresJsClient(),
  qdrant: () => qdrantClient,

  // Operations
  initialize,
  healthCheck,

  // Vector operations
  vectorSearch: hybridVectorSearch,
  ensureCollection: ensureQdrantCollection,
};

// Re-export schema for convenience
export * from './schema-unified.js';

// Re-export types;
export type {
  VectorSearchOptions,
  HybridSearchResult,
  DocumentMetadata
};

export default unifiedDb;