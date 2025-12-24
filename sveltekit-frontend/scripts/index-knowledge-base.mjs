#!/usr/bin/env node
/**
 * Index local markdown files from data/knowledge/ into Qdrant
 * Validates embedding dimensions, response statuses, and saves checkpoints
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const COLLECTION = 'knowledge_base';
const KNOWLEDGE_DIR = path.join(rootDir, 'data', 'knowledge');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const CHECKPOINT_PATH = path.join(rootDir, 'data', 'phase76', `kb-checkpoint-${RUN_ID}.json`);

const EXPECTED_DIMENSION = 768; // embeddinggemma:latest
const BATCH_SIZE = 10;

// Statistics
const stats = {
	runId: RUN_ID,
	timestamp: new Date().toISOString(),
	collection: COLLECTION,
	parsed: 0,
	embeddingsOK: 0,
	embeddingsFailed: 0,
	upsertsOK: 0,
	upsertsFailed: 0,
	filesProcessed: 0,
	checkpointPath: CHECKPOINT_PATH
};

async function generateEmbedding(text) {
	const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: 'embeddinggemma:latest',
			prompt: text
		})
	});

	if (!response.ok) {
		throw new Error(`Embedding API error: ${response.status} ${await response.text()}`);
	}

	const data = await response.json();
	const embedding = data.embedding;

	// VALIDATE DIMENSION
	if (!embedding || embedding.length !== EXPECTED_DIMENSION) {
		throw new Error(`Invalid embedding dimension: expected ${EXPECTED_DIMENSION}, got ${embedding?.length || 0}`);
	}

	return embedding;
}

async function ensureCollection() {
	try {
		const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`);
		if (response.ok) {
			const data = await response.json();
			const dim = data.result.config.params.vectors.size;
			console.log(`✅ Collection '${COLLECTION}' exists (${data.result.points_count} points, ${dim} dims)`);

			// VALIDATE DIMENSION
			if (dim !== EXPECTED_DIMENSION) {
				throw new Error(`Collection dimension mismatch: expected ${EXPECTED_DIMENSION}, got ${dim}. Delete and recreate collection.`);
			}
			return;
		}
	} catch (e) {
		if (!e.message.includes('dimension mismatch')) {
			// Collection doesn't exist, create it
			console.log(`📦 Creating collection '${COLLECTION}' (${EXPECTED_DIMENSION} dimensions, Cosine)...`);
			const createRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					vectors: {
						size: EXPECTED_DIMENSION,
						distance: 'Cosine'
					}
				})
			});

			if (!createRes.ok) {
				throw new Error(`Failed to create collection: ${await createRes.text()}`);
			}
			console.log('✅ Collection created');
			return;
		}
		throw e;
	}
}

async function parseMarkdown(content, filePath) {
	const sections = [];
	const lines = content.split('\n');
	let currentSection = { heading: 'Introduction', text: '', level: 0 };

	for (const line of lines) {
		if (line.startsWith('#')) {
			// Save previous section
			if (currentSection.text.trim()) {
				sections.push({ ...currentSection });
			}

			// Start new section
			const level = line.match(/^#+/)[0].length;
			const heading = line.replace(/^#+\s*/, '').trim();
			currentSection = { heading, text: '', level };
		} else {
			currentSection.text += line + '\n';
		}
	}

	// Save last section
	if (currentSection.text.trim()) {
		sections.push(currentSection);
	}

	return sections;
}

async function indexMarkdownFile(filePath) {
	const content = await fs.readFile(filePath, 'utf-8');
	const fileName = path.basename(filePath, '.md');
	const doc_id = crypto.randomUUID(); // One UUID per document

	console.log(`\n📄 Indexing: ${fileName} (doc_id: ${doc_id})`);

	// Extract tags from content
	const tagMatch = content.match(/#{1,3}\s*Tags?\s*\n([^\n]+)/i);
	const tags = tagMatch ? tagMatch[1].split(/\s+/).filter(t => t.startsWith('#')) : [];

	// Parse into sections
	const sections = await parseMarkdown(content, filePath);
	stats.parsed += sections.length;
	console.log(`   Found ${sections.length} sections`);

	// Batch processing
	const points = [];
	let fileEmbeddingsOK = 0;
	let fileEmbeddingsFailed = 0;

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i];

		// Skip very short sections
		if (section.text.trim().length < 100) continue;

		process.stdout.write(`   [${i + 1}/${sections.length}] ${section.heading.substring(0, 40)}...`);

		try {
			const embedding = await generateEmbedding(section.text);
			fileEmbeddingsOK++;
			stats.embeddingsOK++;

			points.push({
				id: crypto.randomUUID(), // UUID per section
				vector: embedding,
				payload: {
					doc_id: doc_id,
					file: fileName,
					section: section.heading,
					content: section.text.trim().substring(0, 2000),
					level: section.level,
					tags: tags,
					source: 'local',
					filePath: path.relative(rootDir, filePath)
				}
			});

			console.log(' ✅');
		} catch (err) {
			fileEmbeddingsFailed++;
			stats.embeddingsFailed++;
			console.log(` ❌ ${err.message}`);
		}

		// Batch upsert
		if (points.length >= BATCH_SIZE) {
			await upsertBatch(points);
			points.length = 0;
		}
	}

	// Upsert remaining points
	if (points.length > 0) {
		await upsertBatch(points);
	}

	stats.filesProcessed++;
	console.log(`   ✅ ${fileName}: ${fileEmbeddingsOK} OK, ${fileEmbeddingsFailed} failed`);

	// Save checkpoint after each file
	await saveCheckpoint();

	return fileEmbeddingsOK;
}

async function upsertBatch(points) {
	if (points.length === 0) return;

	const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points?wait=true`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ points })
	});

	// VALIDATE RESPONSE
	if (!response.ok) {
		const errorText = await response.text();
		stats.upsertsFailed += points.length;
		throw new Error(`Upsert failed (${response.status}): ${errorText}`);
	}

	const result = await response.json();
	if (result.status !== 'ok') {
		stats.upsertsFailed += points.length;
		throw new Error(`Upsert status not OK: ${JSON.stringify(result)}`);
	}

	stats.upsertsOK += points.length;
}

async function saveCheckpoint() {
	try {
		await fs.mkdir(path.dirname(CHECKPOINT_PATH), { recursive: true });
		await fs.writeFile(CHECKPOINT_PATH, JSON.stringify(stats, null, 2));
	} catch (err) {
		console.error(`⚠️ Failed to save checkpoint: ${err.message}`);
	}
}

async function main() {
	console.log('🧠 Phase 76.1: Local Knowledge Base Indexer\n');
	console.log(`Run ID:      ${RUN_ID}`);
	console.log(`Collection:  ${COLLECTION}`);
	console.log(`Directory:   ${KNOWLEDGE_DIR}`);
	console.log(`Checkpoint:  ${CHECKPOINT_PATH}`);
	console.log(`Batch Size:  ${BATCH_SIZE}`);
	console.log(`Expected Dimension: ${EXPECTED_DIMENSION}\n`);

	try {
		// Ensure collection exists with correct dimensions
		await ensureCollection();

		// Get all markdown files
		const files = await fs.readdir(KNOWLEDGE_DIR);
		const mdFiles = files
			.filter(f => f.endsWith('.md'))
			.map(f => path.join(KNOWLEDGE_DIR, f));

		console.log(`📚 Found ${mdFiles.length} markdown files\n`);

		// Index each file
		let totalIndexed = 0;
		for (const filePath of mdFiles) {
			try {
				const count = await indexMarkdownFile(filePath);
				totalIndexed += count;
			} catch (err) {
				console.error(`❌ Failed to index ${path.basename(filePath)}: ${err.message}`);
			}
		}

		// Final checkpoint
		await saveCheckpoint();

		// Print summary
		console.log('\n' + '='.repeat(60));
		console.log('📊 INDEXING COMPLETE');
		console.log('='.repeat(60));
		console.log(`Files Processed:    ${stats.filesProcessed}/${mdFiles.length}`);
		console.log(`Sections Parsed:    ${stats.parsed}`);
		console.log(`Embeddings OK:      ${stats.embeddingsOK}`);
		console.log(`Embeddings Failed:  ${stats.embeddingsFailed}`);
		console.log(`Upserts OK:         ${stats.upsertsOK}`);
		console.log(`Upserts Failed:     ${stats.upsertsFailed}`);
		console.log(`Checkpoint Path:    ${CHECKPOINT_PATH}`);
		console.log('='.repeat(60));

		// Verify collection count
		const verifyRes = await fetch(`${QDRANT_URL}/collections/${COLLECTION}`);
		if (verifyRes.ok) {
			const data = await verifyRes.json();
			console.log(`\n✅ Collection '${COLLECTION}' now has ${data.result.points_count} points`);
		}

	} catch (error) {
		console.error('\n❌ Fatal error:', error.message);
		process.exit(1);
	}
}

main();
