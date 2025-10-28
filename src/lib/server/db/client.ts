import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Docker-friendly fallback per project conventions.
// The environment should provide DATABASE_URL; fall back to docker service name.
const connectionString =
	process.env.DATABASE_URL || 'postgresql://legal_admin:123456@postgres:5432/legal_ai_db';

// Small pool for server usage; tune max as needed for your environment
export const pool = new Pool({
	connectionString,
	max: 10,
});

// Drizzle ORM instance (if you need typed schema usage later)
export const db = drizzle(pool);

// export connectionString for debugging/health checks if needed
export const DB_CONNECTION_STRING = connectionString;
