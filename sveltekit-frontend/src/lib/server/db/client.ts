import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema-unified.js';

// Environment check that works in both SvelteKit and worker contexts
const isDev = process.env.NODE_ENV === 'development';

// Connection strings with role separation
const RUNTIME_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db';
const ADMIN_DATABASE_URL =
  process.env.DATABASE_URL_ADMIN ||
  process.env.ADMIN_DATABASE_URL ||
  'postgresql://postgres:123456@localhost:5434/legal_ai_db';

// Create connections with role separation
let runtimeConnectionSingleton: postgres.Sql | null = null;
let adminConnectionSingleton: postgres.Sql | null = null;

function createRuntimeConnection(): postgres.Sql {
  if (!runtimeConnectionSingleton) {
    runtimeConnectionSingleton = postgres(RUNTIME_DATABASE_URL, {
      // Connection pool settings
      max: isDev ? 5 : 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30, // 30 minutes
      // Enable prepared statements for better performance
      prepare: !isDev, // Disable in isDev for better DX with schema changes
      // SSL settings (disable for local isDev)
      ssl: false,
      // Transform settings for compatibility
      transform: {
        undefined: null,
      },
      // Debug in isDevelopment;
      debug: isDev
        ? (connection, query, parameters) => {
            console.log('🐘 PostgreSQL Query:', query);
            if (parameters?.length) {
              console.log('📝 Parameters:', parameters);
            }
          }
        : false,
    });
  }
  return runtimeConnectionSingleton!;
}

function createAdminConnection(): postgres.Sql {
  if (!adminConnectionSingleton) {
    adminConnectionSingleton = postgres(ADMIN_DATABASE_URL, {
      // Minimal pool for admin operations
      max: 2,
      idle_timeout: 10,
      max_lifetime: 60 * 10, // 10 minutes
      prepare: false, // Admin operations don't need prepared statements
      ssl: false,
      transform: {
        undefined: null,
      },
      debug: isDev
        ? (connection, query, parameters) => {
            console.log('👑 Admin PostgreSQL Query:', query);
            if (parameters?.length) {
              console.log('📝 Parameters:', parameters);
            }
          }
        : false,
    });
  }
  return adminConnectionSingleton!;
}

// Create Drizzle clients with role separation
export const db = drizzle(createRuntimeConnection(), {
  schema,
  logger: isDev,
});
export const adminDb = drizzle(createAdminConnection(), {
  schema,
  logger: isDev,
});
// Initialize database (run migrations if needed with admin privileges)
let initialized = false;
async function initializeDatabase() {
  if (!initialized && !isDev) {
    try {
      console.log('🔄 Running database migrations with admin privileges...');
      await migrate(adminDb, { migrationsFolder: './src/lib/server/db/migrations' });
      console.log('✅ Database migrations completed');
    } catch (error) {
      console.warn('⚠️ Migration error (expected in isDevelopment):', error);
    }
    initialized = true;
  }
}
// Auto-initialize in production, skip in isDev
if (!isDev) {
  initializeDatabase();
}
// Export schema for type safety
export * from './schema-postgres.js';
// Health check utilities
export async function testRuntimeConnection(): Promise<boolean> {
  try {
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Runtime database connection healthy');
    // Safe narrowing: after Array.isArray(result) TypeScript treats result as unknown[]
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('❌ Runtime database connection test failed:', error);
    return false;
  }
}
export async function testAdminConnection(): Promise<boolean> {
  try {
    const result = await adminDb.execute('SELECT 1 as test');
    console.log('✅ Admin database connection healthy');
    // Safe narrowing: after Array.isArray(result) TypeScript treats result as unknown[]
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('❌ Admin database connection test failed:', error);
    return false;
  }
}
// Legacy alias for backward compatibility
export const testConnection = testRuntimeConnection;
// Graceful shutdown for both connections
export function closeConnections() {
  if (runtimeConnectionSingleton && typeof runtimeConnectionSingleton.end === 'function') {
    runtimeConnectionSingleton.end();
    console.log('🔌 Runtime database connection closed');
  }
  if (adminConnectionSingleton && typeof adminConnectionSingleton.end === 'function') {
    adminConnectionSingleton.end();
    console.log('🔌 Admin database connection closed');
  }
}
// Legacy alias
export const closeConnection = closeConnections;
export default db;
