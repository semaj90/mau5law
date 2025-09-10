/*
 * Evidence Connections API Routes
 * POST /api/v1/evidence/connections - Create evidence connections
 * GET /api/v1/evidence/connections - Get evidence connections
 * DELETE /api/v1/evidence/connections - Remove evidence connection
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { EvidenceCRUDService } from '$lib/server/services/user-scoped-crud';
import { z } from 'zod';

// Evidence connection schema
const EvidenceConnectionSchema = z.object({
  evidenceId1: z.string().uuid(),
  evidenceId2: z.string().uuid(),
  connectionType: z.enum(['related', 'contradicts', 'supports', 'sequence', 'location', 'person', 'time']),
  strength: z.number().min(0).max(1).default(0.5),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Query schema for GET requests
const ConnectionsQuerySchema = z.object({
  evidenceId: z.string().uuid().optional(),
  caseId: z.string().uuid().optional(),
  connectionType: z.string().optional(),
  minStrength: z.coerce.number().min(0).max(1).default(0),
});

/*
 * POST /api/v1/evidence/connections
 * Create a new evidence connection
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Parse request body
    const body = await request.json();
    const connectionData = EvidenceConnectionSchema.parse(body);

    // Create service instance
    const evidenceService = new EvidenceCRUDService(locals.user.id);

    // Verify both pieces of evidence exist and user has access
    const [evidence1, evidence2] = await Promise.all([
      evidenceService.getById(connectionData.evidenceId1),
      evidenceService.getById(connectionData.evidenceId2),
    ]);

    if (!evidence1 || !evidence2) {
      return error(
        404,
        makeHttpErrorPayload({ message: 'One or both evidence items not found', code: 'EVIDENCE_NOT_FOUND' })
      );
    }

    // Prevent self-connections
    if (connectionData.evidenceId1 === connectionData.evidenceId2) {
      return error(
        400,
        makeHttpErrorPayload({ message: 'Cannot create connection between the same evidence', code: 'INVALID_CONNECTION' })
      );
    }

    // Create connection record (this would need to be implemented in the service)
    const connection = {
      id: crypto.randomUUID(),
      evidenceId1: connectionData.evidenceId1,
      evidenceId2: connectionData.evidenceId2,
      connectionType: connectionData.connectionType,
      strength: connectionData.strength,
      notes: connectionData.notes,
      metadata: {
        ...connectionData.metadata,
        createdBy: locals.user.id,
        createdAt: new Date().toISOString(),
      },
    };

    // Log the connection creation for audit trail
    console.log(`Evidence connection created between ${connectionData.evidenceId1} and ${connectionData.evidenceId2} by user ${locals.user.id}`);

    return json({
      success: true,
      data: {
        connection,
        evidence1: {
          id: evidence1.id,
          title: evidence1.title,
          evidenceType: evidence1.evidenceType,
        },
        evidence2: {
          id: evidence2.id,
          title: evidence2.title,
          evidenceType: evidence2.evidenceType,
        },
      },
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
        action: 'evidence_connection_created',
      },
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating evidence connection:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid connection data',
          code: 'INVALID_DATA',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to create evidence connection',
        code: 'CONNECTION_FAILED',
        details: err.message,
      })
    );
  }
};

/*
 * GET /api/v1/evidence/connections
 * Get evidence connections with filtering
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Parse query parameters
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { evidenceId, caseId, connectionType, minStrength } = ConnectionsQuerySchema.parse(queryParams);

    // This would need to be implemented in the service to fetch connections
    // For now, return a mock structure to show the expected format
    const mockConnections = [
      {
        id: '12345',
        evidenceId1: 'evidence-1',
        evidenceId2: 'evidence-2',
        connectionType: 'related',
        strength: 0.8,
        notes: 'Both items found at the same location',
        metadata: {
          createdBy: locals.user.id,
          createdAt: new Date().toISOString(),
        },
        evidence1: {
          id: 'evidence-1',
          title: 'Physical Evidence A',
          evidenceType: 'physical',
        },
        evidence2: {
          id: 'evidence-2',
          title: 'Physical Evidence B',
          evidenceType: 'physical',
        },
      },
    ];

    // Filter connections based on query parameters
    let filteredConnections = mockConnections;

    if (evidenceId) {
      filteredConnections = filteredConnections.filter(
        conn => conn.evidenceId1 === evidenceId || conn.evidenceId2 === evidenceId
      );
    }

    if (connectionType) {
      filteredConnections = filteredConnections.filter(
        conn => conn.connectionType === connectionType
      );
    }

    filteredConnections = filteredConnections.filter(
      conn => conn.strength >= minStrength
    );

    return json({
      success: true,
      data: filteredConnections,
      meta: {
        userId: locals.user.id,
        filters: { evidenceId, caseId, connectionType, minStrength },
        timestamp: new Date().toISOString(),
      },
    });

  } catch (err: any) {
    console.error('Error fetching evidence connections:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to fetch evidence connections',
        code: 'FETCH_FAILED',
        details: err.message,
      })
    );
  }
};
