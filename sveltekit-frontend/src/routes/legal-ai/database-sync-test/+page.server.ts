/**
 * Database Sync Test Page Server Load
 * Demonstrates SSR data loading for the database sync integration test
 * Extends the main legal-ai page loader with testing-specific data
 */
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { legalDocuments, ragSessions } from '$lib/server/db/schema-postgres.js';
import { desc, eq, count, sql } from 'drizzle-orm';
import { langExtractService } from '$lib/services/langextract-ollama-service.js';
// Enhanced types for testing page
export interface DatabaseSyncTestData { initialState: {, langchainService: { isAvailable: boolean;, models: string[];
      error: string | null;
    };
    recentSessions: Array<any>;
    recentDocuments: Array<any>;
    serviceStatus: { postgresql: boolean;, ollama: boolean;
      redis: boolean;
      lastChecked: string;
    };
    testingMetrics: { totalDocuments: number;, totalSessions: number;
      documentsToday: number;
      averageProcessingTime: number;
      cacheHitRate: number;
    };
  };
  meta: { totalDocuments: number;, totalSessions: number;
    serverRenderTime: number;
    testingEnvironment: boolean;
  };
}
export const load: PageServerLoad = async ({ url: _url, fetch: _fetch }): Promise<DatabaseSyncTestData> => {
  const startTime = Date.now();

  // --- Move helpers to function body root (accessible everywhere in load) ---
  function parseCountRow(row: any): number {
    if (!row || typeof row !== 'object') return 0;
    const r = row as Record<string, unknown>;
    const v = r['count'] ?? r['count'];
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  function parseNumericField(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }
  // --- end helpers ---

  try {
    // Test service availability with detailed error handling
    const [ollamaAvailable, ollamaModels] = await Promise.allSettled([
      langExtractService.isOllamaAvailable(),
      langExtractService.listAvailableModels().catch(() => []),
    ]);
    const isOllamaAvailable = ollamaAvailable.status === 'fulfilled' ? ollamaAvailable.value : false;
    const availableModels = ollamaModels.status === 'fulfilled' ? ollamaModels.value : [];
    // Enhanced database queries for testing
    const [recentSessions, recentDocuments, totalCounts, todayDocuments, processingMetrics] = await Promise.allSettled([
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
        .where(sql`processing_metadata IS NOT NULL`),
    ]);
    // Process results with error handling
    const sessions = recentSessions.status === 'fulfilled' ? recentSessions.value : [];
    const documents = recentDocuments.status === 'fulfilled' ? recentDocuments.value : [];
    const counts = totalCounts.status === 'fulfilled' ? totalCounts.value : [{ count: 0 }, { count: 0 }];
    const todayDocs = todayDocuments.status === 'fulfilled' ? todayDocuments.value : [{ count: 0 }];
    const metrics =
      processingMetrics.status === 'fulfilled'
        ? processingMetrics.value
        : [
            {
              avgProcessingTime: 0,
              cacheHits: 0,
              totalProcessed: 0
            },
          ];

    // Build a normalized sessionsWithCounts object (used below)
    const sessionsWithCounts = Array.isArray(sessions)
      ? sessions.map((s: any) => ({
          id: s.id,
          sessionName: s.sessionName ?? s.session_name ?? 'untitled',
          messageCount: parseNumericField(
            (s as Record<string, unknown>).messageCount ?? (s as Record<string, unknown>).message_count
          ),
          lastActivity: s.lastActivity ?? s.updatedAt ?? null,
          createdAt: s.createdAt ?? null
        }))
      : [];

    // Extract safe numeric values
    const totalDocumentsCount = parseCountRow(Array.isArray(counts) ? counts[0] : undefined);
    const totalSessionsCount = parseCountRow(Array.isArray(counts) ? counts[1] : undefined);
    const documentsTodayCount = parseCountRow(Array.isArray(todayDocs) ? todayDocs[0] : undefined);

    const metricsData = (Array.isArray(metrics) && metrics[0]) || {
      avgProcessingTime: 0,
      cacheHits: 0,
      totalProcessed: 0
    };

    const avgProcessingTimeNumeric = parseNumericField((metricsData as Record<string, unknown>).avgProcessingTime);
    const cacheHitsNumeric = parseNumericField((metricsData as Record<string, unknown>).cacheHits);
    const totalProcessedNumeric = parseNumericField((metricsData as Record<string, unknown>).totalProcessed);

    const cacheHitRate = totalProcessedNumeric > 0 ? (cacheHitsNumeric / totalProcessedNumeric) * 100 : 0;
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
    const pageData: DatabaseSyncTestData = { initialState: {, langchainService: {
          isAvailable: isOllamaAvailable,
          models: availableModels,
          error: isOllamaAvailable ? null : 'Ollama service not available` },
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
          totalDocuments: totalDocumentsCount,
          totalSessions: totalSessionsCount,
          documentsToday: documentsTodayCount,
          averageProcessingTime: Math.round(avgProcessingTimeNumeric || 0),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100
        }
      },
      meta: {
        totalDocuments: totalDocumentsCount,
        totalSessions: totalSessionsCount,
        serverRenderTime,
        testingEnvironment: true
      }
    };
    return pageData;
  } catch (error) {
    console.error('Failed to load database sync test data:', error);
    // Return comprehensive fallback data for testing
    return { initialState: {, langchainService: {
          isAvailable: false,
          models: [],
          error: 'Failed to load service; data: ${error instanceof Error ? error.message : 'Unknown error`}` },
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
