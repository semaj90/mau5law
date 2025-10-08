// @ts-nocheck
import { building } from '$app/environment';
import * as schema from '$lib/server/db/schema-postgres';
import type { Collection } from 'lokijs';
import dotenv from 'dotenv';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pgClient, { poolShim } from '$lib/server/db-shim';
// Load environment-specific variables
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({ path: envFile });
let _db: PostgresJsDatabase<typeof schema> | null = null;
let _pool: any | null = null;
function initializeDatabase(): PostgresJsDatabase<typeof schema> | null {
  // Skip database initialization during SvelteKit build
  if (building) {
    console.log('Skipping database initialization during build');
    return null;
  }
  if (_db) return _db;
  // Use PostgreSQL for all environments
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/prosecutor_db';
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log('🔧 Database Configuration:');
  console.log('  NODE_ENV:', nodeEnv);
  console.log('  DATABASE_URL:', databaseUrl);
  // PostgreSQL connection (use postgres-js client shim)
  console.log('🐘 Connecting to PostgreSQL database (via postgres-js client):', databaseUrl);
  _pool = poolShim;
  _db = drizzle(pgClient as any, { schema });
  // Skip migrations in testing environment
  if (nodeEnv !== 'testing') {
    try {
      console.log('Running PostgreSQL migrations...');
      migrate(_db, { migrationsFolder: './drizzle' });
      console.log('✅ PostgreSQL migrations completed');
    } catch (error) {
      console.error('❌ PostgreSQL migration error:', error);
    }
  }
  console.log('✅ PostgreSQL database connected successfully');
  return _db;
}
// Main database connection
export const db: PostgresJsDatabase<typeof schema> = new Proxy({} as any, {
  get(target, prop, receiver) {
    const database = initializeDatabase();
    if (!database) {
      throw new Error('Database not initialized');
    }
    return Reflect.get(database, prop, receiver);
  },
});
// Call Qdrant tag seeding on startup
initializeQdrantCollection().catch(err => {
  console.error('Qdrant tag seeding failed:', err);
});
// Database metadata
export const isPostgreSQL = true;
export const isSQLite = false;
export const pool = _pool;
// Schema exports
export * from '$lib/server/db/schema-postgres';
// Graceful shutdown
export async function closeDatabase() {
  if (_pool) {
    console.log('Closing PostgreSQL connection pool...');
    try {
      if (typeof _pool.end === 'function') await _pool.end();
      else if (typeof (poolShim as any).end === 'function') await (poolShim as any).end();
    } catch (err) {
      console.warn('Error closing pool shim:', err);
    }
  }
}
