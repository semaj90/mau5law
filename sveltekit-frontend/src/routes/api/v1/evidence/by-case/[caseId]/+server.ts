/*
 * Evidence by Case API Route
 * GET /api/v1/evidence/by-case/[caseId] - Get all evidence for a specific case
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { EvidenceCRUDService } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// Query parameters schema
const EvidenceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  type: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'evidenceType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeAnalysis: z.coerce.boolean().default(true),
  search: z.string().optional(),
});

/*
 * GET /api/v1/evidence/by-case/[caseId]
 * Retrieve all evidence items for a specific case with optional filtering and analysis
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    const { caseId } = params;
    if (!caseId) {
      return error(
        400,
        makeHttpErrorPayload({ message: 'Case ID is required', code: 'MISSING_CASE_ID' })
      );
    }

    // Parse query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const {
      page,
      limit,
      type,
      sortBy,
      sortOrder,
      includeAnalysis,
      search
    } = EvidenceQuerySchema.parse(queryParams);

    // Create evidence service
    const evidenceService = new EvidenceCRUDService(locals.user.id);

    // Build query options
    const options = {
      page,
      limit,
      sortBy,
      sortOrder,
      filters: {
        ...(type && { evidenceType: type }),
        ...(search && { search })
      }
    };

    // Get evidence for the case
    const evidenceResult = await evidenceService.listByCase(caseId, options);
    
    if (!evidenceResult.success) {
      return error(
        500,
        makeHttpErrorPayload({
          message: 'Failed to retrieve evidence',
          code: 'EVIDENCE_FETCH_FAILED',
          details: evidenceResult.error
        })
      );
    }

    let enhancedEvidence = evidenceResult.data;

    // Enhance with AI analysis if requested
    if (includeAnalysis) {
      enhancedEvidence = await Promise.all(
        evidenceResult.data.map(async (evidence) => {
          try {
            // Check if evidence already has analysis
            if (evidence.metadata?.aiAnalysis) {
              return evidence;
            }

            // Call MCP server for Gemma embeddings analysis
            const mcpResponse = await fetch('http://localhost:3002/mcp/evidence-analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                evidenceId: evidence.id,
                content: evidence.content,
                title: evidence.title,
                evidenceType: evidence.evidenceType,
                useGemmaEmbeddings: true,
                analysisType: 'comprehensive'
              })
            });

            if (mcpResponse.ok) {
              const analysisData = await mcpResponse.json();
              
              // Add analysis to evidence metadata
              return {
                ...evidence,
                metadata: {
                  ...evidence.metadata,
                  aiAnalysis: {
                    keyTerms: analysisData.keyTerms || [],
                    classification: analysisData.classification,
                    importance: analysisData.importance || 0.5,
                    entities: analysisData.entities || [],
                    summary: analysisData.summary,
                    embeddingVector: analysisData.embedding,
                    confidence: analysisData.confidence || 0,
                    analyzedAt: new Date().toISOString(),
                    analyzedBy: 'gemma-embeddings'
                  }
                }
              };
            }

            return evidence;
          } catch (analysisError) {
            console.warn(`Analysis failed for evidence ${evidence.id}:`, analysisError);
            return evidence;
          }
        })
      );
    }

    // Calculate additional metadata
    const evidenceTypes = [...new Set(enhancedEvidence.map(e => e.evidenceType))];
    const totalSize = enhancedEvidence.reduce((sum, e) => sum + (e.metadata?.fileSize || 0), 0);
    const analysisStatus = {
      total: enhancedEvidence.length,
      analyzed: enhancedEvidence.filter(e => e.metadata?.aiAnalysis).length,
      pending: enhancedEvidence.filter(e => !e.metadata?.aiAnalysis).length
    };

    return json({
      success: true,
      data: {
        evidence: enhancedEvidence,
        pagination: {
          page,
          limit,
          total: evidenceResult.total || enhancedEvidence.length,
          pages: Math.ceil((evidenceResult.total || enhancedEvidence.length) / limit),
          hasNext: page * limit < (evidenceResult.total || enhancedEvidence.length),
          hasPrev: page > 1
        },
        metadata: {
          caseId,
          evidenceTypes,
          totalSize,
          analysisStatus,
          includeAnalysis,
          filters: options.filters
        }
      },
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
        action: 'evidence_list_by_case',
        caseId
      }
    });

  } catch (err: any) {
    console.error('Error retrieving evidence by case:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid query parameters',
          code: 'INVALID_PARAMS',
          details: err.errors
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to retrieve evidence',
        code: 'EVIDENCE_FETCH_FAILED',
        details: err.message
      })
    );
  }
};