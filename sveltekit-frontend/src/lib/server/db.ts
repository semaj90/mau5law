// src/lib/server/db.ts - Drizzle ORM client setup
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DATABASE_URL } from '$env/static/private';
import * as pgSchema from './db/schema-postgres';
import * as domainSchema from './db/schema';
import { sql } from 'drizzle-orm';

const client = postgres(DATABASE_URL!);
// Combine canonical postgres schema with domain extensions so db.query.* works across both
const combinedSchema = { ...(pgSchema as Record<string, unknown>), ...(domainSchema as Record<string, unknown>) };
export const db = drizzle(client, { schema: combinedSchema });

// Re-export commonly used helpers so existing imports work
export { sql, eq, and, or, ilike, like, desc, asc, count } from 'drizzle-orm';

// Provide a stable helpers bag for where/order builders
// Consumers can: import { helpers } from '$lib/server/db'; const { eq, and, or, ilike, desc, asc, count } = helpers;
import { eq, and, or, ilike, like, desc, asc, count } from 'drizzle-orm';

export const helpers = {
	eq,
	and,
	or,
	ilike,
	like,
	desc,
	asc,
	count
} as const;

// Re-export selected tables expected by routes
// Primary unified schema under ./db/schema.ts
export {
	users,
	cases,
	evidence,
	legal_documents,
} from './db/schema-postgres';

// Provide camelCase alias for legacy imports
export { legal_documents as legalDocuments } from './db/schema-postgres';

// Compatibility aliases: some code refers to legalDocuments from alternate schema
// Also expose legacy domain legalDocuments if needed
export { legalDocuments as legal_documents_v2 } from './db/schema';

// Also expose alternate schema tables if routes import from $lib/server/schema
export * as legacySchema from './schema';
