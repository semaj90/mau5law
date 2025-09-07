/*
 * Persons of Interest API Routes with Lucia v3 Authentication
 * GET /api/v1/persons-of-interest - List user's persons of interest (with pagination)
 * POST /api/v1/persons-of-interest - Create new person of interest
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { db, sql } from '$lib/server/db';
import { personsOfInterest } from '$lib/server/db/schema-postgres';
import { z } from 'zod';

// Query parameters schema for GET requests
const PersonsOfInterestQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  search: z.string().optional(),
});

// Local create schema and service (minimal to unblock compilation)
const CreatePersonOfInterestSchema = z.object({
  name: z.string().min(1),
  caseId: z.string().uuid().optional(),
  caseIds: z.array(z.string().uuid()).optional(),
  aliases: z.array(z.string()).optional(),
  relationship: z.string().optional(),
  threatLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  profileData: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  position: z.record(z.any()).optional(),
});

type CreatePersonOfInterestData = z.infer<typeof CreatePersonOfInterestSchema>;

class PersonsOfInterestCRUDService {
  constructor(private userId: string) {}

  async list({ page, limit }: { page: number; limit: number }) {
    const offset = (page - 1) * limit;
    const [totalRow] = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM persons_of_interest`
    )) as unknown as Array<{ count: number }>;
    const rows = await db.select().from(personsOfInterest).limit(limit).offset(offset);
    const total = totalRow?.count ?? rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data: rows, page, limit, total, totalPages };
  }

  async listByRiskLevel(
    riskLevel: 'low' | 'medium' | 'high' | 'critical',
    { page, limit }: { page: number; limit: number }
  ) {
    const offset = (page - 1) * limit;
    const [totalRow] = (await db.execute(
      sql`SELECT COUNT(*)::int AS count FROM persons_of_interest WHERE threat_level = ${riskLevel}`
    )) as unknown as Array<{ count: number }>;
    const rows = await db
      .select()
      .from(personsOfInterest)
      .where(sql`${personsOfInterest.threatLevel} = ${riskLevel}`)
      .limit(limit)
      .offset(offset);
    const total = totalRow?.count ?? rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data: rows, page, limit, total, totalPages };
  }

  async create(data: CreatePersonOfInterestData) {
    const caseId = data.caseId || data.caseIds?.[0] || null;
    const [row] = await db
      .insert(personsOfInterest)
      .values({
        name: data.name,
        caseId: caseId as any,
        aliases: data.aliases ?? [],
        relationship: data.relationship,
        threatLevel: data.threatLevel ?? 'low',
        status: data.status ?? 'active',
        profileData: data.profileData ?? {},
        tags: data.tags ?? [],
        position: data.position ?? {},
        createdBy: this.userId as any,
      })
      .returning({ id: personsOfInterest.id });

    return row?.id as string;
  }

  async getById(id: string) {
    const rows = await db
      .select()
      .from(personsOfInterest)
      .where(sql`${personsOfInterest.id} = ${id}`)
      .limit(1);
    return rows[0] ?? null;
  }
}

/*
 * GET /api/v1/persons-of-interest
 * List user's persons of interest with pagination and filtering
 */
export const GET: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return json(
        {
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = PersonsOfInterestQuerySchema.parse(queryParams);

    // Create service instance
    const personsService = new PersonsOfInterestCRUDService(locals.user.id);

    // Get persons of interest with pagination - filter by risk level if specified
    const result = validatedQuery.riskLevel
      ? await personsService.listByRiskLevel(validatedQuery.riskLevel, {
          page: validatedQuery.page,
          limit: validatedQuery.limit
        })
      : await personsService.list({
          page: validatedQuery.page,
          limit: validatedQuery.limit
        });

    return json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1
      },
      meta: {
        userId: locals.user.id,
        riskLevel: validatedQuery.riskLevel || null,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Error fetching persons of interest:', err);

    if (err instanceof z.ZodError) {
      return json(
        {
          success: false,
          message: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          details: err.errors,
        },
        { status: 400 }
      );
    }

    return json(
      {
        success: false,
        message: 'Failed to fetch persons of interest',
        code: 'FETCH_FAILED',
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
};

/*
 * POST /api/v1/persons-of-interest
 * Create new person of interest
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return json(
        {
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreatePersonOfInterestSchema.parse(body) as CreatePersonOfInterestData;

    // Create service instance
    const personsService = new PersonsOfInterestCRUDService(locals.user.id);

    // Create person of interest
    const personId = await personsService.create(validatedData);

    // Get the created person details
    const createdPerson = await personsService.getById(personId);

    return json({
      success: true,
      data: createdPerson,
      meta: {
        personId,
        userId: locals.user.id,
        caseIds: validatedData.caseIds,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating person of interest:', err);

    if (err instanceof z.ZodError) {
      return json(
        {
          success: false,
          message: 'Invalid person data',
          code: 'INVALID_DATA',
          details: err.errors,
        },
        { status: 400 }
      );
    }

    if (
      typeof err?.message === 'string' &&
      (err.message.includes('not found') || err.message.includes('access denied'))
    ) {
      return json(
        {
          success: false,
          message: err.message,
          code: 'ACCESS_DENIED',
        },
        { status: 403 }
      );
    }

    return json(
      {
        success: false,
        message: 'Failed to create person of interest',
        code: 'CREATE_FAILED',
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
};