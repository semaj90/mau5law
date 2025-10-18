import type { DocumentItem, VisionItem, SearchResult, LegalMetadata } from '../../types/sharedTypes';
import { Pool } from 'pg';

// Single, canonical pg.Pool instance for server runtime
const POOL: Pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Upsert a document or vision item into the `embeddings` table.
 * Expects `embeddings` on the item to be an array of numbers.
 */
export async function upsertToPGVector(item: DocumentItem | VisionItem): Promise<{ ok: boolean }> {
  const id = item.id;
  const vector = (item as DocumentItem).embeddings ?? (item as VisionItem).embeddings ?? [];
  const doc = {
    id,
    source: (item as DocumentItem).source ?? null,
    meta: (item as DocumentItem).meta ?? null,
  };

  const sql = `
    INSERT INTO embeddings (id, doc, vector)
    VALUES ($1, $2, $3)
    ON CONFLICT (id)
    DO UPDATE SET doc = EXCLUDED.doc, vector = EXCLUDED.vector
  `;

  await POOL.query(sql, [id, JSON.stringify(doc), vector]);
  return { ok: true };
}

/**
 * Search pgvector-enabled table using the cosine-like <#> operator (adjust if your setup differs).
 * Returns SearchResult[] which must include `source` per shared types.
 */
export async function searchPGVector(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  const sql = `
    SELECT id, doc, vector, 1.0 - (vector <#> $1) as score
    FROM embeddings
    ORDER BY vector <#> $1
    LIMIT $2
  `;

  const res = await POOL.query(sql, [queryVector, topK]);

  // Use a safe, explicit type for `doc.meta` instead of `any`.
  type MetaShape = Record<string, unknown> & {
    snippet?: string;
    case?: unknown;
    jurisdiction?: unknown;
    parties?: unknown;
    datesFiled?: unknown;
    courtLevel?: unknown;
    classification?: unknown;
    processing?: unknown;
  };
  type RowType = {
    id: string;
    doc: { source?: string; meta?: MetaShape } | null;
    vector: number[];
    score: number;
  };

  // Ensure the returned metadata satisfies the LegalMetadata shape expected by SearchResult.
  function normalizeLegalMetadata(meta?: MetaShape): LegalMetadata {
    // Type guards
    const isRecord = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;
    const isString = (v: unknown): v is string => typeof v === 'string';
    const isStringArray = (v: unknown): v is string[] =>
      Array.isArray(v) && v.every((e) => typeof e === 'string');

    // Extract and validate `case` information
    let caseId = '';
    let jurisdiction = '';
    let parties: string[] = [];
    let datesFiled: string[] = [];
    let courtLevel: 'district' | 'appellate' | 'supreme' = 'district';

    const caseRaw = meta && (meta.case as unknown);
    if (isString(caseRaw)) {
      // If case is a simple string, treat it as the id
      caseId = caseRaw;
    } else if (isRecord(caseRaw)) {
      if (isString(caseRaw.id)) caseId = caseRaw.id;
      if (isString(caseRaw.jurisdiction)) jurisdiction = caseRaw.jurisdiction;
      if (isStringArray(caseRaw.parties)) parties = caseRaw.parties;
      if (isStringArray(caseRaw.datesFiled)) datesFiled = caseRaw.datesFiled;
      if (
        isString(caseRaw.courtLevel) &&
        (caseRaw.courtLevel === 'district' ||
          caseRaw.courtLevel === 'appellate' ||
          caseRaw.courtLevel === 'supreme')
      ) {
        courtLevel = caseRaw.courtLevel;
      }
    }

    const defaultCase = {
      id: caseId,
      jurisdiction,
      parties,
      datesFiled,
      courtLevel
    };

    const classification = isString(meta?.classification) ? meta!.classification : 'unknown';
    const processing = isRecord(meta?.processing) ? (meta!.processing as Record<string, unknown>) : {};
    const snippet = isString(meta?.snippet) ? meta!.snippet : '';

    const normalized: Record<string, unknown> = {
      case: defaultCase,
      classification,
      processing,
      snippet,
      // preserve other keys conservatively
      ...(isRecord(meta) ? meta : {})
    };

    return normalized as unknown as LegalMetadata;
  }

  return (res.rows as RowType[]).map((r) => ({
    id: r.id,
    score: r.score,
    source: r.doc?.source ?? 'unknown',
    snippet: (r.doc?.meta?.snippet as string) ?? '',
    metadata: normalizeLegalMetadata(r.doc?.meta ?? undefined),
  }));
}

export default { upsertToPGVector, searchPGVector };
