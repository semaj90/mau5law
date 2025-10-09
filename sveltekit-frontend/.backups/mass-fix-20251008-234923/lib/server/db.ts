/*
  Consolidated Drizzle DB client and helper exports.
  Creates a single `db` export using postgres + drizzle and re-exports
  common helpers and schema exports for downstream modules.
*/
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm/sql';
import { eq, and, or, ilike, like } from 'drizzle-orm/sql/expressions/conditions';
import { count } from 'drizzle-orm/sql/functions/aggregate';

// Provide local ordering helpers
const desc = (col: any) => sql`${col} desc`;
const asc = (col: any) => sql`${col} asc`;

// Re-export commonly used pg-core helpers for schema files
export { pgTable, serial, text, integer, timestamp, boolean, json, index } from 'drizzle-orm/pg-core';

// Central schema import (consumer files import tables from $lib/server/db or ./schema)
import * as schema from './schema';

// Ensure DATABASE_URL is present (fail fast in dev/CI to avoid confusing SSR errors)
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('The DATABASE_URL environment variable is not set. Set it (e.g. via .env.development) before starting the app.');
}

// Create the postgres client and Drizzle instance
const client = postgres(connectionString, {
  max: 5,
  // Use undefined when not in production to match expected types (object | undefined)
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(client, { schema });
export default db;
export type DB = typeof db;

// Re-export sql/helpers for convenience in other modules
export { sql, eq, and, or, ilike, like, desc, asc, count };

// Provide a helpers object for code that expects a bag of helpers
export const helpers = { eq, and, or, ilike, like, desc, asc, count } as const;

// Re-export all schema exports to preserve existing import sites
export * from './schema';
