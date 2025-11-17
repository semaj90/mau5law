import type { drizzle  } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';

// Assuming DATABASE_URL is set in environment variables
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);



