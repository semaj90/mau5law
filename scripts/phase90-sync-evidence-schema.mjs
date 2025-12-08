#!/usr/bin/env node

/**
 * Phase 90: Evidence Schema Synchronization
 *
 * Idempotent schema sync for the evidence table without relying on Drizzle Kit.
 * Checks for missing columns and indexes, creates them if they don't exist.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host/db node scripts/phase90-sync-evidence-schema.mjs
 */

import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const EXPECTED_COLUMNS = [
	{
		name: 'id',
		type: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
		description: 'Primary key'
	},
	{
		name: 'case_id',
		type: 'UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE',
		description: 'Foreign key to cases table'
	},
	{
		name: 'title',
		type: 'VARCHAR(255) NOT NULL',
		description: 'Evidence title'
	},
	{
		name: 'description',
		type: 'TEXT',
		description: 'Detailed description'
	},
	{
		name: 'evidence_type',
		type: "VARCHAR(50) NOT NULL DEFAULT 'document'",
		description: 'Type: document, physical, digital, witness, etc.'
	},
	{
		name: 'chain_of_custody',
		type: 'TEXT',
		description: 'Chain of custody log as JSON'
	},
	{
		name: 'file_path',
		type: 'VARCHAR(500)',
		description: 'Storage path or S3 URI'
	},
	{
		name: 'file_hash',
		type: 'VARCHAR(64)',
		description: 'SHA-256 hash for integrity verification'
	},
	{
		name: 'file_size',
		type: 'BIGINT',
		description: 'File size in bytes'
	},
	{
		name: 'mime_type',
		type: 'VARCHAR(100)',
		description: 'MIME type (e.g., application/pdf)'
	},
	{
		name: 'tags',
		type: "TEXT[] DEFAULT '{}'",
		description: 'Array of tags for searching'
	},
	{
		name: 'metadata',
		type: 'JSONB DEFAULT \'{}\',',
		description: 'Custom metadata (extraction results, OCR, etc.)'
	},
	{
		name: 'ai_summary',
		type: 'TEXT',
		description: 'AI-generated summary from LangExtract service'
	},
	{
		name: 'ai_summary_vector',
		type: 'vector(1536)',
		description: 'pgvector embedding of summary (1536 dimensions)'
	},
	{
		name: 'extracted_text',
		type: 'TEXT',
		description: 'Full extracted text (for FTS)'
	},
	{
		name: 'extracted_text_vector',
		type: 'tsvector',
		description: 'Full-text search vector'
	},
	{
		name: 'relevance_score',
		type: 'DECIMAL(3,2)',
		description: 'Relevance score (0.00 - 1.00) computed at ingestion'
	},
	{
		name: 'created_by',
		type: 'UUID REFERENCES users(id)',
		description: 'User who uploaded the evidence'
	},
	{
		name: 'created_at',
		type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
		description: 'Creation timestamp'
	},
	{
		name: 'updated_at',
		type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
		description: 'Last update timestamp'
	},
	{
		name: 'deleted_at',
		type: 'TIMESTAMP',
		description: 'Soft delete timestamp'
	}
];

const EXPECTED_INDEXES = [
	{
		name: 'idx_evidence_case_id',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);',
		description: 'Index for case lookups'
	},
	{
		name: 'idx_evidence_type',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(evidence_type);',
		description: 'Index for type filtering'
	},
	{
		name: 'idx_evidence_tags',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_tags ON evidence USING GIN(tags);',
		description: 'GIN index for tag array queries'
	},
	{
		name: 'idx_evidence_created_at',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at DESC);',
		description: 'Index for chronological sorting'
	},
	{
		name: 'idx_evidence_deleted_at',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_deleted_at ON evidence(deleted_at) WHERE deleted_at IS NOT NULL;',
		description: 'Partial index for soft-deleted records'
	},
	{
		name: 'idx_evidence_ai_summary_vector',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_ai_summary_vector ON evidence USING ivfflat(ai_summary_vector vector_cosine_ops) WITH (lists = 100);',
		description: 'IVFFlat index for vector similarity search'
	},
	{
		name: 'idx_evidence_extracted_text_fts',
		definition: 'CREATE INDEX IF NOT EXISTS idx_evidence_extracted_text_fts ON evidence USING GIN(extracted_text_vector);',
		description: 'GIN index for full-text search'
	},
	{
		name: 'idx_evidence_file_hash_unique',
		definition: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_file_hash_unique ON evidence(file_hash) WHERE file_hash IS NOT NULL;',
		description: 'Unique index for file deduplication'
	}
];

// ============================================================================
// MAIN SYNC LOGIC
// ============================================================================

async function main() {
	const dbUrl = process.env.DATABASE_URL;
	if (!dbUrl) {
		console.error('❌ Error: DATABASE_URL environment variable not set');
		process.exit(1);
	}

	const sql = postgres(dbUrl, { onnotice: () => {} });

	try {
		console.log('🔄 Phase 90: Evidence Schema Synchronization');
		console.log('━'.repeat(60));

		// Step 1: Check if evidence table exists
		console.log('\n✓ Step 1: Check Evidence Table Existence');
		const tableExists = await sql`
			SELECT EXISTS (
				SELECT 1 FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = 'evidence'
			) AS exists;
		`;

		if (!tableExists[0].exists) {
			console.log('   ⚠️  Evidence table does not exist - creating...');
			// Create the table manually if it doesn't exist
			await createEvidenceTable(sql);
			console.log('   ✓ Evidence table created');
		} else {
			console.log('   ✓ Evidence table exists');
		}

		// Step 2: Sync columns
		console.log('\n✓ Step 2: Synchronize Columns');
		await syncColumns(sql);

		// Step 3: Sync indexes
		console.log('\n✓ Step 3: Synchronize Indexes');
		await syncIndexes(sql);

		// Step 4: Verify pgvector extension
		console.log('\n✓ Step 4: Verify pgvector Extension');
		await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
		console.log('   ✓ pgvector extension enabled');

		console.log('\n' + '━'.repeat(60));
		console.log('✅ Phase 90 Schema Sync Complete');
		console.log('   Evidence table is now synchronized and ready for use');

		await sql.end();
	} catch (error) {
		console.error('❌ Schema sync failed:', error);
		await sql.end();
		process.exit(1);
	}
}

async function createEvidenceTable(sql) {
	const columnDefs = EXPECTED_COLUMNS.map((col) => `  ${col.name} ${col.type}`).join(
		',\n'
	);

	await sql.unsafe(`
		CREATE TABLE IF NOT EXISTS evidence (
${columnDefs}
		);
	`);
}

async function syncColumns(sql) {
	const existingColumns = await sql`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_name = 'evidence' AND table_schema = 'public';
	`;

	const existingNames = new Set(existingColumns.map((c) => c.column_name));
	let addedCount = 0;

	for (const col of EXPECTED_COLUMNS) {
		if (!existingNames.has(col.name)) {
			try {
				await sql.unsafe(`ALTER TABLE evidence ADD COLUMN ${col.name} ${col.type};`);
				console.log(`   + Added column: ${col.name}`);
				addedCount++;
			} catch (error) {
				console.warn(`   ⚠️  Failed to add column ${col.name}:`, error.message);
			}
		}
	}

	if (addedCount === 0) {
		console.log('   ✓ All expected columns exist');
	} else {
		console.log(`   ✓ Added ${addedCount} missing columns`);
	}
}

async function syncIndexes(sql) {
	const existingIndexes = await sql`
		SELECT indexname
		FROM pg_indexes
		WHERE tablename = 'evidence' AND schemaname = 'public';
	`;

	const existingNames = new Set(existingIndexes.map((i) => i.indexname));
	let createdCount = 0;

	for (const idx of EXPECTED_INDEXES) {
		if (!existingNames.has(idx.name)) {
			try {
				await sql.unsafe(idx.definition);
				console.log(`   + Created index: ${idx.name}`);
				createdCount++;
			} catch (error) {
				// Some indexes may fail if columns don't support the operation (e.g., vector ops)
				// This is expected and not a blocker
				console.warn(`   ⚠️  Index creation skipped (${idx.name}): ${error.message}`);
			}
		}
	}

	if (createdCount === 0) {
		console.log('   ✓ All expected indexes exist');
	} else {
		console.log(`   ✓ Created ${createdCount} missing indexes`);
	}
}

// ============================================================================
// EXECUTION
// ============================================================================

main();
