/**
 * RAG Document Indexing API Endpoint
 * 
 * Provides API for indexing legal documents into the vector database:
 * - Automatic text chunking optimized for legal content
 * - Vector embedding generation with Gemma embeddings
 * - Metadata extraction and storage
 * - Bulk document processing support
 * 
 * @route POST /api/rag/index-document
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { enhancedRAGPipeline } from '$lib/services/enhanced-rag-pipeline';
import { db, sql } from '$lib/server/db/drizzle';
import * as schema from '$lib/server/db/schema-postgres';
import type { LegalDocument, NewLegalDocument } from '$lib/server/db/schema-postgres';
import { authenticate } from '$lib/server/auth'; // Assuming auth helper exists

export const POST: RequestHandler = async ({ request, cookies }) => {
  const startTime = Date.now();
  
  try {
    // Authentication required for document indexing
    const user = await authenticate(cookies);
    if (!user) {
      return json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const requestData = await request.json();
    const { documents, mode = 'single' } = requestData;

    // Handle both single document and bulk processing
    const documentsToProcess = mode === 'bulk' && Array.isArray(documents) 
      ? documents 
      : [requestData];

    const results = [];
    let totalChunks = 0;
    let successCount = 0;
    let failureCount = 0;

    for (const docData of documentsToProcess) {
      try {
        const result = await processDocument(docData, user.id);
        results.push(result);
        
        if (result.success) {
          totalChunks += result.chunksCreated;
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error: any) {
        results.push({
          success: false,
          documentId: docData.id || 'unknown',
          error: error.message,
          chunksCreated: 0
        });
        failureCount++;
      }
    }

    const summary = {
      totalDocuments: documentsToProcess.length,
      successCount,
      failureCount,
      totalChunksCreated: totalChunks,
      processingTime: Date.now() - startTime
    };

    console.log(`📚 Document indexing completed:`, summary);

    return json({
      success: failureCount === 0,
      mode,
      summary,
      results: mode === 'single' ? results[0] : results
    });

  } catch (error: any) {
    console.error('Document Indexing API Error:', error);
    
    return json({
      success: false,
      error: 'Failed to process document indexing request',
      processingTime: Date.now() - startTime
    }, { status: 500 });
  }
};

/**
 * Process a single document for indexing
 */
async function processDocument(docData: any, userId: string): Promise<{
  success: boolean;
  documentId: string;
  chunksCreated: number;
  error?: string;
}> {
  // Input validation
  const requiredFields = ['title', 'documentType', 'content'];
  for (const field of requiredFields) {
    if (!docData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate document type
  const validTypes = ['contract', 'evidence', 'brief', 'citation', 'statute', 'precedent', 'regulation', 'case_law'];
  if (!validTypes.includes(docData.documentType)) {
    throw new Error(`Invalid document type: ${docData.documentType}. Valid types: ${validTypes.join(', ')}`);
  }

  let documentId = docData.id;
  let document: LegalDocument;

  // If document ID provided, update existing document, otherwise create new one
  if (documentId) {
    // Update existing document
    const existingDoc = await db
      .select()
      .from(schema.legalDocuments)
      .where(sql`id = ${documentId}`)
      .limit(1);

    if (existingDoc.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const updateData: Partial<NewLegalDocument> = {
      title: docData.title,
      documentType: docData.documentType,
      jurisdiction: docData.jurisdiction,
      court: docData.court,
      citation: docData.citation,
      fullCitation: docData.fullCitation,
      docketNumber: docData.docketNumber,
      dateDecided: docData.dateDecided,
      datePublished: docData.datePublished,
      fullText: docData.content,
      content: docData.content,
      summary: docData.summary,
      headnotes: docData.headnotes,
      keywords: docData.keywords || [],
      topics: docData.topics || [],
      parties: docData.parties || {},
      judges: docData.judges || [],
      attorneys: docData.attorneys || {},
      outcome: docData.outcome,
      precedentialValue: docData.precedentialValue,
      url: docData.url,
      pdfUrl: docData.pdfUrl,
      westlawId: docData.westlawId,
      lexisId: docData.lexisId,
      caseId: docData.caseId,
      evidenceId: docData.evidenceId,
      updatedAt: new Date().toISOString()
    };

    await db
      .update(schema.legalDocuments)
      .set(updateData)
      .where(sql`id = ${documentId}`);

    document = { ...existingDoc[0], ...updateData } as LegalDocument;

    // Delete existing chunks to avoid duplicates
    await db
      .delete(schema.documentChunks)
      .where(sql`document_id = ${documentId}`);

  } else {
    // Create new document
    const newDocData: NewLegalDocument = {
      title: docData.title,
      documentType: docData.documentType,
      jurisdiction: docData.jurisdiction,
      court: docData.court,
      citation: docData.citation,
      fullCitation: docData.fullCitation,
      docketNumber: docData.docketNumber,
      dateDecided: docData.dateDecided ? new Date(docData.dateDecided).toISOString() : undefined,
      datePublished: docData.datePublished ? new Date(docData.datePublished).toISOString() : undefined,
      fullText: docData.content,
      content: docData.content,
      summary: docData.summary,
      headnotes: docData.headnotes,
      keywords: docData.keywords || [],
      topics: docData.topics || [],
      parties: docData.parties || {},
      judges: docData.judges || [],
      attorneys: docData.attorneys || {},
      outcome: docData.outcome,
      precedentialValue: docData.precedentialValue,
      url: docData.url,
      pdfUrl: docData.pdfUrl,
      westlawId: docData.westlawId,
      lexisId: docData.lexisId,
      caseId: docData.caseId,
      evidenceId: docData.evidenceId,
      isActive: true,
      isDirty: false,
      createdBy: userId,
      embedding: null // Will be generated during chunking
    };

    const insertedDocs = await db
      .insert(schema.legalDocuments)
      .values(newDocData)
      .returning({ id: schema.legalDocuments.id });

    documentId = insertedDocs[0].id;
    document = { ...newDocData, id: documentId } as LegalDocument;
  }

  // Index the document using the RAG pipeline
  const indexResult = await enhancedRAGPipeline.indexDocument(document);

  if (!indexResult.success) {
    throw new Error(indexResult.error || 'Failed to index document');
  }

  return {
    success: true,
    documentId,
    chunksCreated: indexResult.chunksCreated
  };
}

// GET endpoint for indexing status and statistics
export const GET: RequestHandler = async ({ url }) => {
  try {
    const documentId = url.searchParams.get('documentId');

    if (documentId) {
      // Get indexing status for specific document
      const chunks = await db
        .select({
          count: sql`COUNT(*)`,
          totalSize: sql`SUM(LENGTH(content))`,
          avgRelevance: sql`AVG(CASE WHEN metadata->>'relevanceScore' IS NOT NULL THEN (metadata->>'relevanceScore')::float ELSE NULL END)`
        })
        .from(schema.documentChunks)
        .where(sql`document_id = ${documentId}`);

      const document = await db
        .select()
        .from(schema.legalDocuments)
        .where(sql`id = ${documentId}`)
        .limit(1);

      if (document.length === 0) {
        return json({
          success: false,
          error: 'Document not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        document: {
          id: document[0].id,
          title: document[0].title,
          documentType: document[0].documentType,
          jurisdiction: document[0].jurisdiction
        },
        indexingStatus: {
          isIndexed: Number(chunks[0].count) > 0,
          chunkCount: Number(chunks[0].count) || 0,
          totalContentSize: Number(chunks[0].totalSize) || 0,
          averageRelevance: Number(chunks[0].avgRelevance) || 0,
          lastIndexed: document[0].updatedAt
        }
      });
    } else {
      // Get overall indexing statistics
      const stats = await enhancedRAGPipeline.getSystemStats();
      
      return json({
        success: true,
        systemStats: stats
      });
    }

  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};

// DELETE endpoint for removing document from index
export const DELETE: RequestHandler = async ({ request, cookies }) => {
  try {
    const user = await authenticate(cookies);
    if (!user) {
      return json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { documentId } = await request.json();

    if (!documentId) {
      return json({
        success: false,
        error: 'Document ID is required'
      }, { status: 400 });
    }

    // Delete document chunks
    const deletedChunks = await db
      .delete(schema.documentChunks)
      .where(sql`document_id = ${documentId}`)
      .returning({ id: schema.documentChunks.id });

    // Mark document as inactive (soft delete)
    await db
      .update(schema.legalDocuments)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(sql`id = ${documentId}`);

    return json({
      success: true,
      documentId,
      chunksRemoved: deletedChunks.length,
      message: 'Document removed from search index'
    });

  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};