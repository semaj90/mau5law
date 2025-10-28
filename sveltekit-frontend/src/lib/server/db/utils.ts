// Centralized Drizzle ORM helpers and DB exports for the project
// Tailored for Drizzle ORM v0.44.7 (modular imports)
import { db, adminDb, testRuntimeConnection, closeConnections } from '../db/client.js';

// Drizzle expressions and helpers (v0.44+ modular import paths)
import {
  eq as eqExpr,
  and as andExpr,
  or as orExpr,
  gt as gtExpr,
  lt as ltExpr,
  like as likeExpr,
  not as notExpr,
  asc as ascExpr,
  desc as descExpr,
} from 'drizzle-orm/expressions';

import { sql as sqlTag } from 'drizzle-orm/sql';

// pg-core exports (types & helpers)
export * from 'drizzle-orm/pg-core';

// Re-export commonly used expressions under friendly names
export const eq = eqExpr;
export const and = andExpr;
export const or = orExpr;
export const gt = gtExpr;
export const lt = ltExpr;
export const like = likeExpr;
export const not = notExpr;
export const asc = ascExpr;
export const desc = descExpr;
export const sql = sqlTag;

// Export the project's Drizzle DB instances
export { db, adminDb };

// Simple pgvector helpers (Postgres pgvector functions)
// Usage: where(cases.embedding, vectorEquals(vector)) or use raw sql for cosine
export function pgvectorCosineSql(columnName: string, paramPlaceholder = '$1') {
  // Returns SQL fragment to compute cosine similarity using pgvector operator
  // Example: WHERE (1 - (embedding <#> $1)) > 0.8
  return sql`(1 - (${sql.raw(columnName)} <#> ${sql.raw(paramPlaceholder)}))`;
}

// Small utility to wait for DB to be reachable (useful in dev startup scripts)
export async function waitForDb(retries = 8, delayMs = 500): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const ok = await testRuntimeConnection();
      if (ok) return true;
    } catch (e) {
      // ignore and retry
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

// Export connection utilities
export { testRuntimeConnection as testConnection, closeConnections as closeConnection };

// UUID helper (Postgres gen_random_uuid fallback)
export function genRandomUUID(): string {
  // prefer global crypto.randomUUID if available
  try {
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
    if (g?.crypto && typeof g.crypto.randomUUID === 'function') return g.crypto.randomUUID();
  } catch (e) {
    // ignore and fallback
  }
  // Node.js fallback
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    if (nodeCrypto && typeof nodeCrypto.randomUUID === 'function') return nodeCrypto.randomUUID();
  } catch (e) {
    // ignore
  }
  // deterministic zero-UUID fallback (rare)
  return '00000000-0000-4000-8000-000000000000';
}

const _default = {
  db,
  adminDb,
  eq,
  and,
  or,
  gt,
  lt,
  like,
  not,
  asc,
  desc,
  sql,
  waitForDb,
  testConnection: testRuntimeConnection,
  closeConnection: closeConnections,
};

export default _default;
