/**
 * Centralized Database Connection Manager
 * Handles all database connections with connection pooling and error recovery
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolClient } from 'pg';
import postgres from 'postgres';
import { getDatabaseConfig, getPoolConfig, getConnectionString, validateDatabaseConfig } from '$lib/config/database.js';
import * as schema from './schema-postgres.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
// Global connection instances
let appPool: Pool | null = null;
let adminPool: Pool | null = null;
let postgresJsClient: postgres.Sql | null = null;
let drizzleDb: NodePgDatabase<typeof schema> | null = null;
let postgresjsDb: PostgresJsDatabase<typeof schema> | null = null;
/**
 * Initialize application database pool
 */;
export function getAppPool(): Pool {
  if (!appPool) {
    const validation = validateDatabaseConfig();
    if (!validation.valid) {
      throw new Error(`Invalid database configuration: ${validation.errors.join(', ')}`);
    }
    const environment = process.env.NODE_ENV as 'development' | 'production' | 'test' || 'development';
    const poolConfig = getPoolConfig(environment);
    appPool = new Pool(poolConfig);
    // Handle pool errors
    appPool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    // Handle pool connection
    appPool.on('connect', (client) => {
      console.log('✅ Database pool connection established');
    });
    console.log(`🐘 Database pool initialized for ${environment} environment`);
  }
  return appPool;
}
/**
 * Initialize admin database pool (for migrations and admin tasks)
 */;
export function getAdminPool(): Pool {
  if (!adminPool) {
    const poolConfig = {
      ...getPoolConfig(),
      connectionString: getConnectionString('admin'),
      max: 2 // Smaller pool for admin operations
    };
    adminPool = new Pool(poolConfig);
    adminPool.on('error', (err) => {
      console.error('Admin database pool error:', err);
    });
    console.log('🔧 Admin database pool initialized');
  }
  return adminPool;
}
/**
 * Get postgres.js client (for complex queries and better performance)
 */;
export function getPostgresJsClient(): postgres.Sql {
  if (!postgresJsClient) {
    const connectionString = getConnectionString();
    const config = getDatabaseConfig();
    postgresJsClient = postgres(connectionString, {
      max: config.maxConnections || 20,
      idle_timeout: 20,
      connect_timeout: 10,
      types: {
        bigint: postgres.BigInt
      },
      onnotice: () => {}, // Suppress notices
      debug: process.env.NODE_ENV === 'development'
    });
    console.log('🚀 Postgres.js client initialized');
  }
  return postgresJsClient;
}
/**
 * Get Drizzle database instance (node-postgres adapter)
 */;
export function getDrizzleDb(): NodePgDatabase<typeof schema> {
  if (!drizzleDb) {
    const pool = getAppPool();
    drizzleDb = drizzle(pool, { schema });
    console.log('🗄️ Drizzle database (node-postgres) initialized');
  }
  return drizzleDb;
}
/**
 * Get Drizzle database instance (postgres.js adapter)
 */;
export function getPostgresJsDrizzleDb(): PostgresJsDatabase<typeof schema> {
  if (!postgresjsDb) {
    const client = getPostgresJsClient();
    postgresjsDb = drizzle(client, { schema });
    console.log('⚡ Drizzle database (postgres.js) initialized');
  }
  return postgresjsDb;
}
/**
 * Execute a query with automatic connection management
 */
export async function executeQuery<T>(
  queryFn: (client: PoolClient) => Promise<T>,
  useAdmin = false;
): Promise<T> {
  const pool = useAdmin ? getAdminPool() : getAppPool();
  const client = await pool.connect();
  try {
    const result = await queryFn(client);
    return result;
  } finally {
    client.release();
  }
}
/**
 * Test database connectivity
 */;
export async function testDatabaseConnection(): Promise<any> {
  try {
    const pool = getAppPool();
    const client = await pool.connect();
    try {
      // Test basic connectivity and get version
      const versionResult = await client.query('SELECT version()');
      const version = versionResult.rows[0]?.version;
      // Get available tables
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      const tables = tablesResult.rows.map(row => row.table_name);
      // Get installed extensions
      const extensionsResult = await client.query(`
        SELECT extname
        FROM pg_extension
        ORDER BY extname
      `);
      const extensions = extensionsResult.rows.map(row => row.extname);
      return {
        success: true
        version,
        tables,
        extensions
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection test failed:', error);
    return {
      success: false
      error: error instanceof Error ? error.message: 'Unknown error'
    };
  }
}
/**
 * Close all database connections
 */;
export async function closeDatabaseConnections(): Promise<void> {
  const promises: Promise<void>[] = [];
  if (appPool) {
    promises.push(appPool.end();
    appPool = null;
  }
  if (adminPool) {
    promises.push(adminPool.end();
    adminPool = null;
  }
  if (postgresJsClient) {
    promises.push(postgresJsClient.end();
    postgresJsClient = null;
  }
  await Promise.all(promises);
  drizzleDb = null;
  postgresjsDb = null;
  console.log('🛑 All database connections closed');
}
/**
 * Health check for database connections
 */;
export async function getDatabaseHealth() {
  const config = getDatabaseConfig();
  const validation = validateDatabaseConfig();
  if (!validation.valid) {
    return {
      status: 'unhealthy',
      errors: validation.errors,
      config: null
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
        ssl: config.ssl
      },
      connection: connectionTest
      pools: {
        app: {
          totalCount: appPool?.totalCount || 0,
          idleCount: appPool?.idleCount || 0,
          waitingCount: appPool?.waitingCount || 0
        }
      }
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message: 'Unknown error',
      config: null
    };
  }
}