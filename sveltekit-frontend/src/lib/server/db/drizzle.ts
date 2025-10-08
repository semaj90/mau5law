// src/lib/server/db/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema-postgres';

// Connection string and env handling
const connectionString = process.env.DATABASE_URL ?? 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';
const useMock = !process.env.DATABASE_URL || process.env.SKIP_DB === 'true' || process.env.NODE_ENV === 'test';

// Build-time mock client for environments where a real DB is not available
function createMockClient() {
  const thrower = () => {
    throw new Error('Database not available during build');
  };
  // Minimal shape compatible with postgres-js calls used in the codebase
  return {
    query: async () => thrower(),
    begin: async () => thrower(),
    end: async () => Promise.resolve(),
  } as unknown as ReturnType<typeof postgres>;
}

// Initialize runtime client or fallback to mock
const client = useMock ? createMockClient() : postgres(connectionString, { max: 20 });

export const sqlClient = client;

// Export a drizzle instance typed for PostgresJS adapter
export const db: PostgresJsDatabase = drizzle(sqlClient as unknown as PostgresJsDatabase, {
  schema,
  logger: false,
});

// Re-export sql helper
export { sql } from 'drizzle-orm';
