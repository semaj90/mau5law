// src/routes/api/rag/tags/+server.ts

import { json } from '@sveltejs/kit';
import { sql } from '$lib/server/db';

export async function GET({ url }) {
  try {
    const namespace = url.searchParams.get('namespace'); // 'statute' | 'case' | null
    const q = (url.searchParams.get('q') ?? '').trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200);

    const rows = await sql`
      SELECT id, namespace, name, jurisdiction, created_at
      FROM citation_tags
      WHERE (${namespace}::text IS NULL OR namespace = ${namespace})
        AND (${q} = '' OR name ILIKE ${'%' + q + '%'})
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return json({ tags: rows });
  } catch (error) {
    console.error('Tag browse error:', error);
    return json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}