// src/lib/server/db/drizzle.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool, PoolClient, QueryResult } from 'pg';
import * as schema from './schema-postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// Create a mock pool for build time
const createMockPool = (): Pool =>
  ({
    connect: () => Promise.reject(new Error('Database not available during build')) as Promise<PoolClient>,
    end: () => Promise.resolve(),
    query: () => Promise.reject(new Error('Database not available during build')) as Promise<QueryResult<any>>,
  }) as any;
// Database configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db';
// Create pool - use mock during build or when DATABASE_URL indicates build environment
const isBuilding = process.env.NODE_ENV === 'build' || !!process.env.DATABASE_URL?.includes('build');
export const pool: Pool = isBuilding
  ? (createMockPool() as Pool)
  : new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Properly typed database instance using PostgresJS adapter types
export const db: PostgresJsDatabase<typeof schema> = drizzle(pool, {
  schema,
  logger: false,
});

// Export sql helper once
export { sql } from 'drizzle-orm';
