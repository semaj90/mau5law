import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { evidenceBoards } from '$lib/database/enhanced-schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { cuidSchema } from '$lib/server/z-schemas';

const updateEvidenceBoardSchema = z.object({
  layout: z.any().optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

// PUT /api/evidence-boards/[id] - Update an evidence board
export const PUT: RequestHandler = async ({ request, locals, params }) => {
  try {
    const session = await locals.auth();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const boardId = cuidSchema.parse(params.id);
    const body = await request.json();
    const validatedData = updateEvidenceBoardSchema.parse(body);

    const [updatedBoard] = await db
      .update(evidenceBoards)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(evidenceBoards.id, boardId))
      .returning();

    if (!updatedBoard) {
      return json({ error: 'Board not found' }, { status: 404 });
    }

    return json({ success: true, data: updatedBoard });
  } catch (error) {
    console.error('Error updating evidence board:', error);
    if (error instanceof z.ZodError) {
      return json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return json({ error: 'Failed to update evidence board' }, { status: 500 });
  }
};
