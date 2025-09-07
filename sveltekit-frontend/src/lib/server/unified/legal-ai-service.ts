/**
 * Unified Legal AI Service
 * Integrates: MinIO storage, Qdrant vectors, PostgreSQL metadata, Redis cache, Neo4j recommendations
 */

import { db } from '../db';
import { evidence, cases, documents } from '../db/unified-schema';
import { cache } from '../cache/redis';
import { minioStorage } from '../storage/minio';
import { qdrantStore } from '../vector/qdrant';
import { embedText } from '../ai/embedder';
import { createId } from '@paralleldrive/cuid2';
import { eq, sql } from 'drizzle-orm';

export interface DocumentUpload {
  file: Buffer;
  fileName: string;
  contentType: string;
  caseId?: string;
  documentType: 'evidence' | 'legal_document' | 'contract' | 'brief';
  metadata?: any;
}

export interface SearchOptions {
  query: string;
  type?: 'evidence' | 'documents' | 'all';
  limit?: number;
  threshold?: number;
  caseId?: string;
  useRecommendations?: boolean;
  cacheResults?: boolean;
}

export class UnifiedLegalAIService {
  
  /**
   * Complete document upload pipeline:
   * 1. Extract text content (OCR for PDFs/images)
   * 2. Store file in MinIO
   * 3. Generate embeddings
   * 4. Store in Qdrant vector database
   * 5. Store metadata in PostgreSQL
   * 6. Cache frequently accessed data in Redis
   * 7. Update Neo4j relationships
   */
  async uploadDocument(upload: DocumentUpload): Promise<{
    id: string;
    fileUrl: string;
    embeddingId: string;
    cached: boolean;
  }> {
    const documentId = createId();
    
    try {
      // Step 1: Extract text content (simplified - implement OCR for production)
      let textContent = '';
      if (upload.contentType === 'text/plain') {
        textContent = upload.file.toString('utf-8');
      } else {
        // TODO: Implement OCR for PDFs, images, etc.
        textContent = upload.fileName; // Placeholder
      }

      // Step 2: Store file in MinIO
      const minioResult = upload.documentType === 'evidence' 
        ? await minioStorage.uploadEvidence(upload.file, upload.fileName, {
            contentType: upload.contentType,
            caseId: upload.caseId,
            documentType: upload.documentType
          })
        : await minioStorage.uploadDocument(upload.file, upload.fileName, {
            contentType: upload.contentType,
            documentType: upload.documentType
          });

      // Step 3: Generate embeddings and store in Qdrant
      const vectorResult = upload.documentType === 'evidence'
        ? await qdrantStore.upsertEvidence(documentId, textContent, {
            case_id: upload.caseId,
            file_name: upload.fileName,
            document_type: upload.documentType,
            minio_object: minioResult.objectName,
            ...upload.metadata
          })
        : await qdrantStore.upsertDocument(documentId, textContent, {
            file_name: upload.fileName,
            document_type: upload.documentType,
            minio_object: minioResult.objectName,
            ...upload.metadata
          });

      // Step 4: Store metadata in PostgreSQL
      const dbRecord = upload.documentType === 'evidence' 
        ? await db.insert(evidence).values({
            id: documentId,
            case_id: upload.caseId!,
            file_name: upload.fileName,
            file_path: minioResult.objectName,
            file_type: upload.contentType,
            file_size: minioResult.size,
            ocr_content: textContent,
            minio_url: minioResult.url,
            qdrant_id: documentId,
            created_at: new Date(),
            updated_at: new Date()
          }).returning()
        : await db.insert(documents).values({
            id: documentId,
            title: upload.fileName,
            file_path: minioResult.objectName,
            file_type: upload.contentType,
            file_size: minioResult.size,
            content: textContent,
            minio_url: minioResult.url,
            qdrant_id: documentId,
            document_type: upload.documentType,
            created_at: new Date(),
            updated_at: new Date()
          }).returning();

      // Step 5: Cache the document for fast access
      const cacheKey = `document:${documentId}`;
      await cache.set(cacheKey, {
        id: documentId,
        fileName: upload.fileName,
        textContent: textContent.substring(0, 500), // Cache first 500 chars
        minioUrl: minioResult.url,
        embedding: vectorResult.embedding.slice(0, 10), // Cache first 10 dimensions for quick similarity checks
        metadata: upload.metadata
      }, 24 * 60 * 60 * 1000); // Cache for 24 hours

      // Step 6: Update Neo4j relationships (if case provided)
      if (upload.caseId) {
        await this.updateNeo4jRelationships(documentId, upload.caseId, upload.documentType);
      }

      return {
        id: documentId,
        fileUrl: minioResult.url,
        embeddingId: vectorResult.id,
        cached: true
      };

    } catch (error) {
      console.error('Document upload pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Unified search across all storage systems
   * Uses Qdrant for vector similarity, PostgreSQL for metadata filtering,
   * Redis for caching, and Neo4j for recommendations
   */
  async searchDocuments(options: SearchOptions): Promise<{
    results: any[];
    recommendations?: any[];
    cached: boolean;
    sources: string[];
  }> {
    const cacheKey = `search:${JSON.stringify(options)}`;
    
    // Check cache first
    if (options.cacheResults !== false) {
      const cachedResults = await cache.get(cacheKey);
      if (cachedResults) {
        console.log('🚀 Search cache hit');
        return { ...cachedResults, cached: true };
      }
    }

    const results = [];
    const sources = [];

    try {
      // Vector search in Qdrant
      if (options.type === 'evidence' || options.type === 'all') {
        const evidenceResults = await qdrantStore.searchEvidence(options.query, {
          limit: options.limit || 10,
          threshold: options.threshold || 0.7,
          excludeCaseId: options.caseId
        });
        
        // Enrich with PostgreSQL metadata
        for (const result of evidenceResults) {
          const dbRecord = await db.select().from(evidence).where(eq(evidence.id, result.id)).limit(1);
          if (dbRecord.length > 0) {
            results.push({
              ...result,
              ...dbRecord[0],
              type: 'evidence',
              source: 'qdrant+postgresql'
            });
          }
        }
        sources.push('qdrant', 'postgresql');
      }

      if (options.type === 'documents' || options.type === 'all') {
        const documentResults = await qdrantStore.searchDocuments(options.query, {
          limit: options.limit || 10,
          threshold: options.threshold || 0.7
        });

        // Enrich with PostgreSQL metadata
        for (const result of documentResults) {
          const dbRecord = await db.select().from(documents).where(eq(documents.id, result.id)).limit(1);
          if (dbRecord.length > 0) {
            results.push({
              ...result,
              ...dbRecord[0],
              type: 'document',
              source: 'qdrant+postgresql'
            });
          }
        }
        sources.push('qdrant', 'postgresql');
      }

      // Get Neo4j recommendations if requested
      let recommendations = [];
      if (options.useRecommendations && options.caseId) {
        recommendations = await this.getNeo4jRecommendations(options.caseId, options.query);
        sources.push('neo4j');
      }

      const searchResults = {
        results: results.slice(0, options.limit || 20),
        recommendations,
        cached: false,
        sources
      };

      // Cache results
      if (options.cacheResults !== false) {
        await cache.set(cacheKey, searchResults, 5 * 60 * 1000); // Cache for 5 minutes
      }

      return searchResults;

    } catch (error) {
      console.error('Unified search failed:', error);
      throw error;
    }
  }

  /**
   * Get document with all associated data from all systems
   */
  async getDocument(id: string): Promise<{
    metadata: any;
    fileUrl: string;
    textContent: string;
    similarDocuments: any[];
    recommendations: any[];
  }> {
    const cacheKey = `full_document:${id}`;
    
    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get from PostgreSQL
      const evidenceRecord = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
      const documentRecord = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
      
      const record = evidenceRecord.length > 0 ? evidenceRecord[0] : documentRecord[0];
      if (!record) {
        throw new Error(`Document ${id} not found`);
      }

      // Get MinIO URL
      const fileUrl = record.minio_url || await minioStorage.getPresignedUrl(
        evidenceRecord.length > 0 ? 'legal-evidence' : 'legal-documents',
        record.file_path
      );

      // Get similar documents from Qdrant
      const textForSimilarity = record.ocr_content || record.content || record.title;
      const similarDocs = await qdrantStore.searchDocuments(textForSimilarity, { limit: 5 });

      // Get Neo4j recommendations
      const recommendations = await this.getNeo4jRecommendations(record.case_id || id, textForSimilarity);

      const result = {
        metadata: record,
        fileUrl,
        textContent: record.ocr_content || record.content || '',
        similarDocuments: similarDocs,
        recommendations
      };

      // Cache the result
      await cache.set(cacheKey, result, 60 * 60 * 1000); // Cache for 1 hour

      return result;

    } catch (error) {
      console.error('Get document failed:', error);
      throw error;
    }
  }

  /**
   * Update Neo4j relationships for recommendations
   */
  private async updateNeo4jRelationships(documentId: string, caseId: string, documentType: string): Promise<void> {
    try {
      // TODO: Implement Neo4j driver connection and relationship updates
      // This would create nodes and relationships for document-case-evidence connections
      console.log(`📊 Would update Neo4j relationships for ${documentId} in case ${caseId}`);
    } catch (error) {
      console.error('Neo4j update failed:', error);
    }
  }

  /**
   * Get recommendations from Neo4j based on case relationships
   */
  private async getNeo4jRecommendations(caseId: string, query: string): Promise<any[]> {
    try {
      // TODO: Implement Neo4j recommendations based on case relationships
      // This would find similar cases, related precedents, relevant statutes, etc.
      console.log(`🔍 Would get Neo4j recommendations for case ${caseId} with query: ${query}`);
      return [];
    } catch (error) {
      console.error('Neo4j recommendations failed:', error);
      return [];
    }
  }

  /**
   * Health check for all integrated systems
   */
  async healthCheck(): Promise<{
    postgresql: boolean;
    redis: boolean;
    minio: boolean;
    qdrant: boolean;
    neo4j: boolean;
  }> {
    const health = {
      postgresql: false,
      redis: false,
      minio: false,
      qdrant: false,
      neo4j: false
    };

    try {
      // Test PostgreSQL
      await db.execute(sql`SELECT 1`);
      health.postgresql = true;
    } catch (error) {
      console.warn('PostgreSQL health check failed:', error);
    }

    try {
      // Test Redis
      await cache.set('health_check', 'ok', 1000);
      health.redis = true;
    } catch (error) {
      console.warn('Redis health check failed:', error);
    }

    try {
      // Test MinIO
      await minioStorage.listFiles('legal-evidence', '');
      health.minio = true;
    } catch (error) {
      console.warn('MinIO health check failed:', error);
    }

    try {
      // Test Qdrant
      await qdrantStore.getCollectionInfo('legal_documents');
      health.qdrant = true;
    } catch (error) {
      console.warn('Qdrant health check failed:', error);
    }

    // TODO: Add Neo4j health check
    
    return health;
  }
}

// Singleton instance
export const legalAI = new UnifiedLegalAIService();