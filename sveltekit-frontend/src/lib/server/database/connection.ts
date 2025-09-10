import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { 
  casesTable, 
  documentsTable, 
  evidenceTable, 
  timelineEventsTable,
  queryCache,
  analyticsEvents,
  vectorSimilarityView
} from './schema';

// Enhanced PostgreSQL connection with pgvector support
const connectionString = process.env.DATABASE_URL || 'postgres://legal_admin:123456@localhost:5433/legal_ai_db?sslmode=disable';

// Create postgres client with pgvector extension
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // Required for pgvector
});

// Initialize Drizzle with enhanced error handling
export const db = drizzle(client, {
  schema: {
    cases: casesTable,
    documents: documentsTable,
    evidence: evidenceTable,
    timelineEvents: timelineEventsTable,
    queryCache,
    analytics: analyticsEvents,
    vectorSimilarity: vectorSimilarityView
  },
  logger: process.env.NODE_ENV === 'development'
});

// Vector similarity search utilities
export class VectorSearchManager {
  // Semantic document search with pgvector
  async searchSimilarDocuments(queryEmbedding: number[], limit = 10, threshold = 0.7) {
    const query = `
      SELECT 
        id, title, content, metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM legal_documents 
      WHERE 1 - (embedding <=> $1::vector) > $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;
    
    return await client.unsafe(query, [
      `[${queryEmbedding.join(',')}]`,
      threshold,
      limit
    ]);
  }

  // Chat history semantic search for contextual prompting
  async searchChatHistory(userEmbedding: number[], userId: string, limit = 5) {
    const query = `
      SELECT 
        content, role, metadata,
        1 - (content_embedding <=> $1::vector) as similarity
      FROM chat_messages 
      WHERE user_id = $2 
      AND 1 - (content_embedding <=> $1::vector) > 0.6
      ORDER BY content_embedding <=> $1::vector
      LIMIT $3
    `;
    
    return await client.unsafe(query, [
      `[${userEmbedding.join(',')}]`,
      userId,
      limit
    ]);
  }

  // Cache vector similarity calculations for performance
  async cacheVectorSimilarity(sourceId: string, targetId: string, score: number, type: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour cache
    
    await db.insert(vectorSimilarityView).values({
      source_id: sourceId,
      target_id: targetId,
      similarity_score: score,
      similarity_type: type,
      expires_at: expiresAt
    }).onConflictDoNothing();
  }

  // Get cached similarities to avoid recomputation
  async getCachedSimilarity(sourceId: string, targetId: string, type: string) {
    return await db.select()
      .from(vectorSimilarityView)
      .where(sql`
        source_id = ${sourceId} 
        AND target_id = ${targetId} 
        AND similarity_type = ${type}
        AND expires_at > NOW()
      `)
      .limit(1);
  }
}

// Query cache manager for enhanced performance
export class QueryCacheManager {
  async get(cacheKey: string) {
    const result = await db.select()
      .from(queryCache)
      .where(sql`cache_key = ${cacheKey} AND expires_at > NOW()`)
      .limit(1);
    
    if (result.length > 0) {
      // Update access metrics
      await db.update(queryCache)
        .set({
          access_count: sql`access_count + 1`,
          last_accessed: new Date()
        })
        .where(sql`cache_key = ${cacheKey}`);
      
      return result[0].result_data;
    }
    
    return null;
  }

  async set(cacheKey: string, data: any, queryType: string, ttlSeconds = 3600) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
    
    await db.insert(queryCache)
      .values({
        cache_key: cacheKey,
        query_type: queryType,
        result_data: data,
        expires_at: expiresAt
      })
      .onConflictDoUpdate({
        target: [queryCache.cache_key],
        set: {
          result_data: data,
          expires_at: expiresAt,
          access_count: 0
        }
      });
  }

  async invalidate(pattern: string) {
    // Invalidate cache entries matching pattern
    await db.delete(queryCache)
      .where(sql`cache_key LIKE ${`%${pattern}%`}`);
  }
}

// Analytics tracking
export class AnalyticsManager {
  async trackEvent(eventType: string, eventData: any, performanceMetrics: {
    responseTimeMs?: number;
    cacheHit?: boolean;
    cacheLayer?: string;
  } = {}) {
    await db.insert(analyticsEvents).values({
      event_type: eventType,
      event_data: eventData,
      response_time_ms: performanceMetrics.responseTimeMs,
      cache_hit: performanceMetrics.cacheHit,
      cache_layer: performanceMetrics.cacheLayer
    });
  }

  async getPerformanceMetrics(hours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    const query = `
      SELECT 
        event_type,
        AVG(response_time_ms) as avg_response_time,
        COUNT(CASE WHEN cache_hit = true THEN 1 END)::float / COUNT(*)::float as cache_hit_rate,
        COUNT(*) as total_events
      FROM analytics_events 
      WHERE created_at >= $1 
      GROUP BY event_type
      ORDER BY total_events DESC
    `;
    
    return await client.unsafe(query, [since]);
  }
}

// Initialize managers
export const vectorSearch = new VectorSearchManager();
export const queryCache = new QueryCacheManager();
export const analytics = new AnalyticsManager();

// Database health check
export async function checkDatabaseHealth() {
  try {
    await client`SELECT 1`;
    
    // Check pgvector extension
    const extensions = await client`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    
    return {
      connected: true,
      pgvector: extensions.length > 0,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Import sql helper for complex queries
import { sql } from 'drizzle-orm';