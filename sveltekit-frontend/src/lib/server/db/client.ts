import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { env } from '$env/dynamic/private';
import * as schema from './schema-postgres.js';

/**
 * True when running in development mode (NODE_ENV === 'development')
 */
const isDev: boolean = process.env.NODE_ENV === 'development';

/**
 * Returns the main application database URL.
 */
function getDatabaseUrl(): string {
  return env.DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/app';
}

/**
 * Returns the admin database URL (used for migrations and privileged operations).
 * Falls back to the main database URL if ADMIN_DATABASE_URL is not set.
 */
function getAdminDatabaseUrl(): string {
  return env.ADMIN_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL ?? getDatabaseUrl();
}

// Singletons for database connections
let runtimeConnectionSingleton: postgres.Sql | null = null;
let adminConnectionSingleton: postgres.Sql | null = null;

function createRuntimeConnection(): postgres.Sql {
  if (!runtimeConnectionSingleton) {
    const databaseUrl = getDatabaseUrl();
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }
    runtimeConnectionSingleton = postgres(databaseUrl, {
      max: isDev ? 5 : 10,
      idle_timeout: 20,
      max_lifetime: 60 * 30, // 30 minutes
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
    const adminDatabaseUrl = getAdminDatabaseUrl();
    if (!adminDatabaseUrl) {
      throw new Error('ADMIN_DATABASE_URL is not set in environment variables');
    }
    adminConnectionSingleton = postgres(adminDatabaseUrl, {
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

// Lazy-initialized Drizzle instances for Vite SSR compatibility
// These defer connection establishment until first actual use
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let adminDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function initializeDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    dbInstance = drizzle(createRuntimeConnection(), {
      schema,
      logger: isDev,
    });
  }
  return dbInstance;
}

function initializeAdminDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!adminDbInstance) {
    adminDbInstance = drizzle(createAdminConnection(), {
      schema,
      logger: isDev,
    });
  }
  return adminDbInstance;
}

// Export lazy-loaded database instances using Proxies
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = initializeDb();
    return Reflect.get(instance, prop);
  },
  has(_target, prop) {
    const instance = initializeDb();
    return Reflect.has(instance, prop);
  },
  ownKeys(_target) {
    const instance = initializeDb();
    return Reflect.ownKeys(instance);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const instance = initializeDb();
    return Reflect.getOwnPropertyDescriptor(instance, prop);
  },
});

export const adminDb = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = initializeAdminDb();
    return Reflect.get(instance, prop);
  },
  has(_target, prop) {
    const instance = initializeAdminDb();
    return Reflect.has(instance, prop);
  },
  ownKeys(_target) {
    const instance = initializeAdminDb();
    return Reflect.ownKeys(instance);
  },
  getOwnPropertyDescriptor(_target, prop) {
    const instance = initializeAdminDb();
    return Reflect.getOwnPropertyDescriptor(instance, prop);
  },
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
      console.warn('⚠️ Migration error (expected in development):', error);
    }
    initialized = true;
  }
}

// Auto-initialize in production, skip in dev
if (!isDev) {
  initializeDatabase();
}

// Export schema for type safety
export * from './schema-postgres.js';

// Health check utilities
export async function testRuntimeConnection(): Promise<boolean> {
  try {
    const result = await createRuntimeConnection()`SELECT 1 as test`;
    console.log('✅ Runtime database connection healthy');
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    console.error('❌ Runtime database connection test failed:', error);
    return false;
  }
}

export async function testAdminConnection(): Promise<boolean> {
  try {
    const result = await createAdminConnection()`SELECT 1 as test`;
    console.log('✅ Admin database connection healthy');
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
