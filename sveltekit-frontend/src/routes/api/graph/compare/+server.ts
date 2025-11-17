import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5';
import { db } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db';
import { evidence } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres';
import { inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return json({ success: false, error: 'ids array required' }, { status: 400 });
    }

    const rows = await db.select().from(evidence).where(inArray(evidence.id, ids));

    return json({
      success: true,
      items: rows
    });
  } catch (error) {
    console.error('Graph compare query failed:', error);
    return json(
      {
        success: false,
        items: [],
        error: 'Comparison unavailable'
      },
      { status: 200 }
    );
  }
};
