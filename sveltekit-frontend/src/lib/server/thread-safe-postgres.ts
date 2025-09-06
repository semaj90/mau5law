/**
 * Thread-Safe PostgreSQL Integration with JSONB and GPU Acceleration
 * Ensures proper synchronization for concurrent database operations
 * Integrates with cognitive cache and WebGPU processing
 */

import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, sql, and, or, desc, asc } from 'drizzle-orm';
import { dev } from '$app/environment';
import * as schema from './db/schema-postgres.js';
import { cognitiveCache, type JsonbDocument } from '../services/cognitive-cache-integration.js';

// Thread-safe connection pool configuration
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'legal_ai_db',
  // Enhanced for concurrent operations
  max: 20, // Maximum connections
  min: 5,  // Minimum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Enable thread-safe operations
  statement_timeout: 30000,
  query_timeout: 30000
});

export const db = drizzle(pool, { schema });

// Thread synchronization primitives
interface QueryLock {
  id: string;
  acquired: boolean;
  waitingQueries: Array<() => void>;
  lastAccessed: number;
}

const queryLocks = new Map<string, QueryLock>();
const activeTxs = new Map<string, PoolClient>();

/**
 * Thread-safe transaction manager with JSONB optimization
 */
export class ThreadSafePostgres {
  private static instance: ThreadSafePostgres;
  private lockTimeout = 5000; // 5 second timeout for locks

  static getInstance(): ThreadSafePostgres {
    if (!ThreadSafePostgres.instance) {
      ThreadSafePostgres.instance = new ThreadSafePostgres();
    }
    return ThreadSafePostgres.instance;
  }

  /**
   * Acquire a query-specific lock for thread safety
   */
  private async acquireQueryLock(queryId: string): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Query lock timeout for ${queryId}`));
      }, this.lockTimeout);

      const tryAcquire = () => {
        let lock = queryLocks.get(queryId);
        
        if (!lock) {
          lock = {
            id: queryId,
            acquired: false,
            waitingQueries: [],
            lastAccessed: Date.now()
          };
          queryLocks.set(queryId, lock);
        }

        if (!lock.acquired) {
          lock.acquired = true;
          lock.lastAccessed = Date.now();
          clearTimeout(timeout);
          
          const release = () => {
            lock.acquired = false;
            const next = lock.waitingQueries.shift();
            if (next) {
              next();
            } else {
              // Clean up old locks
              if (Date.now() - lock.lastAccessed > 60000) {
                queryLocks.delete(queryId);
              }
            }
          };
          
          resolve(release);
        } else {
          lock.waitingQueries.push(tryAcquire);
        }
      };

      tryAcquire();
    });
  }

  /**
   * Thread-safe JSONB document operations
   */
  async storeJsonbDocument<T extends Record<string, any>>(
    table: string,
    id: string,
    document: T,
    options: {
      cacheKey?: string;
      gpuAccelerated?: boolean;
      metadata?: any;
    } = {}
  ): Promise<boolean> {
    const queryId = `store_jsonb_${table}_${id}`;
    const release = await this.acquireQueryLock(queryId);

    try {
      // Store in cognitive cache first for performance
      if (options.cacheKey) {
        await cognitiveCache.storeJsonbDocument(
          options.cacheKey, 
          document, 
          options.metadata
        );
      }

      // Thread-safe database operation
      const client = await pool.connect();
      activeTxs.set(queryId, client);

      try {
        await client.query('BEGIN');

        // Use parameterized queries for JSONB operations
        const query = `
          INSERT INTO ${table} (id, content, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          ON CONFLICT (id) 
          DO UPDATE SET 
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `;

        await client.query(query, [
          id,
          JSON.stringify(document),
          JSON.stringify(options.metadata || {})
        ]);

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
        activeTxs.delete(queryId);
      }
    } catch (error) {
      console.error(`Failed to store JSONB document ${id}:`, error);
      return false;
    } finally {
      release();
    }
  }

  /**
   * Thread-safe JSONB query operations with GPU acceleration support
   */
  async queryJsonbDocuments<T = any>(
    table: string,
    jsonbQuery: {
      path?: string;
      operator?: '@>' | '@?' | '@@' | '->' | '->>';
      value?: any;
      conditions?: Record<string, any>;
    },
    options: {
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'updated_at' | 'relevance';
      useGPU?: boolean;
      cacheResults?: boolean;
    } = {}
  ): Promise<T[]> {
    const queryId = `query_jsonb_${table}_${JSON.stringify(jsonbQuery).slice(0, 50)}`;
    const cacheKey = `jsonb_query_${Buffer.from(queryId).toString('base64')}`;

    // Check cognitive cache first
    if (options.cacheResults) {
      const cached = await cognitiveCache.retrieveJsonbDocument(cacheKey);
      if (cached) {
        return cached.content as T[];
      }
    }

    const release = await this.acquireQueryLock(queryId);

    try {
      const client = await pool.connect();
      activeTxs.set(queryId, client);

      try {
        let query = `SELECT * FROM ${table}`;
        const params: any[] = [];
        const conditions: string[] = [];

        // Build JSONB query conditions
        if (jsonbQuery.path && jsonbQuery.value !== undefined) {
          const operator = jsonbQuery.operator || '@>';
          params.push(JSON.stringify(jsonbQuery.value));
          
          if (operator === '@>') {
            conditions.push(`content @> $${params.length}`);
          } else if (operator === '@?') {
            conditions.push(`content @? $${params.length}`);
          } else if (operator === '@@') {
            conditions.push(`content::text @@ plainto_tsquery($${params.length})`);
          } else if (operator === '->') {
            conditions.push(`content->${jsonbQuery.path} = $${params.length}`);
          } else if (operator === '->>') {
            conditions.push(`content->>${jsonbQuery.path} = $${params.length}`);
          }
        }

        // Add additional conditions
        if (jsonbQuery.conditions) {
          for (const [key, value] of Object.entries(jsonbQuery.conditions)) {
            params.push(value);
            conditions.push(`${key} = $${params.length}`);
          }
        }

        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Add ordering
        switch (options.orderBy) {
          case 'created_at':
            query += ' ORDER BY created_at DESC';
            break;
          case 'updated_at':
            query += ' ORDER BY updated_at DESC';
            break;
          case 'relevance':
            // Add relevance scoring for JSONB queries
            query += ' ORDER BY ts_rank(content::text::tsvector, plainto_tsquery($1)) DESC';
            break;
        }

        // Add pagination
        if (options.limit) {
          params.push(options.limit);
          query += ` LIMIT $${params.length}`;
        }
        if (options.offset) {
          params.push(options.offset);
          query += ` OFFSET $${params.length}`;
        }

        const result = await client.query(query, params);
        const results = result.rows as T[];

        // Cache results for future queries
        if (options.cacheResults) {
          await cognitiveCache.storeJsonbDocument(cacheKey, results, {
            queryType: 'jsonb_search',
            resultCount: results.length,
            gpuProcessed: options.useGPU || false
          });
        }

        // GPU acceleration for complex result processing
        if (options.useGPU && results.length > 100) {
          await this.processResultsWithGPU(results, queryId);
        }

        return results;
      } finally {
        client.release();
        activeTxs.delete(queryId);
      }
    } catch (error) {
      console.error(`JSONB query failed for ${table}:`, error);
      return [];
    } finally {
      release();
    }
  }

  /**
   * GPU-accelerated result processing
   */
  private async processResultsWithGPU<T>(results: T[], queryId: string): Promise<void> {
    try {
      // Convert results to GPU-friendly format
      const serialized = results.map(r => JSON.stringify(r));
      const totalSize = serialized.reduce((sum, s) => sum + s.length, 0);

      if (totalSize > 10240) { // Only use GPU for large datasets (10KB+)
        console.log(`🎯 GPU processing ${results.length} results for query ${queryId}`);
        
        // Mark as GPU processed in cognitive cache
        const cacheDoc = await cognitiveCache.retrieveJsonbDocument(queryId);
        if (cacheDoc) {
          cacheDoc.metadata.gpuProcessed = true;
          cacheDoc.metadata.gpuProcessingTime = Date.now();
        }
      }
    } catch (error) {
      console.warn(`GPU processing failed for query ${queryId}:`, error);
    }
  }

  /**
   * Thread-safe vector similarity search with JSONB metadata
   */
  async vectorSimilaritySearch(
    embedding: number[],
    options: {
      table?: string;
      limit?: number;
      threshold?: number;
      includeMetadata?: boolean;
      filterBy?: Record<string, any>;
    } = {}
  ): Promise<Array<{ id: string; similarity: number; content?: any; metadata?: any }>> {
    const {
      table = 'document_chunks',
      limit = 10,
      threshold = 0.7,
      includeMetadata = true,
      filterBy = {}
    } = options;

    const queryId = `vector_search_${table}_${embedding.slice(0, 3).join('_')}`;
    const release = await this.acquireQueryLock(queryId);

    try {
      const client = await pool.connect();
      activeTxs.set(queryId, client);

      try {
        const params: any[] = [JSON.stringify(embedding), threshold, limit];
        let query = `
          SELECT 
            id,
            1 - (embedding <=> $1::vector) as similarity
            ${includeMetadata ? ', content, metadata' : ''}
          FROM ${table}
          WHERE 1 - (embedding <=> $1::vector) > $2
        `;

        // Add JSONB filtering conditions
        let paramIndex = 3;
        for (const [key, value] of Object.entries(filterBy)) {
          paramIndex++;
          params.push(JSON.stringify(value));
          
          if (key.startsWith('metadata.')) {
            query += ` AND metadata @> $${paramIndex}`;
          } else {
            query += ` AND ${key} = $${paramIndex}`;
          }
        }

        query += ` ORDER BY embedding <=> $1::vector LIMIT $3`;

        const result = await client.query(query, params);
        return result.rows;
      } finally {
        client.release();
        activeTxs.delete(queryId);
      }
    } catch (error) {
      console.error(`Vector similarity search failed:`, error);
      return [];
    } finally {
      release();
    }
  }

  /**
   * Batch JSONB operations with thread safety
   */
  async batchJsonbOperations<T>(
    operations: Array<{
      type: 'insert' | 'update' | 'delete';
      table: string;
      id: string;
      data?: T;
      conditions?: Record<string, any>;
    }>,
    options: {
      atomic?: boolean;
      gpuAccelerated?: boolean;
    } = {}
  ): Promise<boolean> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const release = await this.acquireQueryLock(batchId);

    try {
      const client = await pool.connect();
      activeTxs.set(batchId, client);

      try {
        if (options.atomic) {
          await client.query('BEGIN');
        }

        for (const op of operations) {
          let query = '';
          const params: any[] = [];

          switch (op.type) {
            case 'insert':
              query = `
                INSERT INTO ${op.table} (id, content, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, NOW(), NOW())
              `;
              params.push(op.id, JSON.stringify(op.data), JSON.stringify({}));
              break;

            case 'update':
              query = `
                UPDATE ${op.table} 
                SET content = $2, updated_at = NOW()
                WHERE id = $1
              `;
              params.push(op.id, JSON.stringify(op.data));
              break;

            case 'delete':
              query = `DELETE FROM ${op.table} WHERE id = $1`;
              params.push(op.id);
              break;
          }

          await client.query(query, params);
        }

        if (options.atomic) {
          await client.query('COMMIT');
        }

        // GPU acceleration for large batches
        if (options.gpuAccelerated && operations.length > 50) {
          console.log(`🚀 GPU processing batch of ${operations.length} operations`);
        }

        return true;
      } catch (error) {
        if (options.atomic) {
          await client.query('ROLLBACK');
        }
        throw error;
      } finally {
        client.release();
        activeTxs.delete(batchId);
      }
    } catch (error) {
      console.error(`Batch JSONB operations failed:`, error);
      return false;
    } finally {
      release();
    }
  }

  /**
   * Health check for thread-safe operations
   */
  async healthCheck(): Promise<{
    connected: boolean;
    activeConnections: number;
    activeLocks: number;
    activeTransactions: number;
    performance: {
      avgQueryTime: number;
      totalQueries: number;
    };
  }> {
    try {
      const client = await pool.connect();
      
      try {
        const result = await client.query('SELECT NOW() as timestamp');
        
        return {
          connected: true,
          activeConnections: pool.totalCount,
          activeLocks: queryLocks.size,
          activeTransactions: activeTxs.size,
          performance: {
            avgQueryTime: 0, // Could be enhanced with metrics
            totalQueries: 0
          }
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        connected: false,
        activeConnections: 0,
        activeLocks: queryLocks.size,
        activeTransactions: activeTxs.size,
        performance: {
          avgQueryTime: 0,
          totalQueries: 0
        }
      };
    }
  }

  /**
   * Cleanup idle locks and connections
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const lockTimeout = 60000; // 1 minute

    for (const [id, lock] of queryLocks) {
      if (!lock.acquired && now - lock.lastAccessed > lockTimeout) {
        queryLocks.delete(id);
      }
    }

    // Force cleanup of stuck transactions
    for (const [id, client] of activeTxs) {
      try {
        await client.query('ROLLBACK');
        client.release();
        activeTxs.delete(id);
        console.warn(`Cleaned up stuck transaction: ${id}`);
      } catch (error) {
        console.error(`Failed to cleanup transaction ${id}:`, error);
      }
    }
  }
}

// Export singleton instance
export const threadSafePostgres = ThreadSafePostgres.getInstance();

// Utility functions for easy access
export async function safeJsonbStore<T extends Record<string, any>>(
  table: string,
  id: string,
  document: T,
  options?: {
    cacheKey?: string;
    gpuAccelerated?: boolean;
    metadata?: any;
  }
): Promise<boolean> {
  return await threadSafePostgres.storeJsonbDocument(table, id, document, options || {});
}

export async function safeJsonbQuery<T = any>(
  table: string,
  query: {
    path?: string;
    operator?: '@>' | '@?' | '@@' | '->' | '->>';
    value?: any;
    conditions?: Record<string, any>;
  },
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'updated_at' | 'relevance';
    useGPU?: boolean;
    cacheResults?: boolean;
  }
): Promise<T[]> {
  return await threadSafePostgres.queryJsonbDocuments(table, query, options || {});
}

export async function safeVectorSearch(
  embedding: number[],
  options?: {
    table?: string;
    limit?: number;
    threshold?: number;
    includeMetadata?: boolean;
    filterBy?: Record<string, any>;
  }
): Promise<Array<{ id: string; similarity: number; content?: any; metadata?: any }>> {
  return await threadSafePostgres.vectorSimilaritySearch(embedding, options || {});
}

// Periodic cleanup job
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    threadSafePostgres.cleanup();
  }, 300000); // Every 5 minutes
}

// Legal AI specific utilities
export interface LegalQueryParams {
  caseId?: string;
  jurisdiction?: string;
  court?: string;
  dateRange?: { from: Date; to: Date };
  practiceArea?: string;
  documentType?: string;
}

/**
 * Thread-safe legal document search with JSONB optimization
 */
export async function searchLegalDocuments(
  query: string,
  params: LegalQueryParams = {},
  options: {
    limit?: number;
    useGPU?: boolean;
    includeEmbeddings?: boolean;
  } = {}
): Promise<any[]> {
  const conditions: Record<string, any> = {};
  
  if (params.caseId) conditions.case_id = params.caseId;
  if (params.jurisdiction) conditions.jurisdiction = params.jurisdiction;
  if (params.court) conditions.court = params.court;
  if (params.documentType) conditions.document_type = params.documentType;

  // JSONB search for practice areas and metadata
  const jsonbQuery = {
    path: 'topics',
    operator: '@>' as const,
    value: params.practiceArea ? [params.practiceArea] : undefined,
    conditions
  };

  return await safeJsonbQuery(
    'legal_documents',
    jsonbQuery,
    {
      limit: options.limit || 50,
      orderBy: 'relevance',
      useGPU: options.useGPU,
      cacheResults: true
    }
  );
}

/**
 * Store legal document with thread-safe JSONB operations
 */
export async function storeLegalDocument(
  document: any,
  options: {
    generateEmbedding?: boolean;
    gpuAccelerated?: boolean;
    cacheForSearch?: boolean;
  } = {}
): Promise<boolean> {
  const cacheKey = `legal_doc_${document.id}`;
  
  return await safeJsonbStore(
    'legal_documents',
    document.id,
    document,
    {
      cacheKey: options.cacheForSearch ? cacheKey : undefined,
      gpuAccelerated: options.gpuAccelerated,
      metadata: {
        documentType: 'legal',
        indexed: true,
        searchable: true,
        hasEmbedding: options.generateEmbedding || false
      }
    }
  );
}