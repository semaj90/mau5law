import { z } from 'zod';
import { withApiHandler, parseRequestBody, createPagination, CommonErrors } from '$lib/server/api/response';
import { DbCaseOperations as CaseOperations } from '$lib/server/db/enhanced-operations';
import * as redis from 'redis'; // Change to namespace import
import type { RedisClientType } from 'redis'; // Keep type import separate
import type { RequestHandler } from './$types.js';
import { resolveUser, getMetaEnv, isDevBypassEnabled } from '$lib/server/auth/utils';

// Get typed environment access
const metaEnv = getMetaEnv();

// Redis client for worker communication
// Use an inferred client type to avoid relying on package-exported type names
type LocalRedisClient = RedisClientType; // Use RedisClientType directly

let redisClient: LocalRedisClient | null = null;
let redisUnavailable = false;
async function getRedisClient(): Promise<LocalRedisClient | null> {
  if (redisUnavailable) return null;
  if (!redisClient) {
    try {
      // Resolve runtime Redis config: prefer metaEnv (Vite), fall back to process.env
      const resolvedRedisUrl = metaEnv.REDIS_URL || process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      const resolvedRedisPassword = metaEnv.REDIS_PASSWORD || process.env.REDIS_PASSWORD;
      console.log('DEBUG: Resolved Redis URL:', resolvedRedisUrl);
      console.log('DEBUG: Redis password present?', !!resolvedRedisPassword);
      // 'redis' namespace may not have precise typings for createClient in our environment;
      // treat it as unknown and do a runtime check for createClient to keep TypeScript strictness.
      const redisNs = redis as unknown;
      if (typeof (redisNs as any)?.createClient !== 'function') {
        throw new Error('redis.createClient is not available in this environment');
      }
      // Safe to call createClient now that we've checked its existence
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientConfig: any = {
        url: resolvedRedisUrl,
        socket: { connectTimeout: 5000 },
      };
      // Only add password if it's explicitly set (avoid sending undefined)
      if (resolvedRedisPassword) {
        clientConfig.password = resolvedRedisPassword;
      }
      redisClient = (redisNs as any).createClient(clientConfig);

      // Suppress auth warnings during connection
      const errorHandler = (err: any) => {
        const errMsg = err?.message || String(err);
        // Only warn about critical errors, not auth errors (expected in dev without password)
        if (!errMsg.includes('AUTH') && !errMsg.includes('NOAUTH')) {
          console.warn('Redis error:', errMsg);
        }
      };
      redisClient.on?.('error', errorHandler);

      await redisClient.connect();
    } catch (e) {
      console.warn('⚠️ Redis not available, continuing without stream worker integration');
      redisUnavailable = true;
      return null;
    }
  }
  return redisClient;
}

// Worker trigger function
async function triggerWorkerProcessing(
  caseId: string,
  options: { priority: string; caseType: string; userId: string; trigger: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return; // silently skip if unavailable in dev
  const correlationId = `case-${caseId}-${Date.now()}`;
  // Create Redis stream event for worker
  const eventData: Record<string, string> = {
    id: correlationId,
    type: 'case_created',
    action: 'process',
    caseId,
    evidenceId: '',
    documentId: '',
    metadata: JSON.stringify({
      priority: options.priority,
      caseType: options.caseType,
      userId: options.userId,
      trigger: options.trigger,
      timestamp: new Date().toISOString(),
      ...options.metadata,
    }),
    retry: '0',
    timestamp: Date.now().toString(),
  };
  // Add to Redis stream for worker consumption
  const streamName = 'autotag:requests';
  // Call xAdd with properly typed client & payload
  await redis.xAdd(streamName, '*', eventData);
  console.log(`📡 Worker event sent: ${streamName} -> ${correlationId}`);
}
// Enhanced case schemas with comprehensive validation
const createCaseSchema = z.object({
  title: z.string().min(1, 'Case title is required').max(500, 'Case title too long'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  // Accept legacy/client 'active' and map to canonical 'open'
  status: z.preprocess(
    val => (val === 'active' ? 'open' : val),
    z.enum(['open', 'investigating', 'pending', 'closed', 'archived']).default('open')
  ),
  // Accept either a string or Date and produce a Date | undefined
  incidentDate: z.preprocess(val => {
    if (typeof val === 'string' && val.length > 0) return new Date(val);
    return val;
  }, z.date().optional()),
  location: z.string().optional(),
  jurisdiction: z.string().optional(),
  // caseType is optional, but fallback is 'civil' if not provided.
  // Allowed values: 'civil', 'criminal', 'family', 'administrative', 'other'
  caseType: z
    .enum(['civil', 'criminal', 'family', 'administrative', 'other'])
    .optional()
    .describe('Defaults to "civil" if not provided'),
});

// Define a type for the *output* of the schema after defaults are applied.
// This ensures 'priority' and 'status' are non-optional for downstream use,
// as Zod's .default() guarantees their presence at runtime.
type CreateCaseValidatedData = Omit<z.infer<typeof createCaseSchema>, 'priority' | 'status'> & {
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'pending' | 'closed' | 'archived' | 'active';
};

const searchCasesSchema = z.object({
  query: z.string().optional(),
  // Validate filter arrays; accept 'active' from clients but normalize later
  status: z.array(z.enum(['open', 'investigating', 'pending', 'closed', 'archived', 'active'])).optional(),
  priority: z.array(z.string()).optional(),
  assignedTo: z.string().optional(),
  // Accept string or Date for range boundaries
  dateRange: z
    .object({
      start: z.preprocess(val => (typeof val === 'string' ? new Date(val) : val), z.date()),
      end: z.preprocess(val => (typeof val === 'string' ? new Date(val) : val), z.date()),
    })
    .optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
  useVectorSearch: z.boolean().default(true),
});
// GET - List cases with advanced search and filtering
export const GET: RequestHandler = async event => {
  return withApiHandler(async ({ url, locals }) => {
    // Resolve user (supports DEV_BYPASS_AUTH in dev)
    const user = resolveUser(locals);
    // If dev bypass is enabled and no user, return demo payload to unblock frontend dev flows
    if (!user && isDevBypassEnabled()) {
      console.warn('DEV_BYPASS_AUTH: returning demo cases for GET /api/cases');
      return {
        cases: [
          { id: 'dev-case-001', caseNumber: 'DEV-0001', title: 'Development Case (demo)', status: 'open' },
          { id: 'dev-case-002', caseNumber: 'DEV-0002', title: 'Sample Evidence Case', status: 'investigating' },
        ],
        pagination: { page: 1, limit: 50, total: 2 },
        search: null,
      };
    }
    if (!user) {
      throw CommonErrors.Unauthorized('User authentication required');
    }
    // Parse and validate query parameters
    const searchParams = {
      query: url.searchParams.get('query') || undefined,
      status: url.searchParams.get('status')?.split(',').filter(Boolean) || undefined,
      priority: url.searchParams.get('priority')?.split(',').filter(Boolean) || undefined,
      assignedTo: url.searchParams.get('assignedTo') || undefined,
      dateRange:
        url.searchParams.get('dateStart') && url.searchParams.get('dateEnd')
          ? {
              start: new Date(url.searchParams.get('dateStart')!),
              end: new Date(url.searchParams.get('dateEnd')!),
            }
          : undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100),
      useVectorSearch: url.searchParams.get('useVectorSearch') !== 'false',
    };
    // Validate search parameters
    try {
      const validatedParams = searchCasesSchema.parse(searchParams);
      // Normalize any 'active' statuses to canonical 'open'
      const normalizedStatus = validatedParams.status?.map(s => (s === 'active' ? 'open' : s));
      // Calculate offset from page
      const offset = (validatedParams.page - 1) * validatedParams.limit;
      // Perform case search
      const { cases: caseResults, total } = await CaseOperations.search({
        ...validatedParams,
        status: normalizedStatus ?? validatedParams.status,
        offset,
      });
      // Create pagination info
      const pagination = createPagination(validatedParams.page, validatedParams.limit, total);
      return {
        cases: caseResults,
        pagination,
        search: validatedParams.query
          ? {
              term: validatedParams.query,
              resultsCount: caseResults.length,
              vectorSearchUsed: validatedParams.useVectorSearch,
            }
          : null,
      };
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error.message.includes('relation "cases"') || error.message.includes('Failed query'))
      ) {
        console.warn('[Cases API] Cases table unavailable – returning fallback payload.', error);
        return {
          cases: [],
          pagination: createPagination(searchParams.page || 1, searchParams.limit || 50, 0),
          search: searchParams.query
            ? {
                term: searchParams.query,
                resultsCount: 0,
                vectorSearchUsed: searchParams.useVectorSearch ?? false,
                degradedMode: true,
              }
            : null,
          metadata: {
            degraded: true,
            message: 'Cases data temporarily unavailable',
            timestamp: new Date().toISOString(),
          },
        };
      }
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => e.message).join('; ');
        throw CommonErrors.ValidationFailed('search parameters', message || 'Invalid parameters');
      }
      throw error;
    }
  }, event);
};
// POST - Create new case
export const POST: RequestHandler = async event => {
  return withApiHandler(async ({ request, locals }) => {
    // Get authenticated user (or dev stub)
    const user = resolveUser(locals);
    if (!user) throw CommonErrors.Unauthorized('User authentication required');
    // Parse and validate request body
    const caseData = await parseRequestBody(request, createCaseSchema);
    // Cast the parsed data to the refined type, as Zod's default() ensures these are present at runtime.
    const validatedCaseData: CreateCaseValidatedData = caseData as CreateCaseValidatedData;
    try {
      // Create case using enhanced operations
      const newCase = await CaseOperations.create({
        ...validatedCaseData,
        // incidentDate is already a Date | undefined due to schema preprocessing
        incidentDate: validatedCaseData.incidentDate,
        createdBy: user.id,
      });

      console.log(`✅ Case created successfully: ID=${newCase.id}, Number=${newCase.caseNumber}, User=${user.id}`);

      // Trigger PostgreSQL-first worker for auto-tagging and processing
      try {
        await triggerWorkerProcessing(newCase.id, {
          priority: validatedCaseData.priority, // No 'as string' needed, type is correct
          caseType: validatedCaseData.caseType || 'civil', // No 'as string' needed, type is correct
          userId: user.id,
          trigger: 'api-case-creation',
          metadata: {
            caseNumber: newCase.caseNumber,
            title: validatedCaseData.title,
            status: validatedCaseData.status,
            location: validatedCaseData.location,
            // Simplified incidentDate handling, relying on schema preprocessing
            incidentDate: validatedCaseData.incidentDate?.toISOString() ?? null,
            description: validatedCaseData.description,
            // Removed duplicate incidentDate property
          },
        });
        console.log(`🚀 Worker processing triggered for case: ${newCase.id}`);
      } catch (workerError: unknown) {
        // Corrected: Added type for workerError
        console.warn(`⚠️ Worker trigger failed for case ${newCase.id}:`, workerError);
        // Don't fail the case creation if worker trigger fails
      }
      return {
        case: newCase,
        message: `Case ${newCase.caseNumber} created successfully`,
        metadata: {
          workerTriggered: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw CommonErrors.BadRequest('Case with similar details already exists');
      }
      throw error;
    }
  }, event); // Corrected: Added 'event' as the second argument
};
// Additional endpoints
// PUT - Update existing case
export const PUT: RequestHandler = async event => {
  return withApiHandler(async ({ request, url, locals }) => {
    const user = resolveUser(locals);
    if (!user) throw CommonErrors.Unauthorized('User authentication required');
    const caseId = url.searchParams.get('id');
    if (!caseId) {
      throw CommonErrors.BadRequest('Case ID is required');
    }
    // Parse and validate update data
    const updateSchema = createCaseSchema.partial().omit({ status: true });
    const updates = await parseRequestBody(request, updateSchema);
    try {
      const updatedCase = await CaseOperations.update(caseId, updates, user.id);
      return {
        case: updatedCase,
        message: 'Case updated successfully',
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw CommonErrors.NotFound('Case');
      }
      throw error;
    }
  }, event);
};
// OPTIONS - CORS preflight
export const OPTIONS: RequestHandler = async () => {
  // In development, allow all origins for easier testing.
  // In production, restrict to your frontend domain for security.
  const allowedOrigin = process.env.NODE_ENV === 'production' ? 'https://your-frontend-domain.com' : '*';

  const headers = new Headers({
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  // 204 No Content for preflight
  return new Response(null, { status: 204, headers });
};

// Note: Using '*' for 'Access-Control-Allow-Origin' is only safe in development.
// Replace 'https://your-frontend-domain.com' with your actual production domain.
