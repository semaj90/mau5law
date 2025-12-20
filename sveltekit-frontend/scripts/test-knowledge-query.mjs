#!/usr/bin/env node
/**
 * Test Knowledge Base Query
 * Demonstrates querying the phase76_knowledge_base with semantic search
 */

import chalk from 'chalk';

const CONFIG = {
	ollama: {
		url: 'http://localhost:11434',
		embeddingModel: 'embeddinggemma:latest'
	},
	qdrant: {
		url: 'http://localhost:6333',
		collection: 'phase76_knowledge_base',
		topK: 5,
		scoreThreshold: 0.5
	}
};

/**
 * Generate embedding using Ollama
 */
async function generateEmbedding(text) {
	const response = await fetch(`${CONFIG.ollama.url}/api/embeddings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: CONFIG.ollama.embeddingModel,
			prompt: text
		})
	});

	if (!response.ok) {
		throw new Error(`Embedding error: ${response.statusText}`);
	}

	const data = await response.json();
	return data.embedding;
}

/**
 * Query Qdrant knowledge base
 */
async function queryKnowledgeBase(query) {
	console.log(chalk.cyan(`\n🔍 Querying: "${query}"\n`));

	try {
		// Generate embedding
		console.log(chalk.gray('   Generating embedding...'));
		const embedding = await generateEmbedding(query);

		// Search Qdrant
		console.log(chalk.gray('   Searching Qdrant...'));
		const searchUrl = `${CONFIG.qdrant.url}/collections/${CONFIG.qdrant.collection}/points/search`;
		const response = await fetch(searchUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				vector: embedding,
				limit: CONFIG.qdrant.topK,
				score_threshold: CONFIG.qdrant.scoreThreshold,
				with_payload: true
			})
		});

		if (!response.ok) {
			throw new Error(`Qdrant search failed: ${response.statusText}`);
		}

		const data = await response.json();
		const results = data.result || [];

		console.log(chalk.green(`   ✅ Found ${results.length} relevant documents\n`));

		// Display results
		results.forEach((result, idx) => {
			console.log(chalk.bold(`${idx + 1}. ${result.payload.title}`));
			console.log(chalk.gray(`   📄 ${result.payload.url}`));
			console.log(chalk.yellow(`   🎯 Relevance: ${(result.score * 100).toFixed(1)}%`));
			console.log(chalk.white(`   📝 ${result.payload.summary?.substring(0, 150)}...`));
			console.log();
		});

		return results;

	} catch (error) {
		console.error(chalk.red(`   ❌ Query failed: ${error.message}`));
		return [];
	}
}

/**
 * Main
 */
async function main() {
	const queries = process.argv.slice(2);

	if (queries.length === 0) {
		console.log(chalk.yellow('Usage: node test-knowledge-query.mjs "your query"'));
		console.log(chalk.gray('\nExample queries:'));
		console.log(chalk.white('  node test-knowledge-query.mjs "TypeScript 5.6 breaking changes"'));
		console.log(chalk.white('  node test-knowledge-query.mjs "SvelteKit 2.0 migration"'));
		console.log(chalk.white('  node test-knowledge-query.mjs "Svelte 5 runes"'));
		process.exit(0);
	}

	console.log(chalk.bold.cyan('\n🧠 Phase 76: Knowledge Base Query Test\n'));

	for (const query of queries) {
		await queryKnowledgeBase(query);
	}

	console.log(chalk.green('✅ Query test complete!\n'));
}

main().catch(error => {
	console.error(chalk.red('Fatal error:'), error);
	process.exit(1);
});
