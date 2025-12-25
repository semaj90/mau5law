#!/usr/bin/env node

/**
 * Phase 79: Qdrant Vector Indexing
 *
 * Indexes errors into Qdrant for semantic search:
 * - Generates embeddings via Ollama (embeddinggemma:latest)
 * - Stores in Qdrant collection with metadata
 * - Enables RAG/agentic retrieval of similar errors
 *
 * Usage:
 *   node scripts/error-index-qdrant.mjs --run <runId>
 *   node scripts/error-index-qdrant.mjs --run manual-20251225 --recreate
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const LOGS_DIR = join(ROOT, 'logs', 'errors');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'phase79_errors';
const EMBEDDING_MODEL = 'embeddinggemma:latest';
const VECTOR_SIZE = 1024; // embeddinggemma dimension

// Parse CLI args
const args = process.argv.slice(2);
const RUN_ID = args.find(a => a.startsWith('--run='))?.split('=')[1];
const RECREATE = args.includes('--recreate');
const BATCH_SIZE = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '50', 10);

if (!RUN_ID) {
	console.error('❌ Usage: node error-index-qdrant.mjs --run <runId> [--recreate] [--batch 50]');
	process.exit(1);
}

console.log('🔮 Phase 79: Qdrant Vector Indexing\n');
console.log(`   Run ID: ${RUN_ID}`);
console.log(`   Ollama: ${OLLAMA_URL}`);
console.log(`   Qdrant: ${QDRANT_URL}`);
console.log(`   Model: ${EMBEDDING_MODEL}`);
console.log(`   Batch: ${BATCH_SIZE}\n`);

/**
 * Load errors from JSONL
 */
function loadErrors(runId) {
	const runFile = join(LOGS_DIR, `${runId}.jsonl`);
	const lines = readFileSync(runFile, 'utf8').trim().split('\n');
	return lines.map(line => JSON.parse(line));
}

/**
 * Generate embedding via Ollama
 */
async function generateEmbedding(text) {
	const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: EMBEDDING_MODEL,
			prompt: text
		})
	});

	if (!response.ok) {
		throw new Error(`Ollama embedding failed: ${response.statusText}`);
	}

	const data = await response.json();
	return data.embedding;
}

/**
 * Create Qdrant collection
 */
async function createCollection(recreate = false) {
	// Check if collection exists
	const existsRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);

	if (existsRes.ok && !recreate) {
		console.log(`✅ Collection "${COLLECTION_NAME}" already exists\n`);
		return;
	}

	// Delete if recreating
	if (existsRes.ok && recreate) {
		console.log(`🗑️  Deleting existing collection...`);
		await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, { method: 'DELETE' });
	}

	// Create new collection
	console.log(`📦 Creating collection "${COLLECTION_NAME}"...`);
	const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			vectors: {
				size: VECTOR_SIZE,
				distance: 'Cosine'
			}
		})
	});

	if (!createRes.ok) {
		throw new Error(`Failed to create collection: ${createRes.statusText}`);
	}

	console.log(`✅ Collection created\n`);
}

/**
 * Index errors in batches
 */
async function indexErrors(errors, batchSize) {
	console.log(`📊 Indexing ${errors.length} errors in batches of ${batchSize}...\n`);

	let indexed = 0;
	const batches = [];

	// Split into batches
	for (let i = 0; i < errors.length; i += batchSize) {
		batches.push(errors.slice(i, i + batchSize));
	}

	for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
		const batch = batches[batchIdx];

		console.log(`   Batch ${batchIdx + 1}/${batches.length} (${batch.length} errors)...`);

		// Generate embeddings
		const points = [];
		for (const error of batch) {
			// Create rich text representation for embedding
			const text = [
				`File: ${error.file}`,
				`Error Code: ${error.code}`,
				`Message: ${error.message}`,
				`Pattern: ${error.patternId}`,
				`Domains: ${error.domains.join(', ')}`,
				error.snippet ? `Snippet: ${error.snippet}` : ''
			].filter(Boolean).join('\n');

			try {
				const embedding = await generateEmbedding(text);

				points.push({
					id: error.fingerprint,
					vector: embedding,
					payload: {
						runId: error.runId,
						commit: error.commit,
						timestamp: error.timestamp,
						file: error.file,
						line: error.line,
						column: error.column,
						code: error.code,
						message: error.message,
						patternId: error.patternId,
						priority: error.priority,
						severityWeight: error.severityWeight,
						domains: error.domains,
						snippet: error.snippet
					}
				});
			} catch (err) {
				console.warn(`   ⚠️  Failed to embed error ${error.fingerprint}: ${err.message}`);
			}
		}

		// Upsert batch to Qdrant
		if (points.length > 0) {
			const upsertRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points?wait=true`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ points })
			});

			if (!upsertRes.ok) {
				console.error(`   ❌ Batch ${batchIdx + 1} failed: ${upsertRes.statusText}`);
				continue;
			}

			indexed += points.length;
			console.log(`   ✅ Indexed ${points.length} errors (${indexed}/${errors.length} total)`);
		}
	}

	console.log(`\n✅ Indexing complete! ${indexed} errors indexed.\n`);
}

/**
 * Verify indexing
 */
async function verifyIndexing() {
	const infoRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);

	if (!infoRes.ok) {
		throw new Error(`Failed to get collection info: ${infoRes.statusText}`);
	}

	const data = await infoRes.json();
	console.log(`📊 Collection Stats:`);
	console.log(`   Points: ${data.result.points_count}`);
	console.log(`   Vectors: ${data.result.vectors_count}`);
	console.log(`   Status: ${data.result.status}\n`);
}

/**
 * Main execution
 */
async function main() {
	// Load errors
	const errors = loadErrors(RUN_ID);
	console.log(`✅ Loaded ${errors.length} errors\n`);

	// Create collection
	await createCollection(RECREATE);

	// Index errors
	await indexErrors(errors, BATCH_SIZE);

	// Verify
	await verifyIndexing();

	console.log(`✅ Qdrant indexing complete!\n`);
	console.log(`💡 Next steps:`);
	console.log(`   1. node scripts/error-search.mjs --query "database type errors"`);
	console.log(`   2. node scripts/error-search.mjs --query "import issues" --top 10`);
	console.log(`   3. node scripts/phase79-agentic-fixer.mjs --use-rag`);
}

main().catch(error => {
	console.error('❌ Indexing failed:', error.message);
	process.exit(1);
});
