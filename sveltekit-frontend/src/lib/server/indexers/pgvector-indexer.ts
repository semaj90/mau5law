// Minimal pgvector indexer using Drizzle (safe no-op if db not configured)
import type { InferInsertModel } from 'drizzle-orm';

// Lazy imports to avoid build failure when not configured
export async function indexPgVector(doc: { id: string; text: string; embedding: number[] }) {
  try {
    const mod = await import('$lib/server/db/connection');
    const schema = await import('$lib/server/db/schema-unified');
    const db: any = (mod as any).db;
    const table: any = (schema as any).embeddings;
    if (!db || !table) return { ok: false, reason: 'db_or_table_missing' };
    const row: InferInsertModel<any> = {
      id: doc.id,
      content: doc.text,
      embedding: doc.embedding as any,
      createdAt: new Date()
    } as any;
    await db.insert(table).values(row);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
