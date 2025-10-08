/**
 * Single Case REST API - Production Ready
 * GET /api/cases/:id - Get specific case
 * PUT /api/cases/:id - Update case
 * DELETE /api/cases/:id - Delete case
 */
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import postgres from 'postgres';
import { z } from 'zod';

// Database connection
const sql = postgres(
  process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_test',
  { max: 10 }
);

// Validation schemas
const UpdateCaseSchema = z.object({
  case_number: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['active', 'pending', 'closed', 'archived']).optional(),
  metadata: z.record(z.any()).optional(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/cases/:id
 * Get a specific case by ID
 */
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return json({ error: 'Invalid case ID format' }, { status: 400 });
    }

    const cases = await sql`
      SELECT
        id,
        case_number,
        title,
        status,
        metadata,
        created_at,
        updated_at
      FROM cases
      WHERE id = ${id}
    `;

    if (cases.length === 0) {
      return json({ error: 'Case not found' }, { status: 404 });
    }

    return json({ data: cases[0] });
  } catch (err) {
    console.error('❌ Error fetching case:', err);
    return json(
      { error: 'Failed to fetch case', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

/**
 * PUT /api/cases/:id
 * Update a case
 */
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return json({ error: 'Invalid case ID format' }, { status: 400 });
    }

    const body = await request.json();
    const validated = UpdateCaseSchema.parse(body);

    // Check if case exists
    const existingCase = await sql`
      SELECT id FROM cases WHERE id = ${id}
    `;

    if (existingCase.length === 0) {
      return json({ error: 'Case not found' }, { status: 404 });
    }

    // Check for duplicate case_number if updating
    if (validated.case_number) {
      const duplicate = await sql`
        SELECT id FROM cases
        WHERE case_number = ${validated.case_number}
        AND id != ${id}
      `;

      if (duplicate.length > 0) {
        return json({ error: 'Case number already exists' }, { status: 409 });
      }
    }

    // Build dynamic UPDATE query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validated.case_number !== undefined) {
      updates.push(`case_number = $${paramIndex}`);
      values.push(validated.case_number);
      paramIndex++;
    }

    if (validated.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      values.push(validated.title);
      paramIndex++;
    }

    if (validated.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(validated.status);
      paramIndex++;
    }

    if (validated.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(validated.metadata));
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, no actual changes
      return json({ error: 'No fields to update' }, { status: 400 });
    }

    // Execute update
    const updateQuery = `
      UPDATE cases
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, case_number, title, status, metadata, created_at, updated_at
    `;

    const updatedCase = await sql.unsafe(updateQuery, [...values, id]);

    return json({
      data: updatedCase[0],
      message: 'Case updated successfully',
    });
  } catch (err) {
    console.error('❌ Error updating case:', err);

    if (err instanceof z.ZodError) {
      return json(
        { error: 'Invalid request body', details: err.errors },
        { status: 400 }
      );
    }

    return json(
      { error: 'Failed to update case', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};

/**
 * DELETE /api/cases/:id
 * Delete a case (and cascade delete related evidence)
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;

    if (!UUID_REGEX.test(id)) {
      return json({ error: 'Invalid case ID format' }, { status: 400 });
    }

    // Check if case exists
    const existingCase = await sql`
      SELECT id, case_number FROM cases WHERE id = ${id}
    `;

    if (existingCase.length === 0) {
      return json({ error: 'Case not found' }, { status: 404 });
    }

    // Delete case (will cascade delete evidences, embeddings, etc.)
    await sql`
      DELETE FROM cases WHERE id = ${id}
    `;

    return json({
      message: 'Case deleted successfully',
      data: { id, case_number: existingCase[0].case_number },
    });
  } catch (err) {
    console.error('❌ Error deleting case:', err);
    return json(
      { error: 'Failed to delete case', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
