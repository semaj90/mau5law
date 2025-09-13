/**
 * Legal Document Processing API Endpoint
 * Handles database synchronization for LangChain document processing
 * Integrates with our decoupled architecture stores
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { legalDocuments, ragSessions } from '$lib/server/db/schema-postgres.js';
import { eq, desc } from 'drizzle-orm';
import { langExtractService } from '$lib/services/langextract-ollama-service.js';

// Types for API requests/responses
interface ProcessDocumentRequest {
  text: string;
  documentType: 'contract' | 'case' | 'statute' | 'brief';
  practiceArea?: string;
  sessionId?: string;
}

interface ProcessDocumentResponse {
  id: string;
  summary: string;
  keyTerms: string[];
  entities: any[];
  contractTerms: any[];
  processingTime: number;
  cacheHit: boolean;
  sessionId: string;
}

interface DocumentSessionResponse {
  id: string;
  documents: Array<{
    id: string;
    summary: string;
    keyTerms: string[];
    createdAt: string;
  }>;
  totalProcessed: number;
}

/**
 * GET /api/legal-processing
 * Retrieve recent document processing sessions
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    if (sessionId) {
      // Get specific session with documents
      const documents = await db
        .select({
          id: legalDocuments.id,
          summary: legalDocuments.summary,
          keyTerms: legalDocuments.keyTerms,
          createdAt: legalDocuments.createdAt
        })
        .from(legalDocuments)
        .where(eq(legalDocuments.sessionId, sessionId))
        .orderBy(desc(legalDocuments.createdAt))
        .limit(limit);

      const response: DocumentSessionResponse = {
        id: sessionId,
        documents: documents.map(doc => ({
          ...doc,
          createdAt: doc.createdAt?.toISOString() || new Date().toISOString()
        })),
        totalProcessed: documents.length
      };

      return json(response);
    } else {
      // Get recent sessions
      const recentSessions = await db
        .select({
          sessionId: legalDocuments.sessionId,
          count: legalDocuments.id, // Will be aggregated
          lastProcessed: legalDocuments.createdAt
        })
        .from(legalDocuments)
        .orderBy(desc(legalDocuments.createdAt))
        .limit(limit);

      return json({ sessions: recentSessions });
    }
  } catch (error) {
    console.error('Failed to fetch legal processing data:', error);
    return json(
      { error: 'Failed to fetch processing data' },
      { status: 500 }
    );
  }
};

/**
 * POST /api/legal-processing
 * Process a legal document and store results in database
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: ProcessDocumentRequest = await request.json();
    const { text, documentType, practiceArea, sessionId } = body;

    if (!text?.trim()) {
      return json(
        { error: 'Document text is required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    
    // Generate session ID if not provided
    const finalSessionId = sessionId || crypto.randomUUID();

    // Check if Ollama is available
    const isAvailable = await langExtractService.isOllamaAvailable();
    if (!isAvailable) {
      return json(
        { error: 'LangChain service not available' },
        { status: 503 }
      );
    }

    // Process document with LangChain
    const [summaryResult, entitiesResult, contractTermsResult] = await Promise.allSettled([
      langExtractService.generateLegalSummary(text, documentType),
      langExtractService.extractLegalEntities({ text, documentType }),
      documentType === 'contract' 
        ? langExtractService.extractContractTerms(text)
        : Promise.resolve(null)
    ]);

    // Extract results safely
    const summary = summaryResult.status === 'fulfilled' 
      ? summaryResult.value?.summary || 'Processing completed'
      : 'Summary generation failed';
    
    const keyTerms = summaryResult.status === 'fulfilled'
      ? summaryResult.value?.keyTerms || []
      : [];

    const entities = entitiesResult.status === 'fulfilled'
      ? entitiesResult.value || []
      : [];

    const contractTerms = contractTermsResult.status === 'fulfilled'
      ? contractTermsResult.value?.terms || []
      : [];

    const processingTime = Date.now() - startTime;

    // Store in database
    const [documentRecord] = await db
      .insert(legalDocuments)
      .values({
        id: crypto.randomUUID(),
        sessionId: finalSessionId,
        title: `${documentType} - ${new Date().toLocaleDateString()}`,
        content: text.substring(0, 10000), // Limit content size
        summary,
        keyTerms,
        entities,
        documentType,
        practiceArea: practiceArea || 'general',
        processingMetadata: {
          processingTime,
          model: 'gemma3-legal',
          cacheHit: false,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Update or create RAG session
    await db
      .insert(ragSessions)
      .values({
        id: finalSessionId,
        sessionName: `Legal Analysis - ${new Date().toLocaleDateString()}`,
        isActive: true,
        messageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: ragSessions.id,
        set: {
          messageCount: ragSessions.messageCount + 1,
          updatedAt: new Date()
        }
      });

    const response: ProcessDocumentResponse = {
      id: documentRecord.id,
      summary,
      keyTerms,
      entities,
      contractTerms,
      processingTime,
      cacheHit: false,
      sessionId: finalSessionId
    };

    return json(response);

  } catch (error) {
    console.error('Document processing failed:', error);
    return json(
      { 
        error: 'Document processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

/**
 * PUT /api/legal-processing/[id]
 * Update document processing results
 */
export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const documentId = params.id;
    if (!documentId) {
      return json({ error: 'Document ID required' }, { status: 400 });
    }

    const updates = await request.json();
    
    const [updatedDocument] = await db
      .update(legalDocuments)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(legalDocuments.id, documentId))
      .returning();

    if (!updatedDocument) {
      return json({ error: 'Document not found' }, { status: 404 });
    }

    return json(updatedDocument);

  } catch (error) {
    console.error('Failed to update document:', error);
    return json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/legal-processing/[id]
 * Delete document processing results
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const documentId = params.id;
    if (!documentId) {
      return json({ error: 'Document ID required' }, { status: 400 });
    }

    await db
      .delete(legalDocuments)
      .where(eq(legalDocuments.id, documentId));

    return json({ success: true });

  } catch (error) {
    console.error('Failed to delete document:', error);
    return json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
};