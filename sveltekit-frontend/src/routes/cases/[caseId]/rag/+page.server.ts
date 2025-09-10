import type { PageServerLoad } from './$types.js';
import type { Actions } from './$types.js';
import { error, json } from '@sveltejs/kit';
import { authService } from '$lib/server/auth';
import { legalRAGService } from '$lib/services/enhanced-rag-semantic-analyzer';

export const load: PageServerLoad = async ({ params, locals }) => {
  const { caseId } = params;
  
  if (!locals.user) {
    throw error(401, 'Authentication required');
  }

  try {
    // Load case data from database
    const caseData = await authService.getCaseById(caseId);
    if (!caseData) {
      throw error(404, 'Case not found');
    }

    // Get case documents for RAG context
    const documents = await authService.getCaseDocuments(caseId);
    
    // Load existing RAG conversations for this case
    const ragHistory = await legalRAGService.getCaseRAGHistory(caseId);

    return {
      caseData: {
        id: caseData.id,
        title: caseData.title,
        description: caseData.description,
        status: caseData.status,
        createdAt: caseData.created_at,
        updatedAt: caseData.updated_at
      },
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        uploadedAt: doc.uploaded_at,
        processed: doc.processed
      })),
      ragHistory: ragHistory || []
    };
  } catch (err) {
    console.error('Error loading case RAG data:', err);
    throw error(500, 'Failed to load case data');
  }
};

export const actions: Actions = {
  query: async ({ request, params, locals }) => {
    if (!locals.user) {
      throw error(401, 'Authentication required');
    }

    const { caseId } = params;
    const data = await request.formData();
    const query = data.get('query') as string;

    if (!query?.trim()) {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    try {
      // Perform RAG query against case documents
      const response = await legalRAGService.queryCaseDocuments(caseId, query, {
        userId: locals.user.id,
        includeMetadata: true,
        maxResults: 10
      });

      // Save query to history
      await legalRAGService.saveRAGInteraction(caseId, {
        query,
        response: response.answer,
        sources: response.sources,
        userId: locals.user.id,
        timestamp: new Date()
      });

      return json({
        success: true,
        response: {
          answer: response.answer,
          sources: response.sources,
          confidence: response.confidence,
          processingTime: response.processingTime
        }
      });
    } catch (err) {
      console.error('RAG query error:', err);
      return json({ error: 'Failed to process query' }, { status: 500 });
    }
  }
};