/**
 * Centralized Database Connection Manager
 * Handles all database connections with connection pooling and error recovery
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import pgClient, { poolShim } from '$lib/server/db-shim';
import { getDatabaseConfig, validateDatabaseConfig } from '$lib/config/database.js';
import * as schema from './schema-postgres.js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Minimal pool/client shapes to avoid importing 'pg' types broadly
type LocalClientLike = {
  query: (
    textOrConfig: string | { text: string; values?: unknown[] },
    params?: unknown[]
  ) => Promise<{ rows?: RowLike[] }>;
  release?: () => void;
};

type LocalPoolLike = {
  connect: () => Promise<LocalClientLike>;
  end?: () => Promise<void>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  totalCount?: number;
  idleCount?: number;
  waitingCount?: number;
};

// NOTE: the shim exports runtime shapes and not necessarily TypeScript types/namespaces.
// Define a minimal local row shape to avoid "Cannot use namespace 'QueryResultRow' as a type."
type RowLike = Record<string, unknown>;

// Global connection instances
let appPool: LocalPoolLike | null = null;
let adminPool: LocalPoolLike | null = null;
let postgresJsClient: unknown | null = null;
let drizzleDb: PostgresJsDatabase<typeof schema> | null = null;

/**
 * Initialize application database pool
 */
export function getAppPool(): LocalPoolLike {
  if (!appPool) {
    const validation = validateDatabaseConfig();
    if (!validation.valid) {
      throw new Error(`Invalid database configuration: ${validation.errors.join(', ')}`);
    }
    const environment = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
    // Use the compatibility Pool shim which wraps postgres-js
    appPool = poolShim as LocalPoolLike;
    // Attach basic handlers if available
    try {
      appPool.on?.('error', (err: Error) => console.error('Database pool error:', err));
    } catch (e) {
      console.warn('Failed to attach appPool error handler', e);
    }
    try {
      appPool.on?.('connect', () => console.log('✅ Database pool connection established'));
    } catch (e) {
      console.warn('Failed to attach appPool connect handler', e);
    }
    console.log(`🐘 Database pool initialized for ${environment} environment`);
  }
  return appPool;
}

/**
 * Initialize admin database pool (for migrations and admin tasks)
 */
export function getAdminPool(): LocalPoolLike {
  if (!adminPool) {
    adminPool = poolShim as LocalPoolLike;
    try {
      adminPool.on?.('error', (err: Error) => console.error('Admin database pool error:', err));
    } catch (e) {
      console.warn('Failed to attach adminPool error handler', e);
    }
    console.log('🔧 Admin database pool initialized');
  }
  return adminPool;
}

/**
 * Get postgres.js client (for complex queries and better performance)
 */
export function getPostgresJsClient(): unknown {
  if (!postgresJsClient) {
    // Use the shared postgres-js client provided by the shim
    postgresJsClient = pgClient;
    console.log('🚀 Postgres.js client (from shim) initialized');
  }
  return postgresJsClient;
}

/**
 * Get Drizzle database instance (postgres-js adapter)
 */
export function getDrizzleDb(): PostgresJsDatabase<typeof schema> {
  if (!drizzleDb) {
    const client = getPostgresJsClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drizzleDb = drizzle(client as any, { schema });
    console.log('🗄️ Drizzle database (postgres-js) initialized');
  }
  return drizzleDb;
}

/**
 * Execute a query with automatic connection management
 */
export async function executeQuery<T>(queryFn: (client: LocalClientLike) => Promise<T>, useAdmin = false): Promise<T> {
  const pool = useAdmin ? getAdminPool() : getAppPool();
  const conn = await pool.connect();
  try {
    const result = await queryFn(conn);
    return result;
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  version?: string;
  tables?: string[];
  extensions?: string[];
  error?: string;
}> {
  try {
    const pool = getAppPool();
    const conn = await pool.connect();
    try {
      const versionResult = await conn.query('SELECT version()');
      const version = versionResult.rows?.[0]?.version;
      const tablesResult = await conn.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      const tables = (tablesResult.rows || [])
        .map((r: RowLike) => r['table_name'] as string | undefined)
        .filter(Boolean) as string[];
      const extensionsResult = await conn.query(`
        SELECT extname
        FROM pg_extension
        ORDER BY extname
      `);
      const extensions = (extensionsResult.rows || [])
        .map((r: RowLike) => r['extname'] as string | undefined)
        .filter(Boolean) as string[];
      return {
        success: true,
        version,
        tables,
        extensions,
      };
    } finally {
      if (conn && typeof conn.release === 'function') conn.release();
    }
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close all database connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  const promises: Promise<void>[] = [];
  if (appPool) {
    try {
      if (typeof appPool.end === 'function') promises.push(appPool.end());
    } catch (e) {
      console.warn('Error closing appPool via shim', e);
    }
    appPool = null;
  }
  if (adminPool) {
    try {
      if (typeof adminPool.end === 'function') promises.push(adminPool.end());
    } catch (e) {
      console.warn('Error closing adminPool via shim', e);
    }
    adminPool = null;
  }
  if (postgresJsClient) {
    const client = postgresJsClient as { end?: () => Promise<void>; close?: () => Promise<void> };
    try {
      if (typeof client.end === 'function') promises.push(client.end());
    } catch {
      try {
        if (typeof client.close === 'function') promises.push(client.close());
      } catch (e) {
        console.warn('Failed to close postgresJsClient gracefully', e);
      }
    }
    postgresJsClient = null;
  }
  await Promise.all(promises);
  drizzleDb = null;
  console.log('🛑 All database connections closed');
}

/**
 * Health check for database connections
 */
export async function getDatabaseHealth() {
  const config = getDatabaseConfig();
  const validation = validateDatabaseConfig();
  if (!validation.valid) {
    return {
      status: 'unhealthy',
      errors: validation.errors,
      config: null,
    };
  }
  try {
    const connectionTest = await testDatabaseConnection();
    return {
      status: connectionTest.success ? 'healthy' : 'unhealthy',
      config: {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        ssl: config.ssl,
      },
      connection: connectionTest,
      pools: {
        app: {
          totalCount: appPool?.totalCount || 0,
          idleCount: appPool?.idleCount || 0,
          waitingCount: appPool?.waitingCount || 0,
        },
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      config: null,
      connection: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
