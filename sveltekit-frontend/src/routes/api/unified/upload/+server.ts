import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalAI } from '$lib/server/unified/legal-ai-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const caseId = formData.get('caseId') as string;
    const documentType = (formData.get('documentType') as 'evidence' | 'legal_document' | 'contract' | 'brief') || 'evidence';
    
    // Parse metadata
    const metadataStr = formData.get('metadata') as string;
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (error) {
        console.warn('Invalid metadata JSON:', error);
      }
    }

    if (!files.length) {
      return json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        const upload = {
          file: fileBuffer,
          fileName: file.name,
          contentType: file.type,
          caseId,
          documentType,
          metadata: {
            ...metadata,
            originalSize: file.size,
            uploadedAt: new Date().toISOString()
          }
        };

        // Use unified service for complete pipeline
        const result = await legalAI.uploadDocument(upload);
        
        results.push({
          id: result.id,
          fileName: file.name,
          fileUrl: result.fileUrl,
          embeddingId: result.embeddingId,
          cached: result.cached,
          size: file.size,
          type: file.type
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        results.push({
          fileName: file.name,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }

    return json({
      success: true,
      results,
      processed: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length
    });

  } catch (error) {
    console.error('Unified upload error:', error);
    return json(
      { 
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};