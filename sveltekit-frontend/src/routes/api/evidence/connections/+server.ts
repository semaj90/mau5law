// Evidence Connections API Routes
import { json } from '@sveltejs/kit';;
import type { RequestHandler } from './$types ';
import type { db  } from '$lib/server/db';
import type { evidenceConnections  } from '$lib/server/db/schema';
import type { eq  } from 'drizzle-orm';

// GET /api/evidence/connections - Get all connections for a case
export async function GET({ url }: { url: URL }) {
  const caseId = url.searchParams.get('caseId');

  if (!caseId) {
    return json({ error: 'caseId parameter required' }, { status: 400 });
  }

  try {
    // Get connections where either source or target node belongs to the case
    const connections = await db
      .select()
      .from(evidenceConnections)
      .where(eq(evidenceConnections.sourceId, caseId)); // This needs to be updated to join with nodes

    return json({ connections });
  } catch (error) {
    console.error('Error fetching evidence connections:', error);
    return json({ error: 'Failed to fetch evidence connections' }, { status: 500 });
  }
}

// POST /api/evidence/connections - Create a new connection
export async function POST({ request }: { request: Request }) {
  try {
    const data = await request.json();

    const newConnection = await db
      .insert(evidenceConnections)
      .values({
        sourceId: data.sourceId,
        targetId: data.targetId,
        relationship: data.relationship || 'related',
        strength: data.strength || 0.5,
      })
      .returning();

    return json({ connection: newConnection[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating evidence connection:', error);
    return json({ error: 'Failed to create evidence connection' }, { status: 500 });
  }
}