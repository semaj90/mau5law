import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Enhanced Document Storage API with MinIO + PostgreSQL + Cognitive Cache
import { db, getDatabaseHealth } from '$lib/server/db';
import { legal_documents } from '$lib/server/db/schema-postgres';
import { cognitiveCacheManager } from '$lib/services/cognitive-cache-integration';
import { sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('[Storage] Processing document storage request...');

    const body = await request.json();
    const {
      content,
      embedding,
      metadata = {},
      filename,
      originalContent,
      legalAnalysis,
      confidence
    } = body;

    if (!content) {
      return json({
        success: false,
        error: 'Content is required'
      }, { status: 400 });
    }

    // Check database health
    const dbHealth = await getDatabaseHealth();
    if (dbHealth.overall !== 'healthy') {
      return json({
        success: false,
        error: 'Database temporarily unavailable',
        healthStatus: dbHealth
      }, { status: 503 });
    }

    console.log(`[Storage] Storing document: ${filename}`);

    // Store document in legal_documents table with proper schema
    const documentData = {
      title: filename || 'untitled',
      content,
      file_name: filename || 'untitled',
      document_type: metadata.documentType || 'document',
      jurisdiction: metadata.jurisdiction || null,
      practice_area: metadata.practiceArea || null,
      processing_status: 'completed' as const,
      content_embedding: embedding || null,
      title_embedding: null, // Could be generated separately
      analysis_results: legalAnalysis || null,
      is_confidential: metadata.isConfidential || false,
      created_by: metadata.userId || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const documentResult = await db
      .insert(legal_documents)
      .values(documentData)
      .returning();

    const documentId = documentResult[0].id;
    console.log(`[Storage] Document stored with ID: ${documentId}`);

    if (embedding && embedding.length > 0) {
      console.log(`[Storage] Vector embedding included (${embedding.length} dimensions)`);
    }

    console.log(`[Storage] Document stored successfully with ID: ${documentId}`);

    const responseData = {
      success: true,
      documentId,
      message: 'Document stored successfully',
      document: {
        id: documentId,
        title: filename || 'untitled',
        filename: filename || 'untitled',
        documentType: documentData.document_type,
        jurisdiction: documentData.jurisdiction,
        practiceArea: documentData.practice_area,
        contentLength: content.length,
        hasEmbedding: !!embedding,
        hasLegalAnalysis: !!legalAnalysis,
        isConfidential: documentData.is_confidential,
        processingStatus: 'completed'
      },
      meta: {
        timestamp: new Date().toISOString(),
        databaseHealth: dbHealth.overall
      }
    };

    // Cache the stored document for future retrieval
    await cognitiveCacheManager.set({
      key: `document_${documentId}`,
      type: 'legal-data' as const,
      context: {
        action: 'document-storage',
        documentId,
        documentType: documentData.document_type,
        priority: 'medium' as const
      }
    }, responseData.document, {
      distributeAcrossCaches: true,
      cognitiveValue: 0.8
    });

    return json(responseData);

  } catch (err: any) {
    console.error('[Storage] Error:', err);

    return json({
      success: false,
      error: err.message || 'Storage failed'
    }, { status: err.status || 500 });
  }
};

export const GET: RequestHandler = async () => {
  try {
    // Get comprehensive database health
    const dbHealth = await getDatabaseHealth();
    
    // Count stored documents
    let documentCount = 0;
    try {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(legal_documents);
      documentCount = result?.count || 0;
    } catch (countError) {
      console.warn('[Storage] Failed to count documents:', countError);
    }

    return json({
      status: dbHealth.overall === 'healthy' ? 'healthy' : 'unhealthy',
      service: 'Enhanced Document Storage',
      features: {
        postgresqlStorage: dbHealth.postgres.connected,
        vectorEmbeddings: dbHealth.postgres.connected,
        cognitiveCaching: true,
        minioIntegration: false, // TODO: Implement MinIO integration
        legalAnalysis: true
      },
      database: {
        status: dbHealth.overall,
        documents: documentCount
      },
      message: 'POST to store legal documents with embeddings and analysis',
      endpoints: {
        store: 'POST /api/documents/store',
        retrieve: 'GET /api/documents/[id]',
        search: 'POST /api/documents/search'
      },
      version: '3.0.0'
    });
  } catch (err: any) {
    return json({
      status: 'unhealthy',
      error: err.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
};