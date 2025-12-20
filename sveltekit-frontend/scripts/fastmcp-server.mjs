#!/usr/bin/env node
/**
 * Phase 76: FastMCP Agentic Tool Server
 * Provides tool calling capabilities for ACE agent
 *
 * Tools:
 * - qdrant_search: Search knowledge base
 * - postgres_query: Query PostgreSQL 17
 * - minio_fetch: Fetch text summaries from MinIO
 * - redis_cache: Cache management
 */

import { createServer } from 'http';

const CONFIG = {
	port: 3002,
	ollama: {
		url: 'http://localhost:11434',
		embeddingModel: 'embeddinggemma:latest'
	},
	qdrant: {
		url: 'http://localhost:6333',
		collection: 'phase76_knowledge_base'
	},
	postgres: {
		connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/deeds'
	},
	minio: {
		endpoint: process.env.MINIO_ENDPOINT || 'localhost',
		port: parseInt(process.env.MINIO_PORT || '9000'),
		bucket: 'text-summaries'
	},
	redis: {
		url: process.env.REDIS_URL || 'redis://localhost:6379'
	}
};

/**
 * Tool: Search Qdrant knowledge base
 */
async function qdrantSearch(args) {
	const { query, limit = 5, threshold = 0.5 } = args;

	// Generate embedding
	const embeddingResponse = await fetch(`${CONFIG.ollama.url}/api/embeddings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: CONFIG.ollama.embeddingModel,
			prompt: query
		})
	});

	const embeddingData = await embeddingResponse.json();
	const embedding = embeddingData.embedding;

	// Search Qdrant
	const searchResponse = await fetch(
		`${CONFIG.qdrant.url}/collections/${CONFIG.qdrant.collection}/points/search`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				vector: embedding,
				limit,
				score_threshold: threshold,
				with_payload: true
			})
		}
	);

	const searchData = await searchResponse.json();

	return {
		results: searchData.result.map((item) => ({
			score: item.score,
			title: item.payload.title,
			url: item.payload.url,
			summary: item.payload.summary
		}))
	};
}

/**
 * Tool: Query PostgreSQL
 */
async function postgresQuery(args) {
	const { query } = args;

	// Import pg dynamically
	const { Pool } = await import('pg');
	const pool = new Pool({ connectionString: CONFIG.postgres.connectionString });

	try {
		const result = await pool.query(query);
		return {
			rows: result.rows,
			rowCount: result.rowCount
		};
	} finally {
		await pool.end();
	}
}

/**
 * Tool: Fetch from MinIO
 */
async function minioFetch(args) {
	const { key } = args;

	// Import minio dynamically
	const Minio = await import('minio');
	const minioClient = new Minio.Client({
		endPoint: CONFIG.minio.endpoint,
		port: CONFIG.minio.port,
		useSSL: false,
		accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
		secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
	});

	return new Promise((resolve, reject) => {
		const chunks = [];

		minioClient.getObject(CONFIG.minio.bucket, key, (err, dataStream) => {
			if (err) return reject(err);

			dataStream.on('data', (chunk) => chunks.push(chunk));
			dataStream.on('end', () => {
				const content = Buffer.concat(chunks).toString('utf-8');
				resolve({ content, key });
			});
			dataStream.on('error', reject);
		});
	});
}

/**
 * Tool: Redis cache operations
 */
async function redisCache(args) {
	const { operation, key, value, ttl = 3600 } = args;

	// Import redis dynamically
	const redis = await import('redis');
	const client = redis.createClient({ url: CONFIG.redis.url });
	await client.connect();

	try {
		switch (operation) {
			case 'get':
				return { value: await client.get(key) };
			case 'set':
				await client.setEx(key, ttl, value || '');
				return { success: true };
			case 'delete':
				await client.del(key);
				return { success: true };
			default:
				throw new Error(`Unknown operation: ${operation}`);
		}
	} finally {
		await client.quit();
	}
}

/**
 * MCP Function Call Handler
 */
async function handleFunctionCall(functionName, args) {
	console.log(`🔧 MCP Tool Call: ${functionName}`, args);

	switch (functionName) {
		case 'qdrant_search':
			return await qdrantSearch(args);
		case 'postgres_query':
			return await postgresQuery(args);
		case 'minio_fetch':
			return await minioFetch(args);
		case 'redis_cache':
			return await redisCache(args);
		default:
			throw new Error(`Unknown function: ${functionName}`);
	}
}

/**
 * HTTP Server for MCP
 */
const server = createServer(async (req, res) => {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	if (req.method !== 'POST' || req.url !== '/function-call') {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Not found' }));
		return;
	}

	// Parse request body
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', async () => {
		try {
			const { function: functionName, arguments: args } = JSON.parse(body);

			const result = await handleFunctionCall(functionName, args);

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ result }));
		} catch (error) {
			console.error('❌ MCP Error:', error);
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			);
		}
	});
});

// Start server
server.listen(CONFIG.port, () => {
	console.log(`\n🚀 FastMCP Server Running`);
	console.log(`   Port: ${CONFIG.port}`);
	console.log(`   URL: http://localhost:${CONFIG.port}/function-call`);
	console.log(`\n📦 Available Tools:`);
	console.log(`   - qdrant_search: Search knowledge base`);
	console.log(`   - postgres_query: Query PostgreSQL`);
	console.log(`   - minio_fetch: Fetch from MinIO`);
	console.log(`   - redis_cache: Cache operations`);
	console.log(`\n✨ Ready for agentic tool calling!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\n👋 Shutting down MCP server...');
	server.close();
	process.exit(0);
});
