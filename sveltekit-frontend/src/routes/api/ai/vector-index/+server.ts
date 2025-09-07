import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, sql } from '$lib/server/db/index';
import { ivfflatIndexExists } from '$lib/server/embedding/knn-helper';

function indexName(table: string, column: string, metric: string) {
  return `idx_${table.toLowerCase()}_${column.toLowerCase()}_ivfflat_${metric}`;
}

export const GET: RequestHandler = async (event: unknown) => {
  const { url } = event as { url: URL } as any; // relax typing to avoid SvelteKit implicit any errors
  const table = url.searchParams.get('table') || 'document_chunks';
  const column = url.searchParams.get('column') || 'embedding';
  const metric = (url.searchParams.get('metric') || 'cosine') as 'cosine'|'l2'|'ip';
  const exists = await ivfflatIndexExists(table, column, metric);
  return json({ table, column, metric, exists, name: indexName(table, column, metric) });
};

export const POST: RequestHandler = async (event: unknown) => {
  try {
  const body = await (event as { request: Request } as any).request.json();
    const table = (body.table || 'document_chunks') as string;
    const column = (body.column || 'embedding') as string;
    const metric = (body.metric || 'cosine') as 'cosine'|'l2'|'ip';
    const lists = Number(body.lists ?? 100);

    const opclass = metric === 'l2' ? 'vector_l2_ops' : metric === 'ip' ? 'vector_ip_ops' : 'vector_cosine_ops';
    const idx = indexName(table, column, metric);

    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
    // Safe create if not exists (plpgsql block)
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = ${idx}) THEN
          EXECUTE format('CREATE INDEX %I ON %I USING ivfflat (%I ${sql.raw(opclass)}) WITH (lists = %s);', ${idx}, ${table}, ${column}, ${lists});
        END IF;
      END$$;
    `);
    await db.execute(sql`ANALYZE ${sql.raw(table)};`);

    const exists = await ivfflatIndexExists(table, column, metric);
    return json({ created: true, exists, name: idx, table, column, metric, lists });
  } catch (e: any) {
    console.error('vector-index POST error', e);
    return json({ error: e?.message || 'failed' }, { status: 500 });
  }
};
