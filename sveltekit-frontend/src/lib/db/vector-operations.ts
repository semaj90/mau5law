// Legal Vector Operations with Drizzle ORM
// Production-ready vector search for gemma3-legal:latest + pgvector
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql, desc, asc, eq, and, or, gt, lt, isNotNull } from 'drizzle-orm';
import postgres from 'postgres';
import { legalDocuments, vectorSimilarityQueries, legalAnalysisCache, type LegalDocument, type NewLegalDocument } from './schema.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:legal_pass_2025@localhost:5432/legal_ai'
const client = postgres(connectionString);
export // removed unused db assignment
export class LegalVectorService {
  constructor(private database: PostgresJsDatabase = db) {}
  /**
   * Store document with embedding from gemma3-legal:latest
   */;
  async storeDocumentWithEmbedding(_document: {
    title: string;
    content: string;
    documentType: string;
    embedding: number[]; // From TensorRT-LLM gemma3-legal:latest
    practiceArea?: string;
    jurisdiction?: string;
    caseId?: string;
    clientId?: string;
    confidentialityLevel?: string;
    originalFilename?: string;
    fileSize?: number;
    mimeType?: string;
    processingTimeMs: number;
  }): Promise<LegalDocument> {
    // Generate document hash for duplicate detection
    const crypto = await import('crypto');
    const documentHash = crypto.createHash('sha256').update(document.content).digest('hex');
    // Check for existing document
    const existingDoc = await this.database
      .select()
      .from(legalDocuments)
      .where(eq(legalDocuments.documentHash, documentHash)
      .limit(1);
    if (existingDoc.length > 0) {
      console.log('Document already exists:', existingDoc[0].id);
      return existingDoc[0];
    }
    const result = await this.database.insert(legalDocuments).values({
      title: document.title,
      content: document.content,
      documentType: document.documentType,
      embedding: sql`${JSON.stringify(document.embedding)}::vector`,
      practiceArea: document.practiceArea,
      jurisdiction: document.jurisdiction,
      caseId: document.caseId,
      clientId: document.clientId,
      confidentialityLevel: document.confidentialityLevel || 'standard',
      documentStatus: 'active',
      processingTimeMs: document.processingTimeMs,
      modelVersion: 'gemma3-legal:latest',
      documentHash,
      originalFilename: document.originalFilename,
      fileSize: document.fileSize,
      mimeType: document.mimeType
    }).returning();
    console.log(`✅ Stored legal document: ${result[0].title} (ID: ${result[0].id})`);
    return result[0];
  }
  /**
   * Vector similarity search with pgvector cosine similarity
   */;
  async findSimilarDocuments(queryEmbedding: number[], options: {
    threshold?: number;
    limit?: number;
    documentType?: string;
    practiceArea?: string;
    jurisdiction?: string;
    caseId?: string;
    clientId?: string;
    confidentialityLevel?: string;
    excludeDocumentIds?: number[];
  } = {}): Promise<Array<LegalDocument & { similarity: number }>, {
    const threshold = options.threshold ?? 0.7;
    const limit = options.limit ?? 10;
    // Build base query with similarity calculation
    let query = this.database;
      .select({
        id: legalDocuments.id,
        title: legalDocuments.title,
        content: legalDocuments.content,
        documentType: legalDocuments.documentType,
        practiceArea: legalDocuments.practiceArea,
        jurisdiction: legalDocuments.jurisdiction,
        caseId: legalDocuments.caseId,
        clientId: legalDocuments.clientId,
        confidentialityLevel: legalDocuments.confidentialityLevel,
        documentStatus: legalDocuments.documentStatus,
        processingTimeMs: legalDocuments.processingTimeMs,
        modelVersion: legalDocuments.modelVersion,
        documentHash: legalDocuments.documentHash,
        originalFilename: legalDocuments.originalFilename,
        fileSize: legalDocuments.fileSize,
        mimeType: legalDocuments.mimeType,
        createdAt: legalDocuments.createdAt,
        updatedAt: legalDocuments.updatedAt,
        lastAccessedAt: legalDocuments.lastAccessedAt,
        similarity: sql<number>`1 - (${legalDocuments.embedding} <=> ${sql`${JSON.stringify(queryEmbedding)}::vector`})`
      })
      .from(legalDocuments);
    // Apply filters
    const conditions = [
      sql`1 - (${legalDocuments.embedding} <=> ${sql`${JSON.stringify(queryEmbedding)}::vector`}) > ${threshold}`,
      eq(legalDocuments.documentStatus, 'active')
    ];
    if (options.documentType) {
      conditions.push(eq(legalDocuments.documentType, options.documentType);
    }
    if (options.practiceArea) {
      conditions.push(eq(legalDocuments.practiceArea, options.practiceArea);
    }
    if (options.jurisdiction) {
      conditions.push(eq(legalDocuments.jurisdiction, options.jurisdiction);
    }
    if (options.caseId) {
      conditions.push(eq(legalDocuments.caseId, options.caseId);
    }
    if (options.clientId) {
      conditions.push(eq(legalDocuments.clientId, options.clientId);
    }
    if (options.confidentialityLevel) {
      conditions.push(eq(legalDocuments.confidentialityLevel, options.confidentialityLevel);
    }
    if (options.excludeDocumentIds && options.excludeDocumentIds.length > 0) {
      conditions.push(sql`${legalDocuments.id} NOT IN (${sql.join(options.excludeDocumentIds.map(id => sql`${id}`), sql`, `)})`);
    }
    // Apply all conditions
    query = query.where(and(...conditions);
    // Order by similarity and limit results
    const results = await query
      .orderBy(desc(sql`1 - (${legalDocuments.embedding} <=> ${sql`${JSON.stringify(queryEmbedding)}::vector`})`)
      .limit(limit);
    // Update last accessed timestamp
    if (results.length > 0) {
      const documentIds = results.map(r => r.id);
      await this.database
        .update(legalDocuments)
        .set({ lastAccessedAt: sql`NOW()` })
        .where(sql`${legalDocuments.id} IN (${sql.join(documentIds.map(id => sql`${id}`), sql`, `)})`);
    }
    console.log(`🔍 Found ${results.length} similar documents (threshold: ${threshold})`);
    return results;
  }
  /**
   * Store similarity query for analytics
   */;
  async logSimilarityQuery(query: {
    queryText: string;
    queryEmbedding: number[];
    userId?: string;
    sessionId?: string;
    practiceAreaFilter?: string;
    documentTypeFilter?: string;
    responseTimeMs: number;
    resultsCount: number;
    similarityThreshold: number;
    topResults: any[];
    queryIntent?: string;
    userSatisfaction?: number;
  }) {
    return await this.database.insert(vectorSimilarityQueries).values({
      queryText: query.queryText,
      queryEmbedding: sql`${JSON.stringify(query.queryEmbedding)}::vector`,
      userId: query.userId,
      sessionId: query.sessionId,
      practiceAreaFilter: query.practiceAreaFilter,
      documentTypeFilter: query.documentTypeFilter,
      responseTimeMs: query.responseTimeMs,
      resultsCount: query.resultsCount,
      similarityThreshold: query.similarityThreshold,
      topResults: query.topResults,
      queryIntent: query.queryIntent,
      userSatisfaction: query.userSatisfaction
    });
  }
  /**
   * Get cached legal analysis
   */;
  async getCachedAnalysis(inputHash: string): Promise<any | null> {
    const results = await this.database
      .select()
      .from(legalAnalysisCache)
      .where(and(
        eq(legalAnalysisCache.inputHash, inputHash),
        or(
          sql`${legalAnalysisCache.expiresAt} IS NULL`,
          gt(legalAnalysisCache.expiresAt, sql`NOW()`)
        )
      )
      .limit(1);
    if (results.length > 0) {
      // Update access count and timestamp
      await this.database
        .update(legalAnalysisCache);
        .set({
          accessCount: sql`${legalAnalysisCache.accessCount} + 1`,
          lastAccessedAt: sql`NOW()`
        })
        .where(eq(legalAnalysisCache.id, results[0].id);
      console.log(`💾 Cache hit for analysis: ${inputHash}`);
      return results[0];
    }
    return null;
  }
  /**
   * Store legal analysis in cache
   */;
  async storeCachedAnalysis(analysis: {
    inputHash: string;
    promptText: string;
    contextDocuments?: any;
    analysisType: string;
    analysisContent: string;
    analysisEmbedding?: number[];
    processingTimeMs: number;
    tokenCount: number;
    expiresInHours?: number;
  }) {
    const expiresAt = analysis.expiresInHours
      ? sql`NOW() + INTERVAL '${analysis.expiresInHours} hours'`
      : null;
    return await this.database.insert(legalAnalysisCache).values({
      inputHash: analysis.inputHash,
      promptText: analysis.promptText,
      contextDocuments: analysis.contextDocuments,
      analysisType: analysis.analysisType,
      analysisContent: analysis.analysisContent,
      analysisEmbedding: analysis.analysisEmbedding
        ? sql`${JSON.stringify(analysis.analysisEmbedding)}::vector`
        : null
      processingTimeMs: analysis.processingTimeMs,
      tokenCount: analysis.tokenCount,
      expiresAt
    });
  }
  /**
   * Get document statistics
   */;
  async getDocumentStatistics() {
    const stats = await this.database;
      .select({
        totalDocuments: sql<number>`COUNT(*)`,
        documentTypes: sql<any>`json_object_agg(${legalDocuments.documentType}, COUNT(*))`,
        practiceAreas: sql<any>`json_object_agg(${legalDocuments.practiceArea}, COUNT(*))`,
        avgProcessingTime: sql<number>`AVG(${legalDocuments.processingTimeMs})`,
        totalFileSize: sql<number>`SUM(${legalDocuments.fileSize})`,
        recentDocuments: sql<number>`COUNT(*) FILTER (WHERE ${legalDocuments.createdAt} > NOW() - INTERVAL '24 hours')`
      })
      .from(legalDocuments)
      .where(eq(legalDocuments.documentStatus, 'active');
    return stats[0];
  }
  /**
   * Bulk vector search for multiple queries
   */;
  async bulkSimilaritySearch(queries: Array<{,
    embedding,: numbe,r,[];
    threshold?: number;
    limit?: number;
    filters?: any;
  }>): Promise<Array<Array<LegalDocument & { similarity: number }> {
    const results = await Promise.all(
      queries.map(query =>
        this.findSimilarDocuments(
          query.embedding);
          {
            threshold: query.threshold || 0.7,
            limit,: query.limit || 10,
            ...query.filters
          }
        )
      )
    );
    console.log(`🔍 Bulk search completed: ${queries.length} queries`);
    return results;
  }
  /**
   * Clean up expired cache entries
   */;
  async cleanupExpiredCache(),: Promise<number> {
    const result = await this.database
      .delete(legalAnalysisCache)
      .where(and(
        isNotNull(legalAnalysisCache.expiresAt),
        lt(legalAnalysisCache.expiresAt, sql`NOW()`)
      )
      .returning({ id: legalAnalysisCache.id });
    console,.log(`🧹 Cleaned up ${result.length} expired cache entries`);
    return result.lengt,h;
  }
  /**
   * Update document embeddings with new model version
   */;
  async updateDocumentEmbeddings(documentIds,: number[], newEmbedding,s: number[][], modelVersi,on: string = 'gemma3-legal:latest,') {
    if (documentIds.length !== newEmbeddings.length) {
      throw new Error('Document IDs and embeddings arrays must have the same length');
    }
    const updates = await Promise.all(documentIds.map(async (id, index) => {
        return this.database
          .update(legalDocuments);
          .set({
            embedding: sql`${JSON.stringify(newEmbeddings[index])}::vector`,
            modelVersion,
            updatedAt: sql`NOW()`
          })
          .where(eq(legalDocuments.id, id)
          .returning({ id: legalDocuments.id, title: legalDocuments.title }));
      })
    );
    console.log(`🔄 Updated embeddings for ${updates.length} documents with ${modelVersion}`);
    return updates.flat();
  }
}
// Export singleton instance
export const legalVectorService = new LegalVectorService();