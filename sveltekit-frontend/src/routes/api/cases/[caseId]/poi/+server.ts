import type { Case } from '$lib/types';
import { cuidSchema } from '$lib/server/z-schemas';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { casePoiRelations, personsOfInterest, cases } from '$lib/database/enhanced-schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createCasePoiRelationSchema = z.object({
  poiId: cuidSchema,
  relationshipType: z.enum(['suspect', 'witness', 'victim', 'informant', 'other']),
  role: z.string().optional(),
  involvementLevel: z.enum(['primary', 'secondary', 'peripheral', 'unknown']).default('unknown'),
  notes: z.string().optional()
});

const updateCasePoiRelationSchema = createCasePoiRelationSchema.partial();

// GET /api/cases/[caseId]/poi - Get all POIs for a case
export const GET: RequestHandler = async ({ params, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseId = params.caseId;

    // Verify case exists
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, caseId));

    if (!caseRecord) {
      return json({ error: 'Case not found' }, { status: 404 });
    }

    // Get POI relationships for the case
    const casePois = await db
      .select({
        relation: casePoiRelations,
        poi: personsOfInterest
      })
      .from(casePoiRelations)
      .innerJoin(personsOfInterest, eq(casePoiRelations.poiId, personsOfInterest.id))
      .where(
        and(
          eq(casePoiRelations.caseId, caseId),
          eq(casePoiRelations.isActive, true),
          eq(personsOfInterest.isActive, true)
        )
      );

    return json({
      success: true,
      data: casePois
    });
  } catch (error) {
    console.error('Error fetching case POIs:', error);
    return json({ error: 'Failed to fetch case POIs' }, { status: 500 });
  }
};

// POST /api/cases/[caseId]/poi - Add POI to case
export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const caseId = params.caseId;
    const body = await request.json();
    const validatedData = createCasePoiRelationSchema.parse(body);

    // Verify case exists
    const [caseRecord] = await db.select().from(cases).where(eq(cases.id, caseId));

    if (!caseRecord) {
      return json({ error: 'Case not found' }, { status: 404 });
    }

    // Verify POI exists
    const [poi] = await db.select().from(personsOfInterest).where(eq(personsOfInterest.id, validatedData.poiId));

    if (!poi) {
      return json({ error: 'POI not found' }, { status: 404 });
    }

    // Check if relationship already exists
    const [existingRelation] = await db
      .select()
      .from(casePoiRelations)
      .where(
        and(
          eq(casePoiRelations.caseId, caseId),
          eq(casePoiRelations.poiId, validatedData.poiId),
          eq(casePoiRelations.isActive, true)
        )
      );

    if (existingRelation) {
      return json({ error: 'POI is already associated with this case' }, { status: 409 });
    }

    // Create relationship
    const [newRelation] = await db
      .insert(casePoiRelations)
      .values({
        caseId,
        poiId: validatedData.poiId,
        relationshipType: validatedData.relationshipType,
        role: validatedData.role,
        involvementLevel: validatedData.involvementLevel,
        notes: validatedData.notes,
        createdBy: session.user.id
      })
      .returning();

    return json(
      {
        success: true,
        data: newRelation
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding POI to case:', error);
    if (error instanceof z.ZodError) {
      return json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return json({ error: 'Failed to add POI to case' }, { status: 500 });
  }
};
