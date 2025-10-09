// src/lib/server/db/drizzle.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Re-export the `sql` helper for other modules (single export)
export { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL ?? 'postgres://localhost:5432/deeds_dev';

// create a single pool for server runtime
export const pool = new Pool({
  connectionString,
  // keep reasonable defaults; tune per environment
  max: 10,
  // optional: short idle timeout to avoid long-lived connections in dev
  idleTimeoutMillis: 30000,
});

// Drizzle wrapper using node-postgres adapter
export const db = drizzle(pool, {
  logger: false,
});

// Optional helper to gracefully shutdown the pool (useful in tests/dev)
export async function shutdownDb() {
  await pool.end();
}
