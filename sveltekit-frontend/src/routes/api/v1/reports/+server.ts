/*
 * Reports API Routes with Lucia v3 Authentication
 * GET /api/v1/reports - List user's reports (with pagination)
 * POST /api/v1/reports - Create new report
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { reports } from '$lib/server/db/schema';
import { and, count, desc, eq } from 'drizzle-orm';
// Minimal local schema/types to unblock TS; mirrors schema-postgres reports table
const CreateReportSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().optional(),
  reportType: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});
type CreateReportData = z.infer<typeof CreateReportSchema>;

class ReportsCRUDService {
  constructor(private userId: string) {}

  async list(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const [tc] = await db.select({ c: count() }).from(reports);
    const total = Number(tc.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const data = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, page, limit, total, totalPages };
  }

  async listByCase(caseId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const offset = (page - 1) * limit;

    const [tc] = await db.select({ c: count() }).from(reports).where(eq(reports.caseId, caseId));
    const total = Number(tc.c) || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const data = await db
      .select()
      .from(reports)
      .where(eq(reports.caseId, caseId))
      .orderBy(desc(reports.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, page, limit, total, totalPages };
  }

  async create(data: CreateReportData) {
    const now = new Date();
    const [row] = await db
      .insert(reports)
      .values({
        caseId: data.caseId as any,
        title: data.title,
        content: data.content ?? null,
        reportType: data.reportType ?? 'case_summary',
        status: data.status ?? 'draft',
        tags: data.tags ?? [],
        metadata: data.metadata ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return row?.id as string;
  }

  async getById(id: string) {
    const [row] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!row) throw new Error('Report not found');
    return row;
  }
}

// Query parameters schema for GET requests
const ReportsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  caseId: z.string().uuid().optional(),
  status: z.enum(['draft', 'review', 'approved', 'published']).optional(),
  reportType: z.enum(['analysis', 'summary', 'investigation', 'final']).optional(),
});

/*
 * GET /api/v1/reports
 * List user's reports with pagination and filtering
 */
export const GET: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return json({ message: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = ReportsQuerySchema.parse(queryParams);

    // Create service instance
    const reportsService = new ReportsCRUDService(locals.user.id);

    // Get reports with pagination - filter by case if specified
    const result = validatedQuery.caseId
      ? await reportsService.listByCase(validatedQuery.caseId, {
          page: validatedQuery.page,
          limit: validatedQuery.limit,
        })
      : await reportsService.list({
          page: validatedQuery.page,
          limit: validatedQuery.limit,
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
        hasPrev: result.page > 1,
      },
      meta: {
        userId: locals.user.id,
        caseId: validatedQuery.caseId || null,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error fetching reports:', err);

    if (err instanceof z.ZodError) {
      return json(
        { message: 'Invalid query parameters', code: 'INVALID_QUERY', details: err.errors },
        { status: 400 }
      );
    }
    if (
      err instanceof Error &&
      (err.message.includes('not found') || err.message.includes('access denied'))
    ) {
      return json({ message: err.message, code: 'ACCESS_DENIED' }, { status: 403 });
    }
    return json(
      { message: 'Failed to fetch reports', code: 'FETCH_FAILED', details: String(err) },
      { status: 500 }
    );
  }
};

/*
 * POST /api/v1/reports
 * Create new report
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return json({ message: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreateReportSchema.parse(body) as CreateReportData;

    // Create service instance
    const reportsService = new ReportsCRUDService(locals.user.id);

    // Create report
    const reportId = await reportsService.create(validatedData);

    // Get the created report details
    const createdReport = await reportsService.getById(reportId);

    return json({
      success: true,
      data: createdReport,
      meta: {
        reportId,
        userId: locals.user.id,
        caseId: validatedData.caseId,
        timestamp: new Date().toISOString()
      }
    }, { status: 201 });

  } catch (err: any) {
    console.error('Error creating report:', err);

    if (err instanceof z.ZodError) {
      return json(
        { message: 'Invalid report data', code: 'INVALID_DATA', details: err.errors },
        { status: 400 }
      );
    }
    if (
      err instanceof Error &&
      (err.message.includes('not found') || err.message.includes('access denied'))
    ) {
      return json({ message: err.message, code: 'ACCESS_DENIED' }, { status: 403 });
    }
    return json(
      { message: 'Failed to create report', code: 'CREATE_FAILED', details: String(err) },
      { status: 500 }
    );
  }
};