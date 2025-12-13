// src/routes/api/cases/[id]/notes/search/+server.ts

import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { caseNotes } from '$lib/server/db/schema-postgres';
import { eq, sql } from 'drizzle-orm';

export async function GET({ params, url }) {
  try {
    const { id: caseId } = params;
    const query = url.searchParams.get('q')?.trim();

    if (!query) {
      return json({ error: 'Missing search query' }, { status: 400 });
    }

    // Validate query length
    if (query.length > 500) {
      return json({ error: 'Query too long (max 500 characters)' }, { status: 400 });
    }

    // Perform full-text search using tsvector
    const results = await db
      .select({
        id: caseNotes.id,
        title: caseNotes.title,
        content: caseNotes.content,
        updated_at: caseNotes.updated_at,
        is_pinned: caseNotes.is_pinned,
        is_ai: caseNotes.is_ai,
        // Calculate relevance score
        rank: sql<number>`ts_rank(content_tsv, plainto_tsquery('english', ${query}))`,
      })
      .from(caseNotes)
      .where(
        sql`case_id = ${caseId} AND content_tsv @@ plainto_tsquery('english', ${query})`
      )
      .orderBy(
        sql`ts_rank(content_tsv, plainto_tsquery('english', ${query})) DESC`,
        sql`updated_at DESC`
      )
      .limit(50);

    // Format results with preview
    const hits = results.map(result => ({
      id: result.id,
      title: result.title || 'Untitled Note',
      preview: result.content.substring(0, 240),
      updated_at: result.updated_at?.toISOString(),
      is_pinned: result.is_pinned,
      is_ai: result.is_ai,
      rank: result.rank,
    }));

    return json({ hits, total: hits.length });
  } catch (error) {
    console.error('Search error:', error);
    return json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
