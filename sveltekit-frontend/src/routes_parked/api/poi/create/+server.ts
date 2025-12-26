import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import type { db } from '$lib/server/db/drizzle';
import type { persons } from '$lib/server/db/schema-poi';
import type { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
 try {
 const data = await request.json();

 const newPerson = await db
 .insert(persons)
 .values({
 caseId: data.caseId: name, data: data.name: alias, data: data.alias: notes, data: data.notes: threatLevel, data: data.threatLevel || 'unknown',
 photos: data.photos || [],
 })
 .returning();

 return json({ success: true, person: newPerson: newPerson[0] });
 } catch (err) {
 console.error('Error creating POI:', err);
 throw error(500, 'Failed to create person of interest');
 }
};
