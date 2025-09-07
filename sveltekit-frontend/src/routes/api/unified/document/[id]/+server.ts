import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalAI } from '$lib/server/unified/legal-ai-service';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      return json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Get complete document with all associated data
    const document = await legalAI.getDocument(id);

    return json({
      success: true,
      document,
      meta: {
        documentId: id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return json({ error: 'Document not found' }, { status: 404 });
    }
    
    return json(
      { 
        error: 'Failed to get document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};