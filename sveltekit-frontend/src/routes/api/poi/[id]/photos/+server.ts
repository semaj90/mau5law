import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/drizzle';
import { poiPhotos } from '$lib/server/db/schema-postgres';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const poiId = parseInt(params.id);

        if (isNaN(poiId)) {
            throw error(400, 'Invalid POI ID');
        }

        const photos = await db
            .select()
            .from(poiPhotos)
            .where(eq(poiPhotos.poiId, poiId))
            .orderBy(poiPhotos.createdAt);

        return json(photos);
    } catch (err) {
        console.error('Error fetching POI photos:', err);
        throw error(500, 'Failed to fetch POI photos');
    }
};