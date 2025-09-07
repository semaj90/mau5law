// Database connection management with role separation
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Environment configuration
const isDevelopment = process.env.NODE_ENV === "development";

/**
 * 🔐 Runtime App Connection (legal_admin - limited privileges)
 * Use this for all normal app operations: queries, inserts, updates
 */
const appConnectionString = 
  process.env.DATABASE_URL || 
  "postgresql://legal_admin:123456@localhost:5432/legal_ai_db";

/**
 * 👑 Admin Connection (postgres - superuser)
 * Use this only for migrations, extensions, and administrative tasks
 */
const adminConnectionString = 
  process.env.ADMIN_DATABASE_URL || 
  process.env.MIGRATION_DATABASE_URL || 
  "postgresql://postgres:123456@localhost:5432/legal_ai_db";

// App connection pool (for normal operations)
export const appPool = isDevelopment 
  ? new Pool({
      connectionString: appConnectionString,
      max: 5, // Smaller pool for development
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      connectionString: appConnectionString,
      max: 20,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 5000,
    });

// Admin connection pool (for migrations/extensions)
export const adminPool = new Pool({
  connectionString: adminConnectionString,
  max: 2, // Small pool since admin operations are infrequent
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

// Drizzle instances
export const db: NodePgDatabase<typeof schema> = drizzle(appPool, { schema });
export const adminDb: NodePgDatabase<typeof schema> = drizzle(adminPool, { schema });

// Connection info for logging
export const connectionInfo = {
  app: appConnectionString.replace(/:([^:@]*@)/, ':***@'), // Hide password
  admin: adminConnectionString.replace(/:([^:@]*@)/, ':***@'), // Hide password
  environment: isDevelopment ? 'development' : 'production'
};

// Utility functions
export async function testAppConnection(): Promise<boolean> {
  try {
    const client = await appPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('App connection failed:', error);
    return false;
  }
}

export async function testAdminConnection(): Promise<boolean> {
  try {
    const client = await adminPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Admin connection failed:', error);
    return false;
  }
}

export async function ensureExtensions(): Promise<void> {
  try {
    const client = await adminPool.connect();
    
    // Enable required extensions with superuser privileges
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "vector"');
    
    console.log('✅ PostgreSQL extensions ensured');
    client.release();
  } catch (error) {
    console.error('Failed to ensure extensions:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pools...');
  await Promise.all([appPool.end(), adminPool.end()]);
});

process.on('SIGINT', async () => {
  console.log('Closing database pools...');
  await Promise.all([appPool.end(), adminPool.end()]);
  process.exit(0);
});