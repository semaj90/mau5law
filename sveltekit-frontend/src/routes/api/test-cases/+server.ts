import { json, error } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { db } from '$lib/server/db';
import { cases, caseActivities } from '$lib/server/db/schema';
import { eq, and, or, desc, count, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { getEmbedding } from '$lib/server/services/embeddingService';
import type { RequestHandler } from './$types';
import { randomUUID, createHash } from 'crypto';

// Remove local any-typed alias and add a small type-guard helper instead
// const dbAny = db as unknown as any
function isHttpError(e: unknown): e is { status: number } {
  return (
    typeof e === 'object' && e !== null && 'status' in e && typeof (e as Record<string, unknown>).status === 'number'
  );
}
// Authentication helper
async function getAuthenticatedUser(locals: App.Locals) {
  const user = locals.user;
  const session = locals.session;
  if (!user || !session) {
    throw error(
      401,
      makeHttpErrorPayload({
        message: 'Authentication required',
        code: 'UNAUTHENTICATED',
      })
    );
  }
  return { user, session };
}
// Validation schema for case creation with enhanced fields
const createCaseSchema = z.object({
  caseNumber: z.string().min(1, 'Case number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['draft', 'open', 'in_progress', 'review', 'closed']).default('draft'),
  category: z.string().default('general'),
  assignedAttorney: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({}),
});
// Validation schema for case updates
const updateCaseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['draft', 'open', 'in_progress', 'review', 'closed']).optional(),
  category: z.string().optional(),
  assignedAttorney: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});
// Runtime resolver to tolerate different schema export naming conventions
async function resolveSchemaTable<T = unknown>(...candidates: string[]): Promise<T> {
  // dynamic import avoids compile-time errors if some names are absent
  const mod = (await import('$lib/server/db/schema')) as Record<string, unknown>;
  for (const name of candidates) {
    // use hasOwnProperty to avoid prototype surprises and narrow type safely
    if (Object.prototype.hasOwnProperty.call(mod, name)) {
      const val = mod[name];
      if (val !== undefined) return val as T;
    }
  }
  throw new Error(`Schema table not found. Tried: ${candidates.join(', ')}`);
}
// GET: Retrieve cases (authenticated users only see their own cases or cases assigned to them)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(locals);
    const caseId = url.searchParams.get('id');
    const status = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 100); // Cap at 100
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search');
    if (caseId) {
      // Get specific case with related data (only if user owns it or is assigned)
      const caseData = await db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          title: cases.title,
          description: cases.description,
          priority: cases.priority,
          status: cases.status,
          assignedAttorney: cases.assignedAttorney, // changed from assigned_attorney
          createdBy: cases.createdBy,
          createdAt: cases.createdAt, // changed from created_at
          updatedAt: cases.updatedAt, // changed from updated_at
          metadata: cases.metadata,
        })
        .from(cases)
        .where(
          and(
            eq(cases.id, caseId),
            or(
              eq(cases.createdBy, user.id), // User created the case
              eq(cases.assignedAttorney, user.id) // changed from assigned_attorney
            )
          )
        )
        .limit(1);
      if (caseData.length === 0) {
        throw error(
          404,
          makeHttpErrorPayload({
            message: 'Case not found or access denied',
            code: 'CASE_NOT_FOUND',
          })
        );
      }
      // Get related documents (resolve table at runtime to avoid missing-export compile errors)
      const caseDocuments = await resolveSchemaTable<any>('caseDocuments', 'case_documents', 'documents', 'case_docs'); // typed as any
      const documents = await db
        .select()
        .from(caseDocuments)
        .where(eq(caseDocuments.caseId, caseId))
        .orderBy(desc(caseDocuments.createdAt)); // changed from created_at
      // Get activities
      const activities = await db
        .select()
        .from(caseActivities)
        .where(eq(caseActivities.caseId, caseId))
        .orderBy(desc(caseActivities.createdAt)) // changed from timestamp
        .limit(50); // Limit activity history
      // Get timeline events (resolve table at runtime)
      const caseTimeline = await resolveSchemaTable<any>('caseTimeline', 'case_timeline', 'timeline', 'caseEvents'); // typed as any
      const timeline = await db
        .select()
        .from(caseTimeline)
        .where(eq(caseTimeline.caseId, caseId))
        .orderBy(desc(caseTimeline.createdAt)); // changed from timestamp
      return json({
        success: true,
        data: {
          ...caseData[0],
          documents,
          activities,
          timeline,
        },
      });
    }
    // Build query for cases the user has access to
    const whereConditions = [or(eq(cases.createdBy, user.id), eq(cases.assignedAttorney, user.id))]; // changed assigned_attorney -> assignedAttorney
    if (status) {
      whereConditions.push(eq(cases.status, status));
    }
    // If search term provided, search in title and description
    if (search) {
      whereConditions.push(or(ilike(cases.title, `%${search}%`), ilike(cases.description, `%${search}%`)));
    }
    // Get cases with pagination
    const result = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        title: cases.title,
        description: cases.description,
        priority: cases.priority,
        status: cases.status,
        assignedAttorney: cases.assignedAttorney, // changed from assigned_attorney
        createdBy: cases.createdBy,
        createdAt: cases.createdAt, // changed from created_at
        updatedAt: cases.updatedAt, // changed from updated_at
        metadata: cases.metadata,
      })
      .from(cases)
      .where(and(...whereConditions))
      .orderBy(desc(cases.updatedAt)) // changed from updated_at
      .limit(limit)
      .offset(offset);
    // Get total count for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(cases)
      .where(and(...whereConditions));
    return json({
      success: true,
      data: result,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      },
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: unknown) {
    if (isHttpError(err)) {
      // Re-throw SvelteKit errors
      throw err;
    }
    console.error('Error fetching cases:', err);
    throw error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to fetch cases',
        code: 'FETCH_ERROR',
      })
    );
  }
};
// POST: Create a new case (authenticated)
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(locals);
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCaseSchema.parse(body);
    // Generate unique ID and timestamps
    const caseId = randomUUID();
    const now = new Date();
    // Generate embedding for case content (title + description) using pgvector
    const caseContent = `${validatedData.title} ${validatedData.description || ''}`;
    let caseEmbedding = null;
    try {
      // Generate semantic embedding for similarity search
      caseEmbedding = await getEmbedding(caseContent);
    } catch (embeddingError) {
      console.warn('Failed to generate case embedding:', embeddingError);
      // Continue without embedding - not critical for case creation
    }
    // Check for duplicate case number for this user
    const existingCase = await db
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.caseNumber, validatedData.caseNumber), eq(cases.createdBy, user.id)))
      .limit(1);
    if (existingCase.length > 0) {
      // Log concise context and throw the HTTP error inline to avoid the parse issue
      console.warn('Duplicate case creation attempt', { userId: user.id, caseNumber: validatedData.caseNumber });
      throw error(400, makeHttpErrorPayload({ message: 'Case number already exists', code: 'DUPLICATE_CASE_NUMBER' }));
    }
    // Insert case into database (use typed db)
    const newCase = await db
      .insert(cases)
      .values({
        id: caseId,
        caseNumber: validatedData.caseNumber,
        title: validatedData.title,
        description: validatedData.description || '',
        priority: validatedData.priority,
        status: validatedData.status,
        assignedAttorney: validatedData.assignedAttorney || null,
        createdBy: user.id,
        userId: user.id, // For compatibility
        metadata: {
          ...validatedData.metadata,
          tags: validatedData.tags,
          category: validatedData.category,
          createdByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          embedding: caseEmbedding ? true : false,
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    // Create initial activity log
    await db.insert(caseActivities).values({
      id: randomUUID(),
      caseId: caseId,
      type: 'case_created',
      description: `Case ${validatedData.caseNumber} "${validatedData.title}" created`,
      userId: user.id,
      timestamp: now,
      metadata: {
        title: validatedData.title,
        priority: validatedData.priority,
        category: validatedData.category,
        userEmail: user.email,
      },
    });
    // Create initial timeline event
    // Insert timeline (resolve table at runtime)
    const caseTimelineInsert = (await resolveSchemaTable<any>(
      'caseTimeline',
      'case_timeline',
      'timeline',
      'caseEvents'
    )) as any;
    await db.insert(caseTimelineInsert).values({
      id: randomUUID(),
      caseId: caseId,
      event: 'Case Created',
      description: `Case ${validatedData.caseNumber} "${validatedData.title}" was created by ${user.email}`,
      timestamp: now,
      type: 'milestone',
      metadata: {
        createdBy: user.id,
        createdByEmail: user.email,
        priority: validatedData.priority,
      },
    });
    // If embedding was generated, store it in the embedding cache for future use
    if (caseEmbedding && caseEmbedding.length > 0) {
      try {
        const { embeddingCache } = (await import('$lib/server/db/schema')) as any;
        const contentHash = hashContent(caseContent);

        // Do a simple insert; if the DB client doesn't support onConflict style chaining,
        // fall back to an update if the insert errors (resilient upsert).
        try {
          await db.insert(embeddingCache).values({
            id: randomUUID(),
            content_hash: contentHash,
            embedding: caseEmbedding,
            model_name: 'embeddinggemma:latest',
            metadata: {
              entityType: 'case',
              entityId: caseId,
              content: caseContent.substring(0, 500),
            },
            created_at: now,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        } catch (insertErr) {
          console.warn('Insert to embeddingCache failed, attempting update as fallback', insertErr);
          try {
            await db
              .update(embeddingCache)
              .set({ embedding: caseEmbedding, updated_at: now })
              .where(
                // cast to any to avoid strict property errors for dynamically imported schema
                eq((embeddingCache as any).content_hash, contentHash)
              );
          } catch (updateErr) {
            console.warn('Failed to fallback-update embeddingCache:', updateErr);
          }
        }
        // Note: If you need ON CONFLICT DO NOTHING behavior with your DB client,
        // use the appropriate drizzle helper or raw SQL in a separate statement.
      } catch (cacheError) {
        console.warn('Failed to cache embedding:', cacheError);
      }
    }
    return json(
      {
        success: true,
        message: 'Case created successfully',
        data: {
          ...newCase[0],
          hasEmbedding: !!caseEmbedding,
          createdBy: {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (isHttpError(err)) {
      // Re-throw SvelteKit errors
      throw err;
    }
    console.error('Error creating case:', err);
    if (err instanceof z.ZodError) {
      throw error(
        400,
        makeHttpErrorPayload({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.errors,
        })
      );
    }
    throw error(500, makeHttpErrorPayload({ message: 'Failed to create case', code: 'CREATE_ERROR' }));
  }
};
// Helper function to hash content for embedding cache
function hashContent(content: string): string {
  // Use Node crypto createHash for deterministic, synchronous hashing
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
// PUT: Update an existing case (authenticated, owner or assigned only)
export const PUT: RequestHandler = async ({ request, url, locals }) => {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(locals);
    const caseId = url.searchParams.get('id');
    if (!caseId) {
      throw error(400, makeHttpErrorPayload({ message: 'Case ID is required', code: 'MISSING_CASE_ID' }));
    }
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateCaseSchema.parse(body);
    const now = new Date();
    // Check if user has permission to update this case
    // Include metadata in the selected fields so updates can merge safely
    const existingCase = await db
      .select({
        id: cases.id,
        title: cases.title,
        createdBy: cases.createdBy,
        assignedAttorney: cases.assignedAttorney,
        metadata: cases.metadata,
      })
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    if (existingCase.length === 0) {
      throw error(404, makeHttpErrorPayload({ message: 'Case not found', code: 'CASE_NOT_FOUND' }));
    }
    type CaseRecord = {
      id: string;
      title: string;
      createdBy: string;
      assignedAttorney?: string | null;
      metadata?: Record<string, unknown>;
    };
    const caseRecord = existingCase[0] as unknown as CaseRecord;
    const hasPermission =
      caseRecord.createdBy === user.id || caseRecord.assignedAttorney === user.id || user.role === 'admin';
    if (!hasPermission) {
      throw error(
        403,
        makeHttpErrorPayload({
          message: 'Access denied - you can only update cases you created or are assigned to',
          code: 'ACCESS_DENIED',
        })
      );
    }
    // Generate new embedding if title or description changed
    let newEmbedding = null;
    const titleChanged = validatedData.title && validatedData.title !== caseRecord.title;
    const descriptionChanged = validatedData.description !== undefined;
    if (titleChanged || descriptionChanged) {
      try {
        const newTitle = validatedData.title || caseRecord.title;
        const newDescription = validatedData.description || '';
        const newContent = `${newTitle} ${newDescription}`;
        newEmbedding = await getEmbedding(newContent);
      } catch (embeddingError) {
        console.warn('Failed to generate updated embedding:', embeddingError);
      }
    }
    // Build update object with only provided fields (avoid `any`)
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };
    if (validatedData.title) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.priority) updateData.priority = validatedData.priority;
    if (validatedData.status) updateData.status = validatedData.status;
    if (validatedData.category) updateData.category = validatedData.category;
    if (validatedData.assignedAttorney !== undefined) updateData.assignedAttorney = validatedData.assignedAttorney;
    // Update metadata (merge with existing metadata safely)
    if (validatedData.metadata || validatedData.tags || newEmbedding) {
      updateData.metadata = {
        ...((caseRecord.metadata as Record<string, unknown>) || {}),
        ...validatedData.metadata,
        ...(validatedData.tags && { tags: validatedData.tags }),
        ...(newEmbedding && { embedding: true }),
        updatedBy: user.id,
        updatedByEmail: user.email,
        lastUpdated: now.toISOString(),
      };
    }
    // Update case in database
    const updatedCase = await db.update(cases).set(updateData).where(eq(cases.id, caseId)).returning();
    // Log the update activity with detailed changes
    const changedFields = Object.keys(validatedData).filter(
      key =>
        (validatedData as Record<string, unknown>)[key] !== undefined &&
        (validatedData as Record<string, unknown>)[key] !== null
    );
    await db.insert(caseActivities).values({
      id: randomUUID(),
      caseId: caseId,
      type: 'case_updated',
      description: `Case updated by ${user.email}. Changed: ${changedFields.join(', ')}`,
      userId: user.id,
      timestamp: now,
      metadata: {
        changes: validatedData,
        changedFields,
        updatedBy: user.id,
        updatedByEmail: user.email,
        hasNewEmbedding: !!newEmbedding,
      },
    });
    // Update embedding cache if embedding was regenerated
    if (newEmbedding && newEmbedding.length > 0) {
      try {
        const { embeddingCache } = (await import('$lib/server/db/schema')) as any;
        const newTitle = validatedData.title || caseRecord.title;
        const newDescription = validatedData.description || '';
        const newContent = `${newTitle} ${newDescription}`;
        // const contentHash = await hashContent(newContent);
        const contentHash = hashContent(newContent);
        // Try insert, fall back to update if insert fails (resilient upsert)
        try {
          await db.insert(embeddingCache).values({
            id: randomUUID(),
            content_hash: contentHash,
            embedding: newEmbedding,
            model_name: 'embeddinggemma:latest',
            metadata: {
              entityType: 'case',
              entityId: caseId,
              content: newContent.substring(0, 500),
              action: 'updated',
            },
            created_at: now,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        } catch (insertErr) {
          console.warn('Insert to embeddingCache failed, attempting update as fallback', insertErr);
          try {
            await db
              .update(embeddingCache)
              .set({ embedding: newEmbedding, updated_at: now })
              .where(eq((embeddingCache as any).content_hash, contentHash));
          } catch (updateErr) {
            console.warn('Failed to fallback-update embeddingCache:', updateErr);
          }
        }
      } catch (cacheError) {
        console.warn('Failed to update embedding cache:', cacheError);
      }
    }
    return json({
      success: true,
      message: 'Case updated successfully',
      data: {
        ...updatedCase[0],
        hasNewEmbedding: !!newEmbedding,
        updatedBy: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        },
        changedFields,
      },
    });
  } catch (err: unknown) {
    if (isHttpError(err)) {
      throw err;
    }
    console.error('Error updating case:', err);
    if (err instanceof z.ZodError) {
      throw error(
        400,
        makeHttpErrorPayload({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: err.errors,
        })
      );
    }
    throw error(500, makeHttpErrorPayload({ message: 'Failed to update case', code: 'UPDATE_ERROR' }));
  }
};
// DELETE: Delete a case (authenticated, owner or admin only)
export const DELETE: RequestHandler = async ({ url, locals }) => {
  try {
    // Authenticate user
    const { user } = await getAuthenticatedUser(locals);
    const caseId = url.searchParams.get('id');
    if (!caseId) {
      throw error(400, makeHttpErrorPayload({ message: 'Case ID is required', code: 'MISSING_CASE_ID' }));
    }
    // Check if user has permission to delete this case
    const existingCase = await db
      .select({
        id: cases.id,
        title: cases.title,
        caseNumber: cases.caseNumber,
        createdBy: cases.createdBy,
        assignedAttorney: cases.assignedAttorney,
        status: cases.status,
      })
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    if (existingCase.length === 0) {
      throw error(404, makeHttpErrorPayload({ message: 'Case not found', code: 'CASE_NOT_FOUND' }));
    }
    const caseRecord = existingCase[0];
    // Only case creator or admin can delete cases
    const hasPermission = caseRecord.createdBy === user.id || user.role === 'admin';
    if (!hasPermission) {
      throw error(
        403,
        makeHttpErrorPayload({
          message: 'Access denied - only case creators or administrators can delete cases',
          code: 'DELETE_ACCESS_DENIED',
        })
      );
    }
    // Prevent deletion of cases that are in progress (safety check)
    const protectedStatuses = ['in_progress', 'review'];
    if (protectedStatuses.includes(caseRecord.status) && user.role !== 'admin') {
      throw error(
        400,
        makeHttpErrorPayload({
          message: `Cannot delete case with status '${caseRecord.status}'. Please close the case first or contact an administrator.`,
          code: 'CASE_STATUS_PROTECTED',
        })
      );
    }
    const now = new Date();
    // Log deletion activity before actual deletion
    await db.insert(caseActivities).values({
      id: randomUUID(),
      caseId: caseId,
      type: 'case_deleted',
      description: `Case "${caseRecord.title}" (${caseRecord.caseNumber}) deleted by ${user.email}`,
      userId: user.id,
      timestamp: now,
      metadata: {
        deletedCase: {
          id: caseRecord.id,
          title: caseRecord.title,
          caseNumber: caseRecord.caseNumber,
          status: caseRecord.status,
        },
        deletedBy: user.id,
        deletedByEmail: user.email,
        isAdmin: user.role === 'admin',
      },
    });
    // Delete related data in proper order (maintain referential integrity)
    // Resolve tables at runtime to perform deletions (avoid missing-export compile errors)
    const caseTimelineDel = await resolveSchemaTable<any>('caseTimeline', 'case_timeline', 'timeline', 'caseEvents');
    const caseDocumentsDel = await resolveSchemaTable<any>('caseDocuments', 'case_documents', 'documents', 'case_docs');
    const deleteResults = (await Promise.allSettled([
      db.delete(caseTimelineDel).where(eq(caseTimelineDel.caseId, caseId)),
      db.delete(caseActivities).where(eq(caseActivities.caseId, caseId)),
      db.delete(caseDocumentsDel).where(eq(caseDocumentsDel.caseId, caseId)),
    ])) as PromiseSettledResult<unknown>[];
    // Log any failures in related data deletion
    deleteResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const tableName = ['timeline', 'activities', 'documents'][index];
        console.warn(`Failed to delete ${tableName} for case ${caseId}:`, result.reason);
      }
    });
    // Delete the case itself
    const deletedCase = await db.delete(cases).where(eq(cases.id, caseId)).returning();
    if (deletedCase.length === 0) {
      throw error(
        500,
        makeHttpErrorPayload({
          message: 'Failed to delete case from database',
          code: 'DELETE_FAILED',
        })
      );
    }
    // Clean up embedding cache for this case
    try {
      const { embeddingCache } = (await import('$lib/server/db/schema')) as any;
      // Attempt to remove any cache rows for this case. Exact JSON matching may vary by DB;
      // cast to any to avoid TS errors and keep this best-effort cleanup.
      try {
        await db
          .delete(embeddingCache)
          .where(eq((embeddingCache as any).metadata, { entityType: 'case', entityId: caseId }));
      } catch (delErr) {
        console.warn('Fallback embedding cache delete failed (attempting looser delete by entityId):', delErr);
        // Best-effort: if metadata is JSON, some adapters require raw SQL. Skip on failure.
      }
    } catch (cacheError) {
      console.warn('Failed to clean up embedding cache:', cacheError);
    }
    return json({
      success: true,
      message: `Case "${caseRecord.title}" deleted successfully`,
      data: {
        id: caseId,
        title: caseRecord.title,
        caseNumber: caseRecord.caseNumber,
        deletedBy: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        },
        deletedAt: now.toISOString(),
        relatedDataDeleted: {
          timeline: deleteResults[0].status === 'fulfilled',
          activities: deleteResults[1].status === 'fulfilled',
          documents: deleteResults[2].status === 'fulfilled',
        },
      },
    });
  } catch (err: unknown) {
    if (isHttpError(err)) {
      throw err;
    }
    console.error('Error deleting case:', err);
    throw error(500, makeHttpErrorPayload({ message: 'Failed to delete case', code: 'DELETE_ERROR' }));
  }
};
