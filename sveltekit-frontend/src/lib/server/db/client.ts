import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { dev } from '$app/environment';
import * as schema from './schema-postgres';

// Connection string from environment or fallback to development
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/legal_ai_db';

// Create the connection
let connectionSingleton: postgres.Sql;

function createConnection() {
	if (!connectionSingleton) {
		connectionSingleton = postgres(DATABASE_URL, {
			// Connection pool settings
			max: dev ? 5 : 10,
			idle_timeout: 20,
			max_lifetime: 60 * 30, // 30 minutes
			// Enable prepared statements for better performance
			prepare: !dev, // Disable in dev for better DX with schema changes
			// SSL settings (disable for local dev)
			ssl: false,
			// Transform settings for compatibility
			transform: {
				undefined: null,
			},
			// Debug in development
			debug: dev ? (connection, query, parameters) => {
				console.log('🐘 PostgreSQL Query:', query);
				if (parameters?.length) {
					console.log('📝 Parameters:', parameters);
				}
			} : false,
		});
	}
	return connectionSingleton;
}

// Create Drizzle client with schema
export const db = drizzle(createConnection(), { 
	schema,
	logger: dev
});

// Initialize database (run migrations if needed)
let initialized = false;

async function initializeDatabase() {
	if (!initialized && !dev) {
		try {
			console.log('🔄 Running database migrations...');
			await migrate(db, { migrationsFolder: './src/lib/server/db/migrations' });
			console.log('✅ Database migrations completed');
		} catch (error) {
			console.warn('⚠️ Migration error (expected in development):', error);
		}
		initialized = true;
	}
}

// Auto-initialize in production, skip in dev
if (!dev) {
	initializeDatabase();
}

// Export schema for type safety
export * from './schema-postgres';

// Utility function for health checks
export async function testConnection(): Promise<boolean> {
	try {
		const result = await db.execute('SELECT 1 as test');
		return Array.isArray(result) && result.length > 0;
	} catch (error) {
		console.error('❌ Database connection test failed:', error);
		return false;
	}
}

// Graceful shutdown
export function closeConnection() {
	if (connectionSingleton) {
		connectionSingleton.end();
		console.log('🔌 Database connection closed');
	}
}

export default db;
