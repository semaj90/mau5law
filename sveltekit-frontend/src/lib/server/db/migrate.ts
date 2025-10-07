// @ts-nocheck
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { sql } from 'drizzle-orm';
interface Migration {
  id: string;
  filename: string;
  applied_at?: Date;
}
async function runSqlMigrations(db: any, pool: Pool) {
  console.log('🚀 Running SQL migrations from migrations folder...');
  // Create migrations table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS migrations (
      id VARCHAR(255) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Get applied migrations
  const result = await db.execute(sql`
    SELECT id, filename, applied_at FROM migrations ORDER BY applied_at ASC
  `);
  const appliedMigrations = result.rows as Migration[];
  // Get available migration files
  const migrationsDir = join(process.cwd(), 'src/lib/server/db/migrations');
  const availableMigrations = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
    .sort();
  const appliedIds = new Set(appliedMigrations.map(m => m.id));
  const pendingMigrations = availableMigrations.filter(filename => {
    const id = filename.replace('.sql', '');
    return !appliedIds.has(id);
  });
  if (pendingMigrations.length === 0) {
    console.log('✅ No pending SQL migrations');
    return;
  }
  console.log(`Found ${pendingMigrations.length} pending SQL migrations:`);
  pendingMigrations.forEach(m => console.log(`  - ${m}`));
  for (const migration of pendingMigrations) {
    const migrationPath = join(migrationsDir, migration);
    const migrationSql = readFileSync(migrationPath, 'utf-8');
    console.log(`Running SQL migration: ${migration}`);
    try {
      // Split by semicolon and execute each statement
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const statement of statements) {
        if (statement.trim()) {
          await db.execute(sql.raw(statement));
        }
      }
      // Record migration as applied
      const migrationId = migration.replace('.sql', '');
      await db.execute(sql`
        INSERT INTO migrations (id, filename) VALUES (${migrationId}, ${migration})
      `);
      console.log(`✅ SQL Migration ${migration} completed successfully`);
    } catch (error) {
      console.error(`❌ SQL Migration ${migration} failed:`, error);
      throw error;
    }
  }
}
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  // removed unused db assignment
  console.log('⏳ Running database migrations...');
  console.log('📍 Database URL:', process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  try {
    // First run SQL migrations from the migrations folder
    await runSqlMigrations(db, pool);
    // Then run Drizzle migrations if they exist
    try {
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('✅ Drizzle migrations completed successfully.');
    } catch (error) {
      console.log('ℹ️ No Drizzle migrations found or already applied.');
    }
    console.log('✅ All migrations completed successfully.');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}
runMigrations().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
