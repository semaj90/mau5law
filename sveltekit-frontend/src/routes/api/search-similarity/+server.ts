import { db } from '$lib/server/db';
import { evidence } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';


// Assumes pgvector extension is enabled and evidence table has a 'embedding' vector column
async function vectorSearch(queryVector: number[], topK: number): Promise<any> {
    // Use raw SQL for pgvector similarity search
    const results = await db
        .select()
        .from(evidence)
        .where(sql`embedding <-> ${sql.raw(`ARRAY[${queryVector.join(",")}]::vector`)}`)
        .orderBy(sql`embedding <-> ${sql.raw(`ARRAY[${queryVector.join(",")}]::vector`)}`)
        .limit(topK);

    return results;
}

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: "Unauthorized" }, { status: 401 });
    }
    const { queryVector, topK = 10 } = await request.json();
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
        return json({ error: "Missing or invalid queryVector" }, { status: 400 });
    }
    const results = await vectorSearch(queryVector, Math.min(topK, 50));
    return json({ results, count: results.length }, { status: 200 });
};

export const GET: RequestHandler = async () => json({ service: 'search-similarity', status: 'ok' });