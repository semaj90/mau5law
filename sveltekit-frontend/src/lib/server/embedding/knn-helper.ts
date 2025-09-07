import { db } from '../db/index';
import { sql } from 'drizzle-orm';

export interface KNNQueryOptions {
  table?: 'document_chunks' | 'embeddings';
  column?: 'embedding';
  limit?: number;
  threshold?: number; // similarity >= threshold (0..1)
}

export async function knnSearch(embedding: number[], opts: KNNQueryOptions = {}) {
  const table = opts.table || 'document_chunks';
  const column = opts.column || 'embedding';
  const limit = opts.limit ?? 8;
  const threshold = opts.threshold ?? 0;

  const distanceExpr = sql`${sql.raw(column)} <=> ${embedding}`;
  const simExpr = sql`1 - (${distanceExpr})`;

  const where = threshold > 0 ? sql`WHERE 1 - (${distanceExpr}) >= ${threshold}` : sql``;

  const rows = await db.execute(sql`
    SELECT id, ${sql.raw(column)} AS embedding, ${simExpr} AS similarity
    FROM ${sql.raw(table)}
    ${where}
    ORDER BY ${distanceExpr}
    LIMIT ${limit}
  `);

  return rows.map((r: any) => ({ id: String(r.id), similarity: Number(r.similarity) }));
}

export async function ivfflatIndexExists(table: string, column: string, metric: 'cosine'|'l2'|'ip' = 'cosine') {
  const indexName = `idx_${table.toLowerCase()}_${column.toLowerCase()}_ivfflat_${metric}`;
  const rows = await db.execute(sql`
    SELECT 1 FROM pg_indexes WHERE indexname = ${indexName} LIMIT 1
  `);
  return rows.length > 0;
}
