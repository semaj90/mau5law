/**
 * Legal Citations API Routes
 *
 * Endpoints:
 * GET    /api/v1/citations - Get citations for a case
 * POST   /api/v1/citations - Add citation
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

// Citation schemas
const CitationsQuerySchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  citationType: z.enum(['case_law', 'statute', 'regulation', 'secondary_authority', 'legal_brief', 'court_document', 'expert_report', 'news_article', 'academic_paper', 'other']).optional(),
  verified: z.coerce.boolean().optional(),
  minRelevance: z.coerce.number().min(1).max(10).default(1),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20)
});

const CreateCitationSchema = z.object({
  caseId: z.string().uuid('Invalid case ID'),
  citationType: z.enum(['case_law', 'statute', 'regulation', 'secondary_authority', 'legal_brief', 'court_document', 'expert_report', 'news_article', 'academic_paper', 'other']),
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional(),
  source: z.string().optional(),
  citation: z.string().optional(),
  url: z.string().url().optional(),
  doi: z.string().optional(),
  abstract: z.string().optional(),
  relevantQuote: z.string().optional(),
  contextNotes: z.string().optional(),
  relevanceScore: z.number().min(1).max(10).default(5),
  citationPurpose: z.enum(['support', 'distinguish', 'authority', 'background', 'counter_argument']).default('support'),
  publicationDate: z.string().datetime().optional(),
  jurisdiction: z.string().optional(),
  court: z.string().optional(),
  tags: z.array(z.string()).default([])
});

/**
 * Citations Service
 */
class CitationsService {
  constructor(private userId: string) {}

  async getCitations(query: z.infer<typeof CitationsQuerySchema>) {
    // Sample citations data - in production, query citations table
    const sampleCitations = [
      {
        id: crypto.randomUUID(),
        caseId: query.caseId,
        citationType: 'case_law',
        title: 'Miranda v. Arizona',
        citation: '384 U.S. 436 (1966)',
        author: 'U.S. Supreme Court',
        source: 'U.S. Reports',
        relevanceScore: 9,
        citationPurpose: 'authority',
        jurisdiction: 'Federal',
        court: 'U.S. Supreme Court',
        publicationDate: '1966-06-13T00:00:00Z',
        verified: true,
        relevantQuote: 'You have the right to remain silent...',
        contextNotes: 'Establishes Miranda rights precedent',
        tags: ['constitutional', 'criminal procedure'],
        createdBy: this.userId,
        dateCreated: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        caseId: query.caseId,
        citationType: 'statute',
        title: 'Federal Rules of Evidence',
        citation: 'Fed. R. Evid. 401',
        source: 'Federal Rules',
        relevanceScore: 8,
        citationPurpose: 'support',
        jurisdiction: 'Federal',
        verified: true,
        relevantQuote: 'Evidence having any tendency to make the existence of any fact...',
        contextNotes: 'Defines relevant evidence',
        tags: ['evidence', 'relevancy'],
        createdBy: this.userId,
        dateCreated: new Date().toISOString()
      }
    ];

    // Apply filters
    let filteredCitations = sampleCitations;

    if (query.citationType) {
      filteredCitations = filteredCitations.filter(c => c.citationType === query.citationType);
    }

    if (query.verified !== undefined) {
      filteredCitations = filteredCitations.filter(c => c.verified === query.verified);
    }

    if (query.minRelevance) {
      filteredCitations = filteredCitations.filter(c => c.relevanceScore >= query.minRelevance);
    }

    // Sort by relevance score (highest first)
    filteredCitations.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply pagination
    const offset = (query.page - 1) * query.limit;
    const paginatedCitations = filteredCitations.slice(offset, offset + query.limit);

    return {
      data: paginatedCitations,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: filteredCitations.length,
        totalPages: Math.max(1, Math.ceil(filteredCitations.length / query.limit)),
        hasNext: query.page < Math.ceil(filteredCitations.length / query.limit),
        hasPrev: query.page > 1
      }
    };
  }

  async createCitation(data: z.infer<typeof CreateCitationSchema>) {
    // In production, insert into citations table
    const newCitation = {
      id: crypto.randomUUID(),
      ...data,
      verified: false,
      createdBy: this.userId,
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString()
    };

    return newCitation;
  }

  async verifyCitation(citationId: string) {
    // In production, verify citation against legal databases
    // For now, return mock verification result
    return {
      id: citationId,
      verified: true,
      verifiedDate: new Date().toISOString(),
      verificationNotes: 'Citation verified against legal database'
    };
  }
}

/**
 * GET /api/v1/citations
 * Get citations for a case
 */
export const GET: RequestHandler = async ({ request, locals, url }) => {
  try {
    if (!locals.session || !locals.user) {
      return json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = CitationsQuerySchema.parse(queryParams);

    const citationsService = new CitationsService(locals.user.id);
    const result = await citationsService.getCitations(validatedQuery);

    // Response validation
    const CitationItem = z.object({
      id: z.string(),
      caseId: z.string().uuid(),
      citationType: z.string(),
      title: z.string().optional(),
      citation: z.string().optional(),
      author: z.string().optional(),
      source: z.string().optional(),
      relevanceScore: z.number().optional(),
      citationPurpose: z.string().optional(),
      jurisdiction: z.string().optional(),
      court: z.string().optional(),
      publicationDate: z.string().optional(),
      verified: z.boolean().optional(),
      relevantQuote: z.string().optional(),
      contextNotes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      createdBy: z.string().optional(),
      dateCreated: z.string().optional(),
    }).passthrough();

    const CitationsListResponse = z.object({
      success: z.literal(true),
      data: z.array(CitationItem),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean(),
      }),
      meta: z.record(z.any()).optional(),
    }).passthrough();

    const payload = {
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        caseId: validatedQuery.caseId,
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    };

    const validated = CitationsListResponse.safeParse(payload);
    if (!validated.success) {
      console.error('Citations list response validation failed', validated.error);
      return error(500, { message: 'Invalid response shape' });
    }

    return json(payload);

  } catch (err: any) {
    console.error('Error fetching citations:', err);

    if (err instanceof z.ZodError) {
      return json({ success: false, message: 'Invalid query parameters', details: err.errors }, { status: 400 });
    }

    return json({ success: false, message: 'Failed to fetch citations', details: err.message }, { status: 500 });
  }
};

/**
 * POST /api/v1/citations
 * Add citation to case
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    if (!locals.session || !locals.user) {
      return json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = CreateCitationSchema.parse(body);

    const citationsService = new CitationsService(locals.user.id);
    const newCitation = await citationsService.createCitation(validatedData);

    const CitationItem = z.object({
      id: z.string(),
      caseId: z.string().uuid(),
      citationType: z.string(),
    }).passthrough();

    const CreateCitationResponse = z.object({
      success: z.literal(true),
      data: CitationItem,
      meta: z.record(z.any()).optional(),
    }).passthrough();

    const payload = {
      success: true,
      data: newCitation,
      meta: {
        userId: locals.user.id,
        timestamp: new Date().toISOString(),
      },
    };

    const validated = CreateCitationResponse.safeParse(payload);
    if (!validated.success) {
      console.error('Create citation response validation failed', validated.error);
      return error(500, { message: 'Invalid response shape' });
    }

    return json(payload, { status: 201 });

  } catch (err: any) {
    console.error('Error creating citation:', err);

    if (err instanceof z.ZodError) {
      return json({ success: false, message: 'Invalid citation data', details: err.errors }, { status: 400 });
    }

    return json({ success: false, message: 'Failed to create citation', details: err.message }, { status: 500 });
  }
};
