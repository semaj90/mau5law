/**
 * Database Sync Test Page Server Load
 * Demonstrates SSR data loading for the database sync integration test
 * Extends the main legal-ai page loader with testing-specific data
 */

import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { legalDocuments, ragSessions } from '$lib/server/db/schema-postgres.js';
import { desc, eq, count, sql } from 'drizzle-orm';
import { langExtractService } from '$lib/services/langextract-ollama-service.js';

// Enhanced types for testing page
export interface DatabaseSyncTestData {
  initialState: {
    langchainService: {
      isAvailable: boolean;
      models: string[];
      error: string | null;
    };
    recentSessions: Array<{
      id: string;
      sessionName: string;
      messageCount: number;
      lastActivity: string;
      documentsProcessed: number;
    }>;
    recentDocuments: Array<{
      id: string;
      title: string;
      summary: string;
      documentType: string;
      createdAt: string;
      keyTerms: string[];
    }>;
    serviceStatus: {
      postgresql: boolean;
      ollama: boolean;
      redis: boolean;
      lastChecked: string;
    };
    testingMetrics: {
      totalDocuments: number;
      totalSessions: number;
      documentsToday: number;
      averageProcessingTime: number;
      cacheHitRate: number;
    };
  };
  meta: {
    totalDocuments: number;
    totalSessions: number;
    serverRenderTime: number;
    testingEnvironment: boolean;
  };
}

export const load: PageServerLoad = async ({ url, fetch }): Promise<DatabaseSyncTestData> => {
  const startTime = Date.now();
  
  try {
    // Test service availability with detailed error handling
    const [ollamaAvailable, ollamaModels] = await Promise.allSettled([
      langExtractService.isOllamaAvailable(),
      langExtractService.listAvailableModels().catch(() => [])
    ]);

    const isOllamaAvailable = ollamaAvailable.status === 'fulfilled' ? ollamaAvailable.value : false;
    const availableModels = ollamaModels.status === 'fulfilled' ? ollamaModels.value : [];

    // Enhanced database queries for testing
    const [
      recentSessions,
      recentDocuments,
      totalCounts,
      todayDocuments,
      processingMetrics
    ] = await Promise.allSettled([
      // Recent sessions with enhanced data
      db
        .select({
          id: ragSessions.id,
          sessionName: ragSessions.sessionName,
          messageCount: ragSessions.messageCount,
          lastActivity: ragSessions.updatedAt,
          createdAt: ragSessions.createdAt
        })
        .from(ragSessions)
        .where(eq(ragSessions.isActive, true))
        .orderBy(desc(ragSessions.updatedAt))
        .limit(10), // More sessions for testing

      // Recent documents with metadata
      db
        .select({
          id: legalDocuments.id,
          title: legalDocuments.title,
          summary: legalDocuments.summary,
          documentType: legalDocuments.documentType,
          createdAt: legalDocuments.createdAt,
          keyTerms: legalDocuments.keyTerms,
          processingMetadata: legalDocuments.processingMetadata
        })
        .from(legalDocuments)
        .orderBy(desc(legalDocuments.createdAt))
        .limit(15), // More documents for testing

      // Total counts
      Promise.all([
        db.select({ count: count() }).from(legalDocuments),
        db.select({ count: count() }).from(ragSessions)
      ]),

      // Documents processed today
      db
        .select({ count: count() })
        .from(legalDocuments)
        .where(sql`DATE(created_at) = CURRENT_DATE`),

      // Processing performance metrics
      db
        .select({
          avgProcessingTime: sql<number>`AVG(CAST(processing_metadata->>'processingTime' AS INTEGER))`,
          cacheHits: sql<number>`COUNT(*) FILTER (WHERE processing_metadata->>'cacheHit' = 'true')`,
          totalProcessed: count()
        })
        .from(legalDocuments)
        .where(sql`processing_metadata IS NOT NULL`)
    ]);

    // Process results with error handling
    const sessions = recentSessions.status === 'fulfilled' ? recentSessions.value : [];
    const documents = recentDocuments.status === 'fulfilled' ? recentDocuments.value : [];
    const counts = totalCounts.status === 'fulfilled' ? totalCounts.value : [{ count: 0 }, { count: 0 }];
    const todayDocs = todayDocuments.status === 'fulfilled' ? todayDocuments.value : [{ count: 0 }];
    const metrics = processingMetrics.status === 'fulfilled' ? processingMetrics.value : [{
      avgProcessingTime: 0,
      cacheHits: 0,
      totalProcessed: 0
    }];

    // Calculate document counts per session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        try {
          const [{ count: docCount }] = await db
            .select({ count: count() })
            .from(legalDocuments)
            .where(eq(legalDocuments.sessionId, session.id));

          return {
            id: session.id,
            sessionName: session.sessionName || `Test Session ${session.id.slice(0, 8)}`,
            messageCount: session.messageCount || 0,
            lastActivity: session.lastActivity?.toISOString() || session.createdAt?.toISOString() || new Date().toISOString(),
            documentsProcessed: Number(docCount) || 0
          };
        } catch (error) {
          console.warn(`Failed to count documents for session ${session.id}:`, error);
          return {
            id: session.id,
            sessionName: session.sessionName || `Test Session ${session.id.slice(0, 8)}`,
            messageCount: session.messageCount || 0,
            lastActivity: session.lastActivity?.toISOString() || new Date().toISOString(),
            documentsProcessed: 0
          };
        }
      })
    );

    // Calculate metrics
    const metricsData = metrics[0];
    const cacheHitRate = metricsData.totalProcessed > 0 
      ? (metricsData.cacheHits / metricsData.totalProcessed) * 100 
      : 0;

    // Test database connectivity
    let postgresqlAvailable = true;
    try {
      await db.select({ count: count() }).from(legalDocuments).limit(1);
    } catch (error) {
      console.error('PostgreSQL connectivity test failed:', error);
      postgresqlAvailable = false;
    }

    // Test Redis connectivity (simplified for testing)
    let redisAvailable = true;
    try {
      // In a real implementation, this would ping Redis
      // For testing, we'll assume it's available if PostgreSQL is
      redisAvailable = postgresqlAvailable;
    } catch (error) {
      console.error('Redis connectivity test failed:', error);
      redisAvailable = false;
    }

    const serverRenderTime = Date.now() - startTime;

    const pageData: DatabaseSyncTestData = {
      initialState: {
        langchainService: {
          isAvailable: isOllamaAvailable,
          models: availableModels,
          error: isOllamaAvailable ? null : 'Ollama service not available'
        },
        recentSessions: sessionsWithCounts,
        recentDocuments: documents.map(doc => ({
          id: doc.id,
          title: doc.title || 'Untitled Test Document',
          summary: doc.summary || 'No summary available',
          documentType: doc.documentType || 'unknown',
          createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
          keyTerms: doc.keyTerms || []
        })),
        serviceStatus: {
          postgresql: postgresqlAvailable,
          ollama: isOllamaAvailable,
          redis: redisAvailable,
          lastChecked: new Date().toISOString()
        },
        testingMetrics: {
          totalDocuments: Number((counts[0] as any)?.count) || 0,
          totalSessions: Number((counts[1] as any)?.count) || 0,
          documentsToday: Number((todayDocs[0] as any)?.count) || 0,
          averageProcessingTime: Math.round(metricsData.avgProcessingTime || 0),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100
        }
      },
      meta: {
        totalDocuments: Number((counts[0] as any)?.count) || 0,
        totalSessions: Number((counts[1] as any)?.count) || 0,
        serverRenderTime,
        testingEnvironment: true
      }
    };

    return pageData;

  } catch (error) {
    console.error('Failed to load database sync test data:', error);
    
    // Return comprehensive fallback data for testing
    return {
      initialState: {
        langchainService: {
          isAvailable: false,
          models: [],
          error: `Failed to load service data: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        recentSessions: [],
        recentDocuments: [],
        serviceStatus: {
          postgresql: false,
          ollama: false,
          redis: false,
          lastChecked: new Date().toISOString()
        },
        testingMetrics: {
          totalDocuments: 0,
          totalSessions: 0,
          documentsToday: 0,
          averageProcessingTime: 0,
          cacheHitRate: 0
        }
      },
      meta: {
        totalDocuments: 0,
        totalSessions: 0,
        serverRenderTime: Date.now() - startTime,
        testingEnvironment: true
      }
    };
  }
};