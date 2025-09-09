/*
  Consolidated Drizzle DB client and helper exports.
  This file provides a single `db` export and common helpers/aliases
  to prevent duplicate export errors during builds.

  It prefers `DATABASE_URL` env var. If not present, `db` will be null
  and routes that depend on DB should guard accordingly.
*/

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { eq, and, or, ilike, like, desc, asc, count } from 'drizzle-orm';

// Re-export commonly used pg-core helpers for schema files that import from $lib/server/db
export {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  json,
  index,
} from 'drizzle-orm/pg-core';

// Load schema pieces (many routes import tables directly from these)
import * as pgSchema from './db/schema-postgres';
import * as domainSchema from './schema';

const CONNECTION = process.env.DATABASE_URL || '';

let db: ReturnType<typeof drizzle> | null = null;
if (CONNECTION) {
  const pool = new Pool({ connectionString: CONNECTION });
  // Combine schemas so Drizzle has knowledge of both sets
  const combinedSchema = {
    ...(pgSchema as Record<string, unknown>),
    ...(domainSchema as Record<string, unknown>),
  };
  db = drizzle(pool, { schema: combinedSchema });
}

export { db };

// Re-export sql/helpers for convenience
export { sql, eq, and, or, ilike, like, desc, asc, count };

// Provide a helpers bag for consumers
export const helpers = { eq, and, or, ilike, like, desc, asc, count } as const;

// Re-export commonly referenced tables to preserve existing import sites
export { users, cases, evidence, legalDocuments } from './db/schema-postgres';
export { legalDocuments as legal_documents } from './db/schema-postgres';
export { legalDocuments as legal_documents_v2 } from './schema';
export * as legacySchema from './schema';
