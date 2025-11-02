export function getDatabaseUrl(): string {
  // Prefer Docker service hostnames, fall back to localhost for local dev
  return process.env.DATABASE_URL || 'postgresql://legal_admin:123456@postgres:5432/legal_ai_db';
 }

export function getAdminDatabaseUrl(): string {
  return process.env.ADMIN_DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/postgres';
 }


