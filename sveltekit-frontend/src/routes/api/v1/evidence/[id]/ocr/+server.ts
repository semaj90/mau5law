import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { evidence } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PUT /api/v1/evidence/[id]/ocr - Save OCR processing results
 * Updates evidence table with OCR text, confidence, regions, and embeddings
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  const startTime = performance.now();

  try {
    // Authentication check
    const session = locals.session;
    if (!session?.user) {
      throw error(401, 'Authentication required');
    }

    const evidenceId = parseInt(params.id);
    if (isNaN(evidenceId)) {
      throw error(400, 'Invalid evidence ID');
    }

    // Parse request body
    const {
      ocrText,
      ocrConfidence,
      ocrRegions,
      ocrEmbedding,
      tensorProcessed,
      processingMethod,
      ocrMetadata,
      processedAt
    } = await request.json();

    // Validate required fields
    if (!ocrText && ocrConfidence < 0.1) {
      throw error(400, 'OCR text or high confidence result required');
    }

    // Verify evidence exists and user has access
    const existingEvidence = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, evidenceId))
      .limit(1);

    if (existingEvidence.length === 0) {
      throw error(404, 'Evidence not found');
    }

    const evidenceRecord = existingEvidence[0];

    // Check authorization (user owns the case or has access)
    // This would integrate with your authorization system
    // For now, basic check
    if (evidenceRecord.uploadedBy !== session.user.id) {
      // Could add more sophisticated access control here
      console.warn(`User ${session.user.id} updating evidence ${evidenceId} not owned by them`);
    }

    // Update evidence with OCR results
    const updateData: any = {
      updatedAt: new Date()
    };

    if (ocrText) updateData.ocrText = ocrText;
    if (ocrConfidence !== undefined) updateData.ocrConfidence = ocrConfidence;
    if (ocrRegions) updateData.ocrRegions = ocrRegions;
    if (ocrEmbedding) updateData.ocrEmbedding = JSON.stringify(ocrEmbedding); // Vector as JSON string
    if (tensorProcessed !== undefined) updateData.tensorProcessed = tensorProcessed;
    if (processingMethod) updateData.processingMethod = processingMethod;
    if (ocrMetadata) updateData.ocrMetadata = ocrMetadata;
    if (processedAt) updateData.processedAt = new Date(processedAt);

    const updatedEvidence = await db
      .update(evidence)
      .set(updateData)
      .where(eq(evidence.id, evidenceId))
      .returning();

    const processingTime = performance.now() - startTime;

    console.log(`✅ OCR results saved for evidence ${evidenceId} (${processingMethod})`);

    return json({
      success: true,
      evidence: updatedEvidence[0],
      ocrProcessing: {
        method: processingMethod,
        confidence: ocrConfidence,
        textLength: ocrText?.length || 0,
        regionsDetected: ocrRegions?.length || 0,
        hasEmbedding: !!ocrEmbedding
      },
      processingTime: Math.round(processingTime)
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': `${Math.round(processingTime)}ms`
      }
    });

  } catch (err: any) {
    const processingTime = performance.now() - startTime;
    console.error('Evidence OCR update error:', err);

    const errorResponse = {
      error: err.status ? err.body?.message || 'OCR update failed' : 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      processingTime: Math.round(processingTime)
    };

    return json(errorResponse, {
      status: err.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': `${Math.round(processingTime)}ms`,
        'X-Error': 'true'
      }
    });
  }
};