// Evidence Board API Routes
import { json } from '@sveltejs/kit';;
import type { RequestHandler } from './$types';
import type { db  } from '$lib/server/db';
import type { evidenceNodes, evidenceConnections  } from '$lib/server/db/schema';
import type { eq, and  } from 'drizzle-orm';

// GET /api/evidence/nodes - Get all evidence nodes for a case
export async function GET({ url }: { url: URL }) {
  const caseId = url.searchParams.get('caseId');

  if (!caseId) {
    return json({ error: 'caseId parameter required' }, { status: 400 });
  }

  try {
    const nodes = await db
      .select()
      .from(evidenceNodes)
      .where(eq(evidenceNodes.caseId, caseId));

    return json({ nodes });
  } catch (error) {
    console.error('Error fetching evidence nodes:', error);
    return json({ error: 'Failed to fetch evidence nodes' }, { status: 500 });
  }
}

// POST /api/evidence/nodes - Create a new evidence node
export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();

    const newNode = await db
      .insert(evidenceNodes)
      .values({
        caseId: data.caseId,
        title: data.title,
        description: data.description,
        type: data.type,
        thumbnailUrl: data.thumbnailUrl,
        contentUrl: data.contentUrl,
        x: data.x || 100,
        y: data.y || 100,
        embedding: data.embedding,
      })
      .returning();

    return json({ node: newNode[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating evidence node:', error);
    return json({ error: 'Failed to create evidence node' }, { status: 500 });
  }
}