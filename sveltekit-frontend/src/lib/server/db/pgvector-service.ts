/**
 * PostgreSQL + pgvector Integration Test Suite
 * Best Practices Implementation for Vector Similarity Search
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { cosineDistance, desc, sql, eq } from 'drizzle-orm';
import { contentEmbeddings, legalDocuments, embeddingCache } from './schema-postgres';

// Production PostgreSQL Configuration
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'), // Updated to use port 5433
  database: process.env.DB_NAME || 'legal_ai_db',
  user: process.env.DB_USER || 'legal_admin',
  password: process.env.DB_PASSWORD || '123456',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// PostgreSQL Connection Pool with Error Handling
export class PgVectorService {
  private pool: Pool;
  private db: any;
  private isConnected: boolean = false;

  constructor() {
    this.pool = new Pool(connectionConfig);
    this.db = drizzle(this.pool);
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('connect', () => {
      console.log('📡 PostgreSQL connection established');
      this.isConnected = true;
    });
  }

  /**
   * Test PostgreSQL + pgvector connection
   * Best Practice: Always verify extensions and permissions
   */
  async testConnection(): Promise<{ success: boolean; details: any }> {
    try {
      const client = await this.pool.connect();

      // Test 1: Basic connection
      const basicTest = await client.query('SELECT NOW() as current_time');

      // Test 2: pgvector extension check
      const vectorTest = await client.query(
        "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
      );

      // Test 3: Vector operations capability
      const vectorCapabilityTest = await client.query(`
        SELECT
          '[1,2,3]'::vector <-> '[1,2,4]'::vector as cosine_distance,
          '[1,2,3]'::vector <#> '[1,2,4]'::vector as negative_inner_product,
          '[1,2,3]'::vector <=> '[1,2,4]'::vector as euclidean_distance
      `);

      // Test 4: Schema existence check
      const schemaTest = await client.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_name IN ('vector_embeddings', 'legal_documents', 'qlora_training_jobs')
        ORDER BY table_name, ordinal_position
      `);

      client.release();

      return {
        success: true,
        details: {
          connection: basicTest.rows[0],
          pgvectorExtension: vectorTest.rows[0] || { status: 'not_installed' },
          vectorOperations: vectorCapabilityTest.rows[0],
          schemaInfo: schemaTest.rows,
          connectionPool: {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        details: {
          error: error.message,
          connectionConfig: { ...connectionConfig, password: '***' },
        },
      };
    }
  }

  /**
   * Insert document with vector embedding
   * Best Practice: Use transactions and validate vector dimensions
   */
  async insertDocumentWithEmbedding(
    documentId: string,
    content: string,
    embedding: number[],
    metadata: any = {}
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      // Validate embedding dimensions (768 for nomic-embed-text, gemma models vary)
      if (embedding.length !== 768 && embedding.length !== 1536) {
        throw new Error(
          `Invalid embedding dimension: expected 768 or 1536, got ${embedding.length}`
        );
      }

      const client = await this.pool.connect();

      try {
        await client.query('BEGIN');

        // Insert legal document with embedding
        const embeddingStr = `[${embedding.join(',')}]`;
        const docResult = await client.query(
          `INSERT INTO legal_documents (title, content, document_type, keywords, embedding, created_at)
           VALUES ($1, $2, $3, $4, $5::vector, NOW())
           RETURNING id`,
          [
            metadata.title || 'Untitled',
            content,
            metadata.type || 'contract',
            JSON.stringify(metadata),
            embeddingStr,
          ]
        );

        const docId = docResult.rows[0].id;

        await client.query('COMMIT');

        return {
          success: true,
          id: docId,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Vector similarity search with multiple distance metrics
   * Best Practice: Support cosine, euclidean, and inner product distances
   */
  async vectorSimilaritySearch(
    queryEmbedding: number[],
    options: {
      limit?: number;
      distanceMetric?: 'cosine' | 'euclidean' | 'inner_product';
      threshold?: number;
      documentType?: string;
      includeContent?: boolean;
    } = {}
  ): Promise<{ success: boolean; results?: any[]; error?: string; metadata?: any }> {
    try {
      if (queryEmbedding.length !== 768 && queryEmbedding.length !== 1536) {
        throw new Error(
          `Invalid query embedding dimension: expected 768 or 1536, got ${queryEmbedding.length}`
        );
      }

      const {
        limit = 10,
        distanceMetric = 'cosine',
        threshold = 1.0,
        documentType,
        includeContent = false,
      } = options;

      // Choose distance operator based on metric
      const distanceOperator = {
        cosine: '<->',
        euclidean: '<=>',
        inner_product: '<#>',
      }[distanceMetric];

      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      let query = `
        SELECT
          ld.id,
          ld.title,
          ld.document_type,
          ${includeContent ? 'ld.content,' : ''}
          ld.embedding ${distanceOperator} $1::vector as distance,
          ld.keywords as metadata,
          ld.created_at
        FROM legal_documents ld
        WHERE ld.embedding IS NOT NULL
        AND (ld.embedding ${distanceOperator} $1::vector) < $2
      `;

      const queryParams = [embeddingStr, threshold];
      let paramIndex = 3;

      if (documentType) {
        query += ` AND ld.document_type = $${paramIndex}`;
        queryParams.push(documentType);
        paramIndex++;
      }

      query += ` ORDER BY ld.embedding ${distanceOperator} $1::vector LIMIT $${paramIndex}`;
      queryParams.push(limit);

      const client = await this.pool.connect();
      const startTime = Date.now();

      try {
        const result = await client.query(query, queryParams);
        const searchTime = Date.now() - startTime;

        return {
          success: true,
          results: result.rows,
          metadata: {
            searchTime: `${searchTime}ms`,
            totalResults: result.rowCount,
            distanceMetric,
            threshold,
            query: query.replace(/\$\d+/g, '?'),
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Batch insert multiple documents with embeddings
   * Best Practice: Use prepared statements and batch processing
   */
  async batchInsertDocuments(
    documents: Array<{
      documentId: string;
      content: string;
      embedding: number[];
      metadata?: any;
    }>
  ): Promise<{ success: boolean; inserted?: number; errors?: string[] }> {
    try {
      const client = await this.pool.connect();
      const errors: string[] = [];
      let inserted = 0;

      try {
        await client.query('BEGIN');

        for (const doc of documents) {
          try {
            if (doc.embedding.length !== 1536) {
              errors.push(`${doc.documentId}: Invalid embedding dimension`);
              continue;
            }

            const embeddingStr = `[${doc.embedding.join(',')}]`;

            // Insert document
            await client.query(
              `INSERT INTO legal_documents (document_id, title, content, document_type, metadata, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (document_id) DO NOTHING`,
              [
                doc.documentId,
                doc.metadata?.title || 'Batch Insert',
                doc.content,
                doc.metadata?.type || 'contract',
                doc.metadata || {},
              ]
            );

            // Insert embedding
            await client.query(
              `INSERT INTO vector_embeddings (document_id, embedding, metadata, created_at)
               VALUES ($1, $2::vector, $3, NOW())
               ON CONFLICT (document_id) DO UPDATE SET
               embedding = EXCLUDED.embedding,
               metadata = EXCLUDED.metadata,
               updated_at = NOW()`,
              [doc.documentId, embeddingStr, doc.metadata || {}]
            );

            inserted++;
          } catch (docError) {
            errors.push(`${doc.documentId}: ${docError.message}`);
          }
        }

        await client.query('COMMIT');

        return {
          success: true,
          inserted,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Create IVFFLAT index for vector similarity search optimization
   * Best Practice: Index creation for production performance
   */
  async createVectorIndex(
    options: {
      lists?: number;
      metric?: 'cosine' | 'euclidean' | 'inner_product';
      tableName?: string;
      columnName?: string;
    } = {}
  ): Promise<{ success: boolean; details?: any; error?: string }> {
    try {
      const {
        lists = 100,
        metric = 'cosine',
        tableName = 'vector_embeddings',
        columnName = 'embedding',
      } = options;

      const metricMapping = {
        cosine: 'vector_cosine_ops',
        euclidean: 'vector_l2_ops',
        inner_product: 'vector_ip_ops',
      };

      const indexName = `idx_${tableName}_${columnName}_${metric}`;
      const opClass = metricMapping[metric];

      const client = await this.pool.connect();

      try {
        // Drop existing index if exists
        await client.query(`DROP INDEX IF EXISTS ${indexName}`);

        // Create IVFFLAT index
        const indexQuery = `
          CREATE INDEX ${indexName}
          ON ${tableName}
          USING ivfflat (${columnName} ${opClass})
          WITH (lists = ${lists})
        `;

        const startTime = Date.now();
        await client.query(indexQuery);
        const indexTime = Date.now() - startTime;

        // Analyze table for query planner
        await client.query(`ANALYZE ${tableName}`);

        return {
          success: true,
          details: {
            indexName,
            tableName,
            columnName,
            metric,
            lists,
            creationTime: `${indexTime}ms`,
            query: indexQuery.trim(),
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get database statistics for monitoring
   * Best Practice: Monitor performance and usage metrics
   */
  async getDatabaseStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const client = await this.pool.connect();

      try {
        // Vector embeddings statistics from legal_documents table
        const vectorStats = await client.query(`
          SELECT
            COUNT(*) FILTER (WHERE embedding IS NOT NULL) as total_embeddings,
            COUNT(*) as total_documents,
            MIN(created_at) as earliest_document,
            MAX(created_at) as latest_document
          FROM legal_documents
        `);

        // Legal documents statistics by type
        const docStats = await client.query(`
          SELECT
            COUNT(*) as total_documents,
            COUNT(DISTINCT document_type) as unique_types,
            document_type,
            COUNT(*) as count_per_type
          FROM legal_documents
          WHERE document_type IS NOT NULL
          GROUP BY document_type
          ORDER BY count_per_type DESC
        `);

        // Additional vector/embedding tables statistics
        const additionalStats = await client.query(`
          SELECT
            'embedding_cache' as table_name,
            COUNT(*) as record_count
          FROM embedding_cache
          UNION ALL
          SELECT
            'vector_metadata' as table_name,
            COUNT(*) as record_count
          FROM vector_metadata
          UNION ALL
          SELECT
            'vector_operations' as table_name,
            COUNT(*) as record_count
          FROM vector_operations
        `);

        // Index information
        const indexStats = await client.query(`
          SELECT
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes
          WHERE tablename IN ('legal_documents', 'embedding_cache', 'vector_metadata', 'vector_operations')
          ORDER BY tablename, indexname
        `);

        // Database size information
        const sizeStats = await client.query(`
          SELECT
            pg_size_pretty(pg_database_size(current_database())) as database_size,
            pg_size_pretty(pg_total_relation_size('legal_documents')) as documents_table_size,
            pg_size_pretty(pg_total_relation_size('embedding_cache')) as embedding_cache_size,
            pg_size_pretty(pg_total_relation_size('vector_metadata')) as vector_metadata_size
        `);

        return {
          success: true,
          stats: {
            vectors: vectorStats.rows[0],
            documents: docStats.rows,
            additionalTables: additionalStats.rows,
            indexes: indexStats.rows,
            sizes: sizeStats.rows[0],
            connectionPool: {
              total: this.pool.totalCount,
              idle: this.pool.idleCount,
              waiting: this.pool.waitingCount,
            },
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close database connections gracefully
   * Best Practice: Cleanup resources
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('📡 PostgreSQL connection pool closed');
    } catch (error) {
      console.error('Error closing PostgreSQL pool:', error);
    }
  }
}

// Export singleton instance
export const pgVectorService = new PgVectorService();
