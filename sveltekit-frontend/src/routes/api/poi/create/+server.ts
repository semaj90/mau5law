import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types // TODO: Verify store subscription is correct for Svelte 5';
import { db } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/drizzle';
import { persons } from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-poi';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();

    const newPerson = await db.insert(persons).values({
      caseId: data.caseId,
      name: data.name,
      alias: data.alias,
      notes: data.notes,
      threatLevel: data.threatLevel || 'unknown',
      photos: data.photos || [],
    }).returning();

    return json({ success: true, person: newPerson[0] });
  } catch (err) {
    console.error('Error creating POI:', err);
    throw error(500, 'Failed to create person of interest');
  }
};