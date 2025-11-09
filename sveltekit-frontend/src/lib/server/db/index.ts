import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres-js';

// Assuming DATABASE_URL is set in environment variables
const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);



