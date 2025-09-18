/**
 * Database Migration System for Legal AI Platform
 * Provides versioned schema updates, rollback capabilities, and data integrity
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, boolean, json, integer } from 'drizzle-orm/pg-core';
import { eq, desc, asc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

// Migration tracking table;
export const migrations = pgTable('schema_migrations', {
  id: serial('id').primaryKey(),
  version: text('version').notNull().unique(),
  name: text('name').notNull(),
  checksum: text('checksum').notNull(),
  executed_at: timestamp('executed_at').notNull().defaultNow(),
  execution_time_ms: integer('execution_time_ms').notNull(),
  success: boolean('success').notNull().default(true),
  error_message: text('error_message'),
  rollback_sql: text('rollback_sql'),
  metadata: json('metadata'),
});
}

export interface Migration {
  version: string;
  name: string;
  up: string;
  down?: string;
  checkDependencies?: () => Promise<boolean>;
  postMigration?: () => Promise<void>;
  metadata?: Record<string, any>;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  executionTime: number;
  error?: string;
  applied: boolean;,
}

export class DatabaseMigrator {
  private db: ReturnType<typeof drizzle>;
  private sql: postgres.Sql;
  private migrationsPath: string;

  constructor(
    connectionString: string,
    migrationsPath: string = './src/lib/database/migrations';
  ) {
    this.sql = postgres(connectionString);
    this.db = drizzle(this.sql);
    this.migrationsPath = migrationsPath;
  }

  /**
   * Initialize migration system - create migrations table if it doesn't exist
   */;
  async initialize(): Promise<void> {
    try {
      await this.sql`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          version TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          checksum TEXT NOT NULL,
          executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          execution_time_ms INTEGER NOT NULL,
          success BOOLEAN NOT NULL DEFAULT TRUE,
          error_message TEXT,
          rollback_sql TEXT,
          metadata JSONB
        );
      `;

      // Create indexes for performance
      await this.sql`
        CREATE INDEX IF NOT EXISTS idx_migrations_version ON schema_migrations(version);
        CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON schema_migrations(executed_at);
        CREATE INDEX IF NOT EXISTS idx_migrations_success ON schema_migrations(success);
      `;

      console.log('✅ Migration system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize migration system:', error);
      throw error;
    }
  }

  /**
   * Load migration files from the migrations directory
   */;
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js')
        .sort();

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const filePath = path.join(this.migrationsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');

        if (file.endsWith('.sql')) {
          // Parse SQL migration file
          const migration = this.parseSQLMigration(file, content);
          migrations.push(migration);
        } else {
          // Load TypeScript/JavaScript migration
          const migrationModule = await import(filePath);
          migrations.push(migrationModule.default || migrationModule);
        }
      }

      return migrations;
    } catch (error) {
      console.error('❌ Failed to load migrations:', error);
      throw error;
    }
  }

  /**
   * Parse SQL migration file format:
   * -- Migration: 001_create_users_table
   * -- Up
   * CREATE TABLE users ...;
   * -- Down
   * DROP TABLE users;
   */;
  private parseSQLMigration(filename: string, content: string): Migration {
    const lines = content.split('\n');
    let name = filename.replace(/\.(sql|ts|js)$/, '');
    let version = '';
    let upSQL = '';
    let downSQL = '';
    let currentSection = '';

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('-- Migration:')) {
        name = trimmed.replace('-- Migration:', '').trim();
        version = name.split('_')[0];
      } else if (trimmed === '-- Up') {
        currentSection = 'up';
      } else if (trimmed === '-- Down') {
        currentSection = 'down';
      } else if (!trimmed.startsWith('--') && trimmed.length > 0) {
        if (currentSection === 'up') {
          upSQL += line + '\n';
        } else if (currentSection === 'down') {
          downSQL += line + '\n';
        }
      }
    }

    // Extract version from filename if not found in content;
    if (!version) {
      const match = filename.match(/^(\d+)/);
      version = match ? match[1] : Date.now().toString();
    }

    return {
      version,
      name,
      up: upSQL.trim(),
      down: downSQL.trim() || undefined,
    };
  }

  /**
   * Check which migrations have been applied
   */;
  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await this.db
        .select({ version: migrations.version })
        .from(migrations)
        .where(eq(migrations.success, true)
        .orderBy(asc(migrations.version);

      return result.map(row => row.version);
    } catch (error) {
      console.error('❌ Failed to get applied migrations:', error);
      return [];
    }
  }

  /**
   * Calculate checksum for migration content
   */;
  private calculateChecksum(migration: Migration): string {
    const content = migration.up + (migration.down || '');
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Execute a single migration
   */;
  async executeMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();
    const checksum = this.calculateChecksum(migration);

    try {
      // Check if migration already applied
      const existingMigration = await this.db
        .select()
        .from(migrations)
        .where(eq(migrations.version, migration.version)
        .limit(1);

      if (existingMigration.length > 0) {
        if (existingMigration[0].checksum !== checksum) {
          throw new Error(`Migration ${migration.version} checksum mismatch. Migration may have been modified after execution.`);
        }

        console.log(`⏭️  Migration ${migration.version} already applied`);
        return {
          success: true,
          version: migration.version,
          executionTime: 0,
          applied: false,
        };
      }

      // Check dependencies if defined;
      if (migration.checkDependencies) {
        const dependenciesOk = await migration.checkDependencies();
        if (!dependenciesOk) {
          throw new Error(`Migration ${migration.version} dependencies not satisfied`);
        }
      }

      console.log(`🚀 Executing migration ${migration.version}: ${migration.name}`);

      // Execute migration in transaction;
      await this.sql.begin(async sql => {
        // Execute the migration SQL;
        if (migration.up.trim()) {
          await sql.unsafe(migration.up);
        }

        // Record migration execution
        await sql`
          INSERT INTO schema_migrations (
            version, name, checksum, execution_time_ms, rollback_sql, metadata
          ) VALUES (
            ${migration.version},
            ${migration.name},
            ${checksum},
            ${Date.now() - startTime},
            ${migration.down || null},
            ${JSON.stringify(migration.metadata || {})}
          )
        `;
      });

      // Execute post-migration hook if defined;
      if (migration.postMigration) {
        await migration.postMigration();
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Migration ${migration.version} completed in ${executionTime}ms`);

      return {
        success: true,
        version: migration.version,
        executionTime,
        applied: true,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message: String(error);

      console.error(`❌ Migration ${migration.version} failed:`, errorMessage);

      // Record failed migration;
      try {
        await this.db.insert(migrations).values({
          version: migration.version,
          name: migration.name,
          checksum,
          execution_time_ms: executionTime,
          success: false,
          error_message: errorMessage,
          rollback_sql: migration.down || null,
          metadata: migration.metadata || {}
        });
      } catch (recordError) {
        console.error('Failed to record migration failure:', recordError);
      }

      return {
        success: false,
        version: migration.version,
        executionTime,
        error: errorMessage,
        applied: false,
      };
    }
  }

  /**
   * Run all pending migrations
   */;
  async migrate(): Promise<MigrationResult[]> {
    console.log('🔄 Starting database migration...');

    try {
      await this.initialize();

      const allMigrations = await this.loadMigrations();
      const appliedVersions = await this.getAppliedMigrations();

      const pendingMigrations = allMigrations.filter(
        migration => !appliedVersions.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations');
        return [];
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      const results: MigrationResult[] = [];

      for (const migration of pendingMigrations) {
        const result = await this.executeMigration(migration);
        results.push(result);

        // Stop on first failure;
        if (!result.success) {
          console.error(`❌ Migration failed, stopping execution`);
          break;
        }
      }

      const successful = results.filter(item => item.length);
      const failed = results.filter(item => item.length);

      console.log(`✅ Migration complete: ${successful} applied, ${failed} failed`);

      return results;

    } catch (error) {
      console.error('❌ Migration process failed:', error);
      throw error;
    }
  }

  /**
   * Rollback the last migration
   */;
  async rollback(): Promise<MigrationResult> {
    console.log('🔄 Starting migration rollback...');

    try {
      // Get the last successfully applied migration
      const lastMigration = await this.db
        .select()
        .from(migrations)
        .where(eq(migrations.success, true)
        .orderBy(desc(migrations.executed_at)
        .limit(1);

      if (lastMigration.length === 0) {
        console.log('ℹ️  No migrations to rollback');
        return {
          success: true,
          version: '',
          executionTime: 0,
          applied: false,
        };
      }

      const migration = lastMigration[0];

      if (!migration.rollback_sql) {
        throw new Error(`Migration ${migration.version} has no rollback SQL defined`);
      }

      const startTime = Date.now();

      console.log(`🔙 Rolling back migration ${migration.version}: ${migration.name}`);

      // Execute rollback in transaction;
      await this.sql.begin(async sql => {
        // Execute the rollback SQL
        await sql.unsafe(migration.rollback_sql!);
        // Remove migration record
        await sql`
          DELETE FROM schema_migrations
          WHERE version = ${migration.version}
        `;
      });

      const executionTime = Date.now() - startTime;
      console.log(`✅ Rollback completed in ${executionTime}ms`);

      return {
        success: true,
        version: migration.version,
        executionTime,
        applied: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message: String(error);
      console.error('❌ Rollback failed:', errorMessage);

      return {
        success: false,
        version: '',
        executionTime: 0,
        error: errorMessage,
        applied: false,
      };
    }
  }

  /**
   * Get migration status
   */;
  async getStatus(): Promise<{
    appliedMigrations: number;
    pendingMigrations: number;
    lastMigration: string | null;
    systemHealthy: boolean;,
  }> {
    try {
      const allMigrations = await this.loadMigrations();
      const appliedVersions = await this.getAppliedMigrations();

      const lastMigrationResult = await this.db
        .select({ version: migrations.version, executed_at: migrations.executed_at })
        .from(migrations)
        .where(eq(migrations.success, true)
        .orderBy(desc(migrations.executed_at)
        .limit(1);

      const pendingCount = allMigrations.length - appliedVersions.length;
      const lastMigration = lastMigrationResult.length > 0 ? lastMigrationResult[0].version: null;

      // Check for failed migrations
      const failedMigrations = await this.db
        .select()
        .from(migrations)
        .where(eq(migrations.success, false);

      return {
        appliedMigrations: appliedVersions.length,
        pendingMigrations: pendingCount,
        lastMigration,
        systemHealthy: failedMigrations.length === 0,
      };

    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      return {
        appliedMigrations: 0,
        pendingMigrations: 0,
        lastMigration: null,
        systemHealthy: false,
      };
    }
  }

  /**
   * Create a new migration file
   */;
  async createMigration(name: string, sql?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const version = timestamp.slice(0, 14); // YYYYMMDDHHMMSS
    const filename = `${version}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = path.join(this.migrationsPath, filename);

    const template = sql || `-- Migration: ${version}_${name.replace(/\s+/g, '_').toLowerCase()}
-- Up

-- Add your migration SQL here


-- Down

-- Add your rollback SQL here

`;

    try {
      // Ensure migrations directory exists
      await fs.mkdir(this.migrationsPath, { recursive: true });

      // Write migration file
      await fs.writeFile(filePath, template, 'utf-8');

      console.log(`✅ Created migration: ${filename}`);
      return filename;

    } catch (error) {
      console.error('❌ Failed to create migration:', error);
      throw error;
    }
  }

  /**
   * Validate migration integrity
   */;
  async validateIntegrity(): Promise<{
    valid: boolean;
    issues: string[];,
  }> {
    const issues: string[] = [];

    try {
      const allMigrations = await this.loadMigrations();
      const appliedMigrations = await this.db
        .select()
        .from(migrations)
        .where(eq(migrations.success, true)
        .orderBy(asc(migrations.version);

      // Check for checksum mismatches;
      for (const applied of appliedMigrations) {
        const migration = allMigrations.find(m => m.version === applied.version);
        if (migration) {
          const currentChecksum = this.calculateChecksum(migration);
          if (currentChecksum !== applied.checksum) {
            issues.push(`Migration ${applied.version} checksum mismatch (file may have been modified)`);
          }
        } else {
          issues.push(`Applied migration ${applied.version} file not found`);
        }
      }

      // Check for gaps in version sequence
      const versions = allMigrations.map(m => m.version).sort();
      for (let i = 1; i < versions.length; i++) {
        if (parseInt(versions[i]) <= parseInt(versions[i - 1])) {
          issues.push(`Version sequence issue: ${versions[i]} should be greater than ${versions[i - 1]}`);
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };

    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message: String(error)}`);
      return {
        valid: false,
        issues
      };
    }
  }

  /**
   * Close database connection
   */;
  async close(): Promise<void> {
    await this.sql.end();
  }
}

// Example migration files generator;
export const generateInitialMigrations = async (migrator: DatabaseMigrator) => {
  const migrations = [;
    {
      name: 'create_enhanced_cases_table',
      sql: `-- Migration: create_enhanced_cases_table
-- Up
CREATE TABLE IF NOT EXISTS cases (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  case_number TEXT UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'archived')),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to INTEGER,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  ai_summary TEXT,
  vector_embedding vector(384)
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_priority ON cases(priority);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at);
CREATE INDEX IF NOT EXISTS idx_cases_vector_embedding ON cases USING ivfflat (vector_embedding vector_cosine_ops);

-- Down
DROP TABLE IF EXISTS cases;`
    },
    {
      name: 'create_enhanced_evidence_table',
      sql: `-- Migration: create_enhanced_evidence_table
-- Up
CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('document', 'photo', 'video', 'audio', 'physical', 'digital')),
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  hash_sha256 TEXT,
  chain_of_custody JSONB DEFAULT '[]',
  location_found TEXT,
  date_collected DATE,
  collected_by INTEGER,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  ai_summary TEXT,
  vector_embedding vector(384),
  ocr_text TEXT,
  analysis_status VARCHAR(20) DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')
);

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_evidence_created_by ON evidence(created_by);
CREATE INDEX IF NOT EXISTS idx_evidence_analysis_status ON evidence(analysis_status);
CREATE INDEX IF NOT EXISTS idx_evidence_vector_embedding ON evidence USING ivfflat (vector_embedding vector_cosine_ops);

-- Down
DROP TABLE IF EXISTS evidence;`
    },
    {
      name: 'create_background_jobs_table',
      sql: `-- Migration: create_background_jobs_table
-- Up
CREATE TABLE IF NOT EXISTS background_jobs (
  id SERIAL PRIMARY KEY,
  job_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  result JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_for ON background_jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_entity ON background_jobs(entity_type, entity_id);

-- Down
DROP TABLE IF EXISTS background_jobs;`
    },
    {
      name: 'add_vector_extension',
      sql: `-- Migration: add_vector_extension
-- Up
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector search functions
CREATE OR REPLACE FUNCTION search_similar_cases(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  id integer,
  title text,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    1 - (c.vector_embedding <=> query_embedding) as similarity
  FROM cases c
  WHERE c.vector_embedding IS NOT NULL
    AND 1 - (c.vector_embedding <=> query_embedding) > similarity_threshold
  ORDER BY c.vector_embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_similar_evidence(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  id integer,
  title text,
  case_id integer,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.case_id,
    1 - (e.vector_embedding <=> query_embedding) as similarity
  FROM evidence e
  WHERE e.vector_embedding IS NOT NULL
    AND 1 - (e.vector_embedding <=> query_embedding) > similarity_threshold
  ORDER BY e.vector_embedding <=> query_embedding
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Down
DROP FUNCTION IF EXISTS search_similar_cases;
DROP FUNCTION IF EXISTS search_similar_evidence;`
    }
  ];

  for (const migration of migrations) {
    await migrator.createMigration(migration.name, migration.sql);
  }
};

// CLI interface for migrations
export const runMigrationCLI = async (command: string, args: string[] = []) => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/legal_ai';
  const migrator = new DatabaseMigrator(connectionString);

  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate();
        break;

      case 'rollback':
        await migrator.rollback();
        break;

      case 'status':
        const status = await migrator.getStatus();
        console.log('Migration Status:');
        console.log(`  Applied: ${status.appliedMigrations}`);
        console.log(`  Pending: ${status.pendingMigrations}`);
        console.log(`  Last: ${status.lastMigration || 'None'}`);
        console.log(`  Healthy: ${status.systemHealthy ? '✅' : '❌'}`);
        break;

      case 'create':
        const name = args[0];
        if (!name) {
          console.error('Migration name required');
          process.exit(1);
        }
        await migrator.createMigration(name);
        break;

      case 'validate':
        const validation = await migrator.validateIntegrity();
        console.log(`Validation: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
        if (validation.issues.length > 0) {
          console.log('Issues:');
          validation.issues.forEach(issue => console.log(`  - ${issue}`);
        }
        break;

      case 'init':
        await generateInitialMigrations(migrator);
        await migrator.migrate();
        console.log('✅ Database initialized with base schema');
        break;

      default:
        console.log('Available commands: migrate, rollback, status, create <name>, validate, init');
        break;
    }
  } finally {
    await migrator.close();
  }
};

// If run directly;
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  runMigrationCLI(command, args);
}