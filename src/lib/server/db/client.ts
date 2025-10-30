/**
 * Drizzle ORM client setup.
 * Uses the DATABASE_URL environment variable for connection.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseUrl } from "$lib/server/utils/env";
import * as schema from "./schema"; // Import all schema definitions

const databaseUrl = getDatabaseUrl();

// For production, use a connection pool.
// For development, a single client might be sufficient, but a pool is safer.
const pool = new Pool({
  connectionString: databaseUrl,
});

const db = drizzle(pool, { schema });

export default db;

// export connectionString for debugging/health checks if needed
export const DB_CONNECTION_STRING = databaseUrl;
}

// Drizzle ORM instance (if you need typed schema usage later)
export const db = getDb();

// export connectionString for debugging/health checks if needed
export const DB_CONNECTION_STRING = getDatabaseUrl();
