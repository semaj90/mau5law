import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import postgres from "postgres";
import * as schema from "./schema-postgres"; // Assuming schema-postgres.ts exists

const connection = postgres(process.env.DATABASE_URL!);
export const db = drizzle(connection, { schema });

import { canvasAutosaves } from './schema-canvas-autosaves';

const schema = { ...baseSchema, canvasAutosaves };
type AppSchema = typeof schema;

const DEFAULT_DATABASE_URL = 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db';

function getDatabaseUrl(): string {
	return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
}

function getAdminDatabaseUrl(): string {
	return process.env.ADMIN_DATABASE_URL || getDatabaseUrl();
}

function createPool(connectionString: string, maxClientsEnv?: string): Pool {
	const max = Number(maxClientsEnv ?? '10');
	return new Pool({
		connectionString,
		max: Number.isNaN(max) ? 10 : max,
		ssl:
			process.env.PGSSLMODE === 'require'
				? { rejectUnauthorized: process.env.PGSSLREJECTUNAUTHORIZED !== 'false' }
				: undefined
	});
}

let runtimePool: Pool | null = null;
let adminPool: Pool | null = null;
let runtimeDb: NodePgDatabase<AppSchema> | null = null;
let adminDb: NodePgDatabase<AppSchema> | null = null;

function ensureRuntimePool(): Pool {
	if (!runtimePool) {
		runtimePool = createPool(getDatabaseUrl(), process.env.PG_MAX_CLIENTS);
		runtimePool.on('error', (err) => {
			console.error('[db] runtime pool error', err);
		});
	}
	return runtimePool;
}

function ensureAdminPool(): Pool {
	if (!adminPool) {
		adminPool = createPool(getAdminDatabaseUrl(), process.env.PG_ADMIN_MAX_CLIENTS ?? '5');
		adminPool.on('error', (err) => {
			console.error('[db] admin pool error', err);
		});
	}
	return adminPool;
}

export function createRuntimeConnection(): NodePgDatabase<AppSchema> {
	if (!runtimeDb) {
		runtimeDb = drizzle(ensureRuntimePool(), { schema });
	}
	return runtimeDb;
}

export function createAdminConnection(): NodePgDatabase<AppSchema> {
	if (!adminDb) {
		adminDb = drizzle(ensureAdminPool(), { schema });
	}
	return adminDb;
}

export async function closeConnections(): Promise<void> {
	const closes: Promise<void>[] = [];

	if (runtimePool) {
		closes.push(
			runtimePool.end().catch((err) => {
				console.warn('[db] error closing runtime pool', err);
			})
		);
		runtimePool = null;
		runtimeDb = null;
	}

	if (adminPool) {
		closes.push(
			adminPool.end().catch((err) => {
				console.warn('[db] error closing admin pool', err);
			})
		);
		adminPool = null;
		adminDb = null;
	}

	await Promise.all(closes);
}

export const db = createRuntimeConnection();
export const adminDb = createAdminConnection();

export const pools = {
	get runtime() {
		return ensureRuntimePool();
	},
	get admin() {
		return ensureAdminPool();
	}
};

export * from './schema-postgres';
export { canvasAutosaves } from './schema-canvas-autosaves';

export default {
	getDb: createRuntimeConnection,
	getAdminDb: createAdminConnection,
	closeConnections
};
