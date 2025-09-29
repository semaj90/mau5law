import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { casePoiRelations } from '$lib/database/enhanced-schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateCasePoiRelationSchema = z.object({
  relationshipType: z.enum(['suspect', 'witness', 'victim', 'informant', 'other']).optional(),
  role: z.string().optional(),
  involvementLevel: z.enum(['primary', 'secondary', 'peripheral', 'unknown']).optional(),
  notes: z.string().optional()
});

// PUT /api/cases/[caseId]/poi/[relationId] - Update case-POI relationship
export const PUT: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, relationId } = params;
    const body = await request.json();
    const validatedData = updateCasePoiRelationSchema.parse(body);

    // Check if relationship exists
    const [existingRelation] = await db
      .select()
      .from(casePoiRelations)
      .where(and(
        eq(casePoiRelations.id, relationId),
        eq(casePoiRelations.caseId, caseId),
        eq(casePoiRelations.isActive, true)
      ));

    if (!existingRelation) {
      return json({ error: 'Case-POI relationship not found' }, { status: 404 });
    }

    // Update relationship
    const [updatedRelation] = await db
      .update(casePoiRelations)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(casePoiRelations.id, relationId))
      .returning();

    return json({
      success: true,
      data: updatedRelation
    });
  } catch (error) {
    console.error('Error updating case-POI relationship:', error);
    if (error instanceof z.ZodError) {
      return json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return json({ error: 'Failed to update relationship' }, { status: 500 });
  }
};

// DELETE /api/cases/[caseId]/poi/[relationId] - Remove POI from case
export const DELETE: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { caseId, relationId } = params;

    // Check if relationship exists
    const [existingRelation] = await db
      .select()
      .from(casePoiRelations)
      .where(and(
        eq(casePoiRelations.id, relationId),
        eq(casePoiRelations.caseId, caseId),
        eq(casePoiRelations.isActive, true)
      ));

    if (!existingRelation) {
      return json({ error: 'Case-POI relationship not found' }, { status: 404 });
    }

    // Soft delete relationship
    await db
      .update(casePoiRelations)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(casePoiRelations.id, relationId));

    return json({
      success: true,
      message: 'POI removed from case successfully'
    });
  } catch (error) {
    console.error('Error removing POI from case:', error);
    return json({ error: 'Failed to remove POI from case' }, { status: 500 });
  }
};
