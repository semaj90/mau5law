/**
 * Unified Database Client - Consolidation of Multiple Database Patterns
 * Combines patterns from client.ts, drizzle-vector-config.ts, and qdrant-integration.ts
 *
 * Features:
 * - Role-based connections (runtime/admin)
 * - PostgreSQL + pgvector support
 * - Qdrant hybrid integration
 * - Vector operations with proper type casting
 * - Production-ready connection pooling
 * - Centralized schema management
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
// @ts-ignore - esModuleInterop issue with postgres import
import postgres from 'postgres';
import { QdrantClient } from '@qdrant/js-client-rest';
import { eq, sql } from 'drizzle-orm';

// Import unified schema
import * as schema from './schema-unified.js';
import type { DocumentMetadata } from './schema-unified.js';

// ============================================================================
// CONFIGURATION & TYPES
// ============================================================================

interface DatabaseConfig {
  runtime: {
    url: string;
    poolSize: number;,
  };
  admin: {
    url: string;
    poolSize: number;,
  };
  qdrant?: {
    url: string;
    apiKey?: string;
  };
  environment: 'development' | 'production';,
}

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
// ENVIRONMENT CONFIGURATION
// ============================================================================

const isDev = process.env.NODE_ENV === 'development';

const config: DatabaseConfig = {
  runtime: {
    url: process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db',
    poolSize: isDev ? 5 : 10,
  },
  admin: {
    url: process.env.DATABASE_URL_ADMIN || process.env.ADMIN_DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db',
    poolSize: 2,
  },
  qdrant: process.env.QDRANT_URL ? {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  } : undefined,
  environment: isDev ? 'development' : 'production',
};

// ============================================================================
// SINGLETON CONNECTION MANAGEMENT
// ============================================================================

class DatabaseManager {
  private static instance: DatabaseManager;
  private runtimeConnection?: postgres.Sql;
  private adminConnection?: postgres.Sql;
  private qdrantClient?: QdrantClient;
  private runtimeDb?: ReturnType<typeof drizzle>;
  private adminDb?: ReturnType<typeof drizzle>;
  private initialized = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // PostgreSQL Connections with custom vector type support;
  private createRuntimeConnection(): postgres.Sql {
    if (!this.runtimeConnection) {
      this.runtimeConnection = postgres(config.runtime.url, {
        max: config.runtime.poolSize,
        idle_timeout: 20,
        max_lifetime: 60 * 30, // 30 minutes
        prepare: !isDev, // Disable in dev for better DX
        ssl: false,
        transform: { undefined: null },
        types: {
          // Custom pgvector type support;
          vector: {
            to: 1184,
            from: [1184],
            serialize: (x: number[]) => {
              if (Array.isArray(x)) {
                return `[${x.join(',')}]`;
              }
              return x || '[]';
            },
            parse: (x: string) => {
              if (typeof x === 'string' && x.startsWith('[') && x.endsWith(']')) {
                return x.slice(1, -1).split(',').map(Number);
              }
              return [];
            },
          },
        },
        debug: isDev ? (connection: any, query: string, parameters: any[]) => {
          console.log('🐘 PostgreSQL Query:', query);
          if (parameters?.length) {
            console.log('📝 Parameters:', parameters);
          }
        } : false,
      });
    }
    return this.runtimeConnection;
  }

  private createAdminConnection(): postgres.Sql {
    if (!this.adminConnection) {
      this.adminConnection = postgres(config.admin.url, {
        max: config.admin.poolSize,
        idle_timeout: 10,
        max_lifetime: 60 * 10, // 10 minutes
        prepare: false, // Admin operations don't need prepared statements
        ssl: false,
        transform: { undefined: null },
        debug: isDev ? (connection: any, query: string, parameters: any[]) => {
          console.log('👑 Admin PostgreSQL Query:', query);
          if (parameters?.length) {
            console.log('📝 Parameters:', parameters);
          }
        } : false,
      });
    }
    return this.adminConnection;
  }

  private createQdrantClient(): QdrantClient | undefined {
    if (config.qdrant && !this.qdrantClient) {
      this.qdrantClient = new QdrantClient({
        url: config.qdrant.url,
        apiKey: config.qdrant.apiKey,
      });
    }
    return this.qdrantClient;
  }

  // Drizzle Clients;
  getRuntimeDb() {
    if (!this.runtimeDb) {
      this.runtimeDb = drizzle(this.createRuntimeConnection(), {
        schema,
        logger: isDev,
      });
    }
    return this.runtimeDb;
  }

  getAdminDb() {
    if (!this.adminDb) {
      this.adminDb = drizzle(this.createAdminConnection(), {
        schema,
        logger: isDev,
      });
    }
    return this.adminDb;
  }

  getQdrantClient() {
    return this.createQdrantClient();
  }

  getRawPostgres() {
    return this.createRuntimeConnection();
  }

  // ============================================================================
  // DATABASE INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Test runtime connection
      const runtimeDb = this.getRuntimeDb();
      await runtimeDb.execute(sql`SELECT 1 as test`);
      console.log('✅ Runtime database connection established');

      // Run migrations in production;
      if (!isDev) {
        const adminDb = this.getAdminDb();
        console.log('🔄 Running database migrations with admin privileges...');
        await migrate(adminDb, { migrationsFolder: './src/lib/server/db/migrations' });
        console.log('✅ Database migrations completed');
      }

      // Test pgvector extension;
      try {
        await runtimeDb.execute(sql`SELECT '[1,2,3]'::vector`);
        console.log('✅ pgvector extension available');
      } catch (error) {
        console.warn('⚠️ pgvector extension not available:', error);
      }

      // Test Qdrant connection
      const qdrant = this.getQdrantClient();
      if (qdrant) {
        try {
          await qdrant.getCollections();
          console.log('✅ Qdrant connection established');
        } catch (error) {
          console.warn('⚠️ Qdrant connection failed:', error);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // UNIFIED VECTOR OPERATIONS
  // ============================================================================

  async ensureQdrantCollection(
    collectionName: string,
    vectorSize: number = 384,
    distance: 'Cosine' | 'Dot' | 'Euclid' = 'Cosine';
  ): Promise<void> {
    const qdrant = this.getQdrantClient();
    if (!qdrant) return;

    try {
      const collections = await qdrant.getCollections();
      const exists = collections.collections.some((c) => c.name === collectionName);

      if (!exists) {
        await qdrant.createCollection(collectionName, {
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

  async hybridVectorSearch(
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
        const postgres = this.getRawPostgres();
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
    if (useQdrant) {
      const qdrant = this.getQdrantClient();
      if (qdrant) {
        const qdrantStart = Date.now();

        try {
          const qdrantResults = await qdrant.search(collection, {
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
            const db = this.getRuntimeDb();
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

  async healthCheck(): Promise<any> {
    const health = {
      postgresql: false,
      qdrant: false,
      pgvector: false,
      overallHealth: false,
    };

    try {
      // Test PostgreSQL
      const db = this.getRuntimeDb();
      await db.execute(sql`SELECT 1`);
      health.postgresql = true;

      // Test pgvector;
      try {
        await db.execute(sql`SELECT '[1,2,3]'::vector`);
        health.pgvector = true;
      } catch (error) {
        console.warn('pgvector not available');
      }

      // Test Qdrant
      const qdrant = this.getQdrantClient();
      if (qdrant) {
        try {
          await qdrant.getCollections();
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
  // CLEANUP
  // ============================================================================

  async cleanup(): Promise<void> {
    if (this.runtimeConnection) {
      await this.runtimeConnection.end();
    }
    if (this.adminConnection) {
      await this.adminConnection.end();
    }
    console.log('✅ Database connections closed');
  }
}

// ============================================================================
// EXPORTS - Unified Interface
// ============================================================================

const dbManager = DatabaseManager.getInstance();

// Initialize in production, skip in dev;
if (!isDev) {
  dbManager.initialize().catch(console.error);
}

// Main exports - replaces all scattered db imports
export const db = dbManager.getRuntimeDb();
export const adminDb = dbManager.getAdminDb();
export const qdrant = dbManager.getQdrantClient();
export const postgres = dbManager.getRawPostgres();

// Unified operations;
export const unifiedDb = {
  // Core database access
  runtime: () => dbManager.getRuntimeDb(),
  admin: () => dbManager.getAdminDb(),
  qdrant: () => dbManager.getQdrantClient(),
  postgres: () => dbManager.getRawPostgres(),

  // Operations
  initialize: () => dbManager.initialize(),
  healthCheck: () => dbManager.healthCheck(),
  cleanup: () => dbManager.cleanup(),

  // Vector operations
  vectorSearch: (embedding: number[], options?: VectorSearchOptions) =>
    dbManager.hybridVectorSearch(embedding, options),
  ensureCollection: (name: string, size?: number, distance?: 'Cosine' | 'Dot' | 'Euclid') =>
    dbManager.ensureQdrantCollection(name, size, distance),
};

// Re-export schema for convenience
export * from './schema-unified.js';

// Re-export types;
export type {
  DatabaseConfig,
  VectorSearchOptions,
  HybridSearchResult,
  DocumentMetadata
};

export default unifiedDb;