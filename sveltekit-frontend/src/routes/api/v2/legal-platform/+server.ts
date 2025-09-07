import type { RequestHandler } from './$types.js';

/*
 * Legal AI Platform API Router v2
 * Centralized endpoint routing to Go microservices for the full-stack legal AI platform
 * Integrates: Enhanced RAG, Upload Service, Vector Search, Case Management, Evidence Processing
 */

import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/drizzle';
import { cases, evidence, criminals, legalDocuments } from '$lib/server/db/schema-postgres';
import { eq, or, desc, ilike, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { URL } from 'url';

// Go Microservice Configuration
const GO_SERVICES = {
  enhanced_rag: {
    url: 'http://localhost:8094',
    endpoints: {
      health: '/api/health',
      gpu_compute: '/api/gpu/compute',
      som_train: '/api/som/train',
      xstate_event: '/api/xstate/event',
      websocket: '/ws',
    },
  },
  upload_service: {
    url: 'http://localhost:8093',
    endpoints: {
      upload: '/upload',
      status: '/status',
      health: '/health',
    },
  },
  vector_service: {
    url: 'http://localhost:8095',
    endpoints: {
      search: '/api/vector/search',
      similarity: '/api/vector/similarity',
    },
  },
  grpc_server: {
    url: 'http://localhost:50051',
    protocols: ['grpc', 'http'],
  },
  load_balancer: {
    url: 'http://localhost:8224',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
    },
  },
};

// Request Types
export interface LegalPlatformRequest {
  action: 'create' | 'read' | 'update' | 'delete' | 'search' | 'process' | 'analyze';
  entity: 'case' | 'evidence' | 'criminal' | 'document' | 'search' | 'upload' | 'ai';
  data?: any;
  id?: string;
  filters?: Record<string, any>;
}

// Utility function to call Go microservices
async function callGoService(
  service: keyof typeof GO_SERVICES,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any
): Promise<any> {
  const serviceConfig = GO_SERVICES[service];
  const url = `${serviceConfig.url}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Service ${service} returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`Error calling ${service} service:`, err);
    throw new Error(`Failed to communicate with ${service} service`);
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const req: LegalPlatformRequest = await request.json();

    // Handle health check
    if (req.action === ('health' as any)) {
      const healthChecks = await Promise.allSettled([
        callGoService('enhanced_rag', '/api/health'),
        callGoService('upload_service', '/health'),
      ]);

      const services = {
        enhanced_rag: healthChecks[0].status === 'fulfilled',
        upload_service: healthChecks[1].status === 'fulfilled',
        database: true, // Assume database is healthy if we got this far
      };

      return json({
        success: true,
        data: { services },
        timestamp: new Date().toISOString(),
        message: 'Health check completed',
      });
    }

    // Route based on entity and action
    switch (req.entity) {
      case 'case':
        return await handleCaseOperations(req);
      case 'evidence':
        return await handleEvidenceOperations(req);
      case 'criminal':
        return await handleCriminalOperations(req);
      case 'document':
        return await handleDocumentOperations(req);
      case 'search':
        return await handleSearchOperations(req);
      case 'upload':
        return await handleUploadOperations(req);
      case 'ai':
        return await handleAIOperations(req);
      default:
        throw error(400, `Unknown entity: ${req.entity}`);
    }
  } catch (err: any) {
    console.error('API Error:', err);
    throw error(500, err instanceof Error ? err.message : 'Internal server error');
  }
};

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action');
  const entity = url.searchParams.get('entity');
  const id = url.searchParams.get('id');

  if (!action || !entity) {
    throw error(400, 'Missing required parameters: action and entity');
  }

  const req: LegalPlatformRequest = {
    action: action as any,
    entity: entity as any,
    id: id || undefined,
  };

  return await POST({
    request: new Request('', { method: 'POST', body: JSON.stringify(req) }),
    url,
  } as any);
};

// Case Management Operations
async function handleCaseOperations(req: LegalPlatformRequest): Promise<any> {
  switch (req.action) {
    case 'create':
      const newCase = await db
        .insert(cases)
        .values({
          id: createId(),
          caseNumber: `CASE-${Date.now()}`,
          title: req.data.title,
          name: req.data.title, // Backward compatibility
          description: req.data.description,
          priority: req.data.priority || 'medium',
          status: 'open',
          incidentDate: req.data.incidentDate ? new Date(req.data.incidentDate) : undefined,
          location: req.data.location,
          userId: req.data.userId,
          createdBy: req.data.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return json({
        success: true,
        data: newCase[0],
        message: 'Case created successfully',
      });

    case 'read':
      if (req.id) {
        const caseData = await db.select().from(cases).where(eq(cases.id, req.id));
        if (caseData.length === 0) {
          throw error(404, 'Case not found');
        }
        return json({ success: true, data: caseData[0] });
      } else {
        const allCases = await db.select().from(cases).orderBy(desc(cases.createdAt)).limit(50);
        return json({ success: true, data: allCases });
      }

    case 'update':
      if (!req.id) throw error(400, 'Case ID required for update');

      const updatedCase = await db
        .update(cases)
        .set({
          ...req.data,
          updatedAt: new Date(),
        })
        .where(eq(cases.id, req.id))
        .returning();

      return json({
        success: true,
        data: updatedCase[0],
        message: 'Case updated successfully',
      });

    case 'delete':
      if (!req.id) throw error(400, 'Case ID required for deletion');

      await db.delete(cases).where(eq(cases.id, req.id));

      return json({
        success: true,
        message: 'Case deleted successfully',
      });

    case 'search':
      const searchResults = await db
        .select()
        .from(cases)
        .where(
          or(
            cases.title.ilike(`%${req.data.query}%`),
            cases.description.ilike(`%${req.data.query}%`),
            cases.caseNumber.ilike(`%${req.data.query}%`)
          )
        )
        .limit(20);

      return json({ success: true, data: searchResults });

    default:
      throw error(400, `Unknown case action: ${req.action}`);
  }
}

// Evidence Management Operations
async function handleEvidenceOperations(req: LegalPlatformRequest): Promise<any> {
  switch (req.action) {
    case 'create':
      const newEvidence = await db
        .insert(evidence)
        .values({
          id: createId(),
          caseId: req.data.caseId,
          title: req.data.title,
          description: req.data.description,
          evidenceType: req.data.evidenceType,
          fileUrl: req.data.fileUrl,
          fileName: req.data.fileName,
          fileSize: req.data.fileSize,
          mimeType: req.data.mimeType,
          tags: req.data.tags || [],
          uploadedBy: req.data.userId,
          uploadedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return json({
        success: true,
        data: newEvidence[0],
        message: 'Evidence created successfully',
      });

    case 'read':
      if (req.id) {
        const evidenceData = await db.select().from(evidence).where(eq(evidence.id, req.id));
        if (evidenceData.length === 0) {
          throw error(404, 'Evidence not found');
        }
        return json({ success: true, data: evidenceData[0] });
      } else {
        const filters = req.filters || {};
        const whereClauses = [] as any[];
        if (filters.caseId) {
          whereClauses.push(eq(evidence.caseId, filters.caseId));
        }
        const allEvidence = await db
          .select()
          .from(evidence)
          .where(whereClauses.length ? and(...whereClauses) : (undefined as any))
          .orderBy(desc(evidence.uploadedAt))
          .limit(50);
        return json({ success: true, data: allEvidence });
      }

    case 'analyze':
      // Call enhanced RAG service for AI analysis
      const analysisResult = await callGoService('enhanced_rag', '/api/gpu/compute', 'POST', {
        type: 'evidence_analysis',
        evidenceId: req.id,
        data: req.data,
      });

      return json({
        success: true,
        data: analysisResult,
        message: 'Evidence analysis completed',
      });

    default:
      throw error(400, `Unknown evidence action: ${req.action}`);
  }
}

// Criminal Records Operations
async function handleCriminalOperations(req: LegalPlatformRequest): Promise<any> {
  switch (req.action) {
    case 'create':
      const newCriminal = await db
        .insert(criminals)
        .values({
          id: createId(),
          firstName: req.data.firstName,
          lastName: req.data.lastName,
          aliases: req.data.aliases || [],
          dateOfBirth: req.data.dateOfBirth ? new Date(req.data.dateOfBirth) : undefined,
          gender: req.data.gender,
          height: req.data.height,
          weight: req.data.weight,
          eyeColor: req.data.eyeColor,
          hairColor: req.data.hairColor,
          createdBy: req.data.userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return json({
        success: true,
        data: newCriminal[0],
        message: 'Criminal record created successfully',
      });

    case 'read':
      if (req.id) {
        const criminalData = await db.select().from(criminals).where(eq(criminals.id, req.id));
        if (criminalData.length === 0) {
          throw error(404, 'Criminal not found');
        }
        return json({ success: true, data: criminalData[0] });
      } else {
        const allCriminals = await db
          .select()
          .from(criminals)
          .orderBy(desc(criminals.createdAt))
          .limit(50);
        return json({ success: true, data: allCriminals });
      }

    default:
      throw error(400, `Unknown criminal action: ${req.action}`);
  }
}

// Document Operations
async function handleDocumentOperations(req: LegalPlatformRequest): Promise<any> {
  switch (req.action) {
    case 'create':
      const newDocument = await db
        .insert(legalDocuments)
        .values({
          id: createId(),
          caseId: req.data.caseId,
          userId: req.data.userId,
          title: req.data.title,
          content: req.data.content,
          documentType: req.data.documentType || 'brief',
          status: 'draft',
          version: 1,
          wordCount: req.data.content ? req.data.content.split(' ').length : 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return json({
        success: true,
        data: newDocument[0],
        message: 'Document created successfully',
      });

    case 'read':
      if (req.id) {
        const documentData = await db
          .select()
          .from(legalDocuments)
          .where(eq(legalDocuments.id, req.id));
        if (documentData.length === 0) {
          throw error(404, 'Document not found');
        }
        return json({ success: true, data: documentData[0] });
      } else {
        const filters = req.filters || {};
        const whereClauses = [] as any[];
        if (filters.caseId) {
          whereClauses.push(eq(legalDocuments.caseId, filters.caseId));
        }
        const allDocuments = await db
          .select()
          .from(legalDocuments)
          .where(whereClauses.length ? and(...whereClauses) : (undefined as any))
          .orderBy(desc(legalDocuments.createdAt))
          .limit(50);
        return json({ success: true, data: allDocuments });
      }

    default:
      throw error(400, `Unknown document action: ${req.action}`);
  }
}

// Search Operations (Vector + Traditional)
async function handleSearchOperations(req: LegalPlatformRequest): Promise<any> {
  const { query, type = 'semantic', limit = 10 } = req.data;

  try {
    // Call enhanced RAG service for semantic search
    const searchResults = await callGoService('enhanced_rag', '/api/gpu/compute', 'POST', {
      type: 'vector_similarity',
      query,
      search_type: type,
      limit
    });

    return json({
      success: true,
      data: searchResults,
      message: 'Search completed successfully'
    });
  } catch (err: any) {
    // Fallback to traditional database search
    const fallbackResults = await db
      .select()
      .from(cases)
      .where(
        or(ilike(cases.title, `%${query}%` as any), ilike(cases.description, `%${query}%` as any))
      )
      .limit(limit);

    return json({
      success: true,
      data: fallbackResults,
      message: 'Search completed (database fallback)',
      fallback: true
    });
  }
}

// Upload Operations
async function handleUploadOperations(req: LegalPlatformRequest): Promise<any> {
  try {
    const uploadResult = await callGoService('upload_service', '/upload', 'POST', req.data);

    return json({
      success: true,
      data: uploadResult,
      message: 'Upload processed successfully'
    });
  } catch (err: any) {
    throw error(500, `Upload service error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// AI Operations (Enhanced RAG, GPU Compute, SOM Training)
async function handleAIOperations(req: LegalPlatformRequest): Promise<any> {
  const { operation, data } = req.data;

  try {
    let result;

    switch (operation) {
      case 'chat':
      case 'analyze':
      case 'summarize':
        result = await callGoService('enhanced_rag', '/api/gpu/compute', 'POST', {
          type: operation,
          ...data
        });
        break;

      case 'train_som':
        result = await callGoService('enhanced_rag', '/api/som/train', 'POST', data);
        break;

      case 'xstate_event':
        result = await callGoService('enhanced_rag', '/api/xstate/event', 'POST', data);
        break;

      default:
        throw error(400, `Unknown AI operation: ${operation}`);
    }

    return json({
      success: true,
      data: result,
      message: `AI operation ${operation} completed successfully`
    });
  } catch (err: any) {
    throw error(500, `AI service error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// Health Check endpoint
export const OPTIONS: RequestHandler = async () => {
  const healthChecks = await Promise.allSettled([
    callGoService('enhanced_rag', '/api/health'),
    callGoService('upload_service', '/health'),
  ]);

  const services = {
    enhanced_rag: healthChecks[0].status === 'fulfilled',
    upload_service: healthChecks[1].status === 'fulfilled',
    database: true // Assume database is healthy if we got this far
  };

  return json({
    success: true,
    services,
    timestamp: new Date().toISOString(),
    message: 'Health check completed'
  });
};