import pg from 'pg';
import postgres from 'postgres';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
	connectionString
});

// Also export postgres client for template literals
export const sql = postgres(connectionString, {
	max: 10,
	idle_timeout: 20,
	connect_timeout: 10,
});
