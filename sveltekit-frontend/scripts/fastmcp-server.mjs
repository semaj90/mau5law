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
 * - read_file, write_file: Filesystem operations
 * - search_codebase, web_search: Search tools
 * - run_command: Shell execution
 */

import { spawn } from 'child_process';
import 'dotenv/config'; // Always load .env first
import { createServer } from 'http';

// Load .env file if available
try {
	const dotenv = await import('dotenv');
	const fs = await import('fs');
	const path = await import('path');

	// Check current and parent directory for .env.phase87
	const envPaths = [
		'.env.phase87',
		'../.env.phase87',
		'.env'
	];

	let loaded = false;
	for (const envPath of envPaths) {
		if (fs.existsSync(envPath)) {
			dotenv.config({ path: envPath });
			console.log(`✅ Loaded ${envPath}`);
			loaded = true;
			break;
		}
	}

	if (!loaded) {
		console.warn('⚠️ No .env file found');
	}
} catch (e) {
	// dotenv not installed, use env vars directly
	console.warn('⚠️ dotenv load failed:', e.message);
}

// Build Postgres connection string from individual env vars (preferred) or DATABASE_URL
const PG_HOST = process.env.PGHOST ?? '127.0.0.1';
const PG_PORT = process.env.PGPORT ?? '5434';
const PG_USER = process.env.PGUSER ?? 'user';
const PG_PASS = process.env.PGPASSWORD ?? 'pass';
const PG_DB = process.env.PGDATABASE ?? 'legal';
const PG_URL = process.env.DATABASE_URL ?? `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}`;

console.log(`🔌 DB Config: ${PG_URL.replace(/:[^:@]+@/, ':***@')}`); // Log masked URL

const CONFIG = {
	port: 3002,
	ollama: {
		url: process.env.OLLAMA_URL || 'http://localhost:11434',
		embeddingModel: process.env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest'
	},
	qdrant: {
		url: process.env.QDRANT_URL || 'http://localhost:6333',
		collection: process.env.QDRANT_COLLECTION || 'phase76_knowledge_base'
	},
	postgres: {
		// Explicit connection params (works reliably on Windows)
		host: PG_HOST,
		port: parseInt(PG_PORT),
		user: PG_USER,
		password: PG_PASS,
		database: PG_DB,
		connectionString: PG_URL
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
 * Tool: Knowledge Retrieve (Front Door)
 * Hybrid retrieval from Knowledge Plane: docs + repo snippets + similar errors
 *
 * Enhanced with provenance tracking for all results.
 */
async function knowledgeRetrieve(args) {
	const { query, k = 12, mode = 'hybrid', tags = [] } = args;

	const knowledgePlaneUrl = process.env.KNOWLEDGE_PLANE_URL || 'http://127.0.0.1:8099';
	const startTime = Date.now();

	try {
		// First try Knowledge Plane /svelte/docs/search for Svelte-specific queries
		if (query.match(/svelte|sveltekit|bits.?ui|\$state|\$derived|\$effect|\$props/i)) {
			const svelteBody = JSON.stringify({
				query,
				sources: ['svelte', 'sveltekit', 'codebase', 'bits-ui'],
				max_results: k,
				context: 3
			});

			const svelteRes = await fetch(`${knowledgePlaneUrl}/svelte/docs/search`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: svelteBody
			});

			if (svelteRes.ok) {
				const svelteData = await svelteRes.json();
				if (svelteData.results && svelteData.results.length > 0) {
					const duration = Date.now() - startTime;

					return {
						source: 'svelte_docs',
						results: svelteData.results.map((r, idx) => ({
							text: r.snippet || r.context,
							source: r.source,
							category: r.category,
							line: r.line,
							score: 0.95, // Docs get high priority
							tags: [r.category, 'docs', 'svelte5'],
							// Enhanced provenance
							provenance: {
								collection: 'svelte_docs_ripgrep',
								source_file: r.source,
								source_line: r.line,
								chunk_id: `svelte_docs_${idx}`,
								retrieval_method: 'ripgrep_fast_search',
								timestamp: new Date().toISOString()
							}
						})),
						count: svelteData.results.length,
						meta: {
							...svelteData.meta,
							total_duration_ms: duration,
							retrieval_path: 'knowledge_plane_svelte_docs',
							query_type: 'svelte_specific'
						}
					};
				}
			}
		}

		// Fallback: Knowledge Plane /retrieve (hybrid RAG)
		const retrieveBody = JSON.stringify({
			query,
			top_k: k,
			mode,
			filters: tags.length > 0 ? tags : undefined
		});

		const retrieveRes = await fetch(`${knowledgePlaneUrl}/retrieve`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: retrieveBody
		});

		if (!retrieveRes.ok) {
			throw new Error(`Knowledge Plane /retrieve failed: ${retrieveRes.status}`);
		}

		const data = await retrieveRes.json();
		const duration = Date.now() - startTime;

		// Normalize and add provenance to hybrid results
		const contexts = (data.contexts || data.hits || []).map((ctx, idx) => ({
			...ctx,
			provenance: {
				collection: data.collection || 'phase76_knowledge_base',
				chunk_id: ctx.id || ctx.point_id || `chunk_${idx}`,
				source_url: ctx.url || ctx.payload?.url,
				source_tags: ctx.tags || ctx.payload?.tags || [],
				retrieval_method: mode,
				score: ctx.score || ctx.distance,
				timestamp: new Date().toISOString()
			}
		}));

		return {
			source: 'knowledge_plane_hybrid',
			contexts,
			count: contexts.length,
			meta: {
				latency_ms: data.latency_ms || data.meta?.duration_ms || duration,
				total_duration_ms: duration,
				retrieval_path: 'knowledge_plane_hybrid',
				mode,
				query,
				tags
			}
		};
	} catch (error) {
		// Graceful fallback to Qdrant direct search
		console.warn('⚠️  Knowledge Plane unavailable, falling back to Qdrant:', error.message);

		const fallbackResult = await qdrantSearch({ query, limit: k, threshold: 0.5 });
		const duration = Date.now() - startTime;

		// Add provenance to fallback results
		return {
			...fallbackResult,
			source: 'qdrant_fallback',
			results: (fallbackResult.results || []).map((r, idx) => ({
				...r,
				provenance: {
					collection: CONFIG.qdrant.collection,
					chunk_id: r.id || `fallback_${idx}`,
					retrieval_method: 'qdrant_direct_search',
					score: r.score,
					timestamp: new Date().toISOString(),
					fallback_reason: error.message
				}
			})),
			meta: {
				total_duration_ms: duration,
				retrieval_path: 'qdrant_fallback',
				fallback: true,
				original_error: error.message
			}
		};
	}
}

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

	// Always prefer DATABASE_URL from env, falling back to config object
	const connectionString = process.env.DATABASE_URL || CONFIG.postgres.connectionString;

	const pool = new Pool({
		connectionString
	});

	// Log connection target for debugging
	console.log(`🔌 Executing query on: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

	try {
		// On first connection, verify identity
		const client = await pool.connect();
		try {
			const identity = await client.query('SELECT inet_server_addr(), current_user, current_database()');
			const { inet_server_addr, current_user, current_database } = identity.rows[0];
			console.log(`   ✅ Connected: ${current_database} as ${current_user} on ${inet_server_addr}`);
		} finally {
			client.release();
		}

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
 * Tool: Read file contents
 */
async function readFile(args) {
	const { filepath, startLine, endLine } = args;
	const fs = await import('fs/promises');

	try {
		const content = await fs.readFile(filepath, 'utf-8');

		// If no line range specified, return full file
		if (!startLine && !endLine) {
			return {
				content: [{ type: "text", text: content }],
				totalLines: content.split('\n').length
			};
		}

		// Extract line range (1-indexed input)
		const lines = content.split('\n');
		const start = Math.max(0, (startLine || 1) - 1); // Convert to 0-indexed
		const end = Math.min(lines.length, endLine || lines.length);

		const snippet = lines.slice(start, end).join('\n');

		return {
			content: [{ type: "text", text: snippet }],
			startLine: start + 1,
			endLine: end,
			totalLines: lines.length
		};
	} catch (error) {
		throw new Error(`Failed to read file: ${error.message}`);
	}
}

/**
 * Tool: Search codebase with ripgrep
 */
async function searchCodebase(args) {
	const { query, path = '.' } = args;
	const { spawn } = await import('child_process');

	return new Promise((resolve, reject) => {
		const rg = spawn('rg', ['--json', '-i', query, path], { shell: true });
		let output = '';

		rg.stdout.on('data', (data) => {
			output += data.toString();
		});

		rg.on('close', (code) => {
			if (code === 0 || code === 1) { // 1 means no matches found
				resolve({ matches: output || 'No matches found' });
			} else {
				reject(new Error(`ripgrep exited with code ${code}`));
			}
		});
	});
}

/**
 * Tool: Web search (stub - needs Firecrawl or SearxNG)
 */
async function webSearch(args) {
	const { query } = args;

	// Return MCP-compatible response that won't crash the loop
	return {
		disabled: true,
		provider: 'off',
		query,
		message: 'Web search not enabled. Please configure Firecrawl API key or SearxNG',
		suggestion: `Manual search: https://www.google.com/search?q=${encodeURIComponent(query)}`
	};
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
 * Tool: Write file
 */
async function writeFile(args) {
	const { filepath, content } = args;
	const fs = await import('fs/promises');
	try {
		await fs.writeFile(filepath, content, 'utf-8');
		return { content: [{ type: "text", text: `Successfully wrote to ${filepath}` }] };
	} catch (error) {
		throw new Error(`Failed to write file: ${error.message}`);
	}
}

/**
 * Tool: Ripgrep search (symbol/pattern search across codebase)
 * Supports: { pattern, globs?, cwd?, maxResults? }
 */
async function ripgrep(args) {
	const { pattern, globs = '**/*', cwd = process.cwd(), maxResults = 50 } = args;

	return new Promise((resolve, reject) => {
		const rgArgs = [
			'--json',
			'--max-count', String(maxResults),
			'--no-heading',
			'--line-number',
			pattern
		];

		if (globs && globs !== '**/*') {
			rgArgs.push('--glob', globs);
		}

		const rg = spawn('rg', rgArgs, { cwd, shell: true });
		const matches = [];
		let stderr = '';

		rg.stdout.on('data', (chunk) => {
			const lines = chunk.toString().split('\n').filter(Boolean);
			for (const line of lines) {
				try {
					const parsed = JSON.parse(line);
					if (parsed.type === 'match') {
						matches.push({
							file: parsed.data.path.text,
							line: parsed.data.line_number,
							text: parsed.data.lines.text.trim()
						});
					}
				} catch {}
			}
		});

		rg.stderr.on('data', (chunk) => { stderr += chunk; });
		rg.on('close', (code) => {
			// code 1 = no matches (not an error)
			if (code === 0 || code === 1) {
				resolve({ matches, count: matches.length, pattern });
			} else {
				reject(new Error(`ripgrep failed: ${stderr}`));
			}
		});
	});
}

/**
 * Tool: Run shell command
 */
async function runCommand(args) {
	const { command, cwd } = args;

	return new Promise((resolve, reject) => {
		const cp = spawn(command, { shell: true, cwd: cwd || process.cwd() });
		let output = '';
		let error = '';

		cp.stdout.on('data', (data) => { output += data.toString(); });
		cp.stderr.on('data', (data) => { error += data.toString(); });

		cp.on('close', (code) => {
			resolve({ content: [{ type: "text", text: output + (error ? `\nStderr: ${error}` : '') }] });
		});
	});
}

/**
 * Tool: Knowledge Retrieve (FRONT DOOR - use this first)
 * Hybrid retrieval: Qdrant semantic + Postgres pgvector + reciprocal rank fusion
 * Returns: contexts with provenance (source, tags, chunk_id, score)
 */
async function knowledgeRetrieve(args) {
	const { query, limit = 10, threshold = 0.5, filter_tags = null } = args;

	const KNOWLEDGE_PLANE_URL = process.env.KNOWLEDGE_PLANE_URL || 'http://localhost:8099';

	try {
		// Call Knowledge Plane /rag/retrieve/hybrid
		const response = await fetch(`${KNOWLEDGE_PLANE_URL}/rag/retrieve/hybrid`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query,
				top_k: limit,
				score_threshold: threshold,
				filter_tags: filter_tags ? filter_tags.split(',') : null
			})
		});

		if (!response.ok) {
			// Fallback to simple Qdrant search
			console.warn('⚠️  Knowledge Plane unavailable, falling back to qdrant_search');
			return await qdrantSearch({ query, limit, threshold });
		}

		const data = await response.json();

		// Return MCP-compatible format with provenance
		return {
			contexts: data.results.map(item => ({
				text: item.text || item.content || item.summary,
				score: item.score,
				provenance: {
					source: item.source || item.url || 'unknown',
					tags: item.tags || [],
					chunk_id: item.id || item.chunk_id,
					collection: item.collection || CONFIG.qdrant.collection
				}
			})),
			query,
			retrieval_method: 'hybrid',
			total_results: data.results.length
		};
	} catch (error) {
		console.error('❌ knowledge_retrieve error:', error.message);

		// Fallback to Qdrant-only search
		const fallback = await qdrantSearch({ query, limit, threshold });
		return {
			...fallback,
			retrieval_method: 'fallback_qdrant',
			warning: 'Knowledge Plane unavailable, using Qdrant-only search'
		};
	}
}

/**
 * Available tools registry
 */
const tools = {
	knowledge_retrieve: knowledgeRetrieve, // 🆕 FRONT DOOR - Hybrid KB retrieval
	qdrant_search: qdrantSearch,
	postgres_query: postgresQuery,
	minio_fetch: minioFetch,
	redis_cache: redisCache,
	read_file: readFile,
	search_codebase: searchCodebase,
	ripgrep: ripgrep,
	web_search: webSearch,
	write_file: writeFile,
	run_command: runCommand
};

// Removed deprecated handleFunctionCall - tools are called directly from registry

/**
 * HTTP Server for MCP
 */
const server = createServer(async (req, res) => {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

	if (req.method === 'OPTIONS') {
		res.writeHead(200);
		res.end();
		return;
	}

	// Health check endpoint
	if (req.method === 'GET' && req.url === '/health') {
		try {
			const { Pool } = await import('pg');
			const healthPool = new Pool({ connectionString: CONFIG.postgres.connectionString });
			const healthResult = await healthPool.query('SELECT inet_server_addr() as ip, current_user, current_database()');
			const db = healthResult.rows[0];
			await healthPool.end();

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				ok: true,
				status: 'healthy',
				tools: Object.keys(tools).length,
				database: {
					connectionString: CONFIG.postgres.connectionString,
					server_ip: db.ip,
					current_user: db.current_user,
					current_database: db.current_database
				}
			}));
		} catch (healthError) {
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				ok: false,
				status: 'degraded',
				tools: Object.keys(tools).length,
				error: healthError.message,
				database: { connectionString: CONFIG.postgres.connectionString }
			}));
		}
		return;
	}

	// Tools list endpoint (for agent self-correction)
	if (req.method === 'GET' && req.url === '/tools') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
			ok: true,
			tools: Object.keys(tools).map(name => ({
				name,
				description: `Tool: ${name}`
			})),
			count: Object.keys(tools).length
		}));
		return;
	}

	if (req.method !== 'POST' || req.url !== '/function-call') {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ ok: false, error: 'Not found. Try GET /health or POST /function-call' }));
		return;
	}

	// Parse request body
	let body = '';
	req.on('data', (chunk) => (body += chunk));
	req.on('end', async () => {
		try {
			const reqBody = JSON.parse(body);

			// Debug: Log raw request (remove in production)
			if (process.env.MCP_DEBUG) {
				console.log('📥 RAW REQUEST:', JSON.stringify(reqBody, null, 2));
			}
			console.log("🔧 MCP RAW BODY:", JSON.stringify(reqBody));

			// Support multiple request schemas (OpenAI-style, MCP-style, custom, agent formats)
			const toolName = reqBody?.name
				?? reqBody?.tool
				?? reqBody?.toolName
				?? reqBody?.function_name
				?? reqBody?.functionName
				?? reqBody?.function
				?? reqBody?.call?.name
				?? reqBody?.call?.function?.name
				?? reqBody?.tool_call?.function?.name
				?? reqBody?.tool_calls?.[0]?.function?.name
				?? reqBody?.tool_calls?.[0]?.name;

			let args = reqBody?.arguments
				?? reqBody?.args
				?? reqBody?.input
				?? reqBody?.params
				?? reqBody?.parameters
				?? reqBody?.call?.arguments
				?? reqBody?.tool_calls?.[0]?.function?.arguments
				?? {};
			if (typeof args === "string") args = JSON.parse(args);

			// Extract model hint if present
			const modelHint = reqBody?.model ?? reqBody?.llm ?? null;

			// Validate tool name
			if (!toolName) {
				console.warn('⚠️  Missing tool name in request:', reqBody);
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					ok: false,
					error: 'Missing tool name. Expected {name, arguments} or {function, arguments}',
					received: Object.keys(reqBody)
				}));
				return;
			}

			// Check if tool exists
			const fn = tools[toolName];
			if (!fn) {
				console.warn(`⚠️  Unknown tool: ${toolName}`);
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					ok: false,
					error: `Unknown function: ${toolName}`,
					available: Object.keys(tools)
				}));
				return;
			}

			// Execute tool (NEVER exit on error, just return error response)
			try {
				console.log(`🔧 MCP Tool Call: ${toolName}`, args);
				const result = await fn(args);
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(result));
			} catch (execError) {
				console.error(`❌ Tool execution error (${toolName}):`, execError);
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({
					content: [{ type: 'text', text: `Error: ${execError instanceof Error ? execError.message : String(execError)}` }],
					isError: true
				}));
			}
		} catch (parseError) {
			console.error('❌ JSON parse error:', parseError);
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({
				ok: false,
				error: 'Invalid JSON',
				details: parseError.message
			}));
		}
	});
});

// Start server
server.listen(CONFIG.port, async () => {
	console.log(`\n🚀 FastMCP Server Running`);
	console.log(`   Port: ${CONFIG.port}`);
	console.log(`   URL: http://localhost:${CONFIG.port}/function-call`);

	// Verify DB connection on startup
	console.log(`\n🔌 Database Configuration:`);
	console.log(`   DATABASE_URL: ${CONFIG.postgres.connectionString}`);
	try {
		const { Pool } = await import('pg');
		const testPool = new Pool({ connectionString: CONFIG.postgres.connectionString });
		const testResult = await testPool.query('SELECT inet_server_addr() as ip, current_user, current_database(), version()');
		const row = testResult.rows[0];
		console.log(`   ✅ Connected: ${row.current_database} as ${row.current_user}`);
		console.log(`   📍 Server IP: ${row.ip}`);
		console.log(`   📊 Version: ${row.version.split(' ')[0]} ${row.version.split(' ')[1]}`);
		await testPool.end();
	} catch (dbError) {
		console.error(`   ❌ DB Connection Failed:`, dbError.message);
		console.error(`   👉 Check DATABASE_URL or run: docker ps -a --filter "name=phase66-postgres"`);
	}

	console.log(`\n📦 Available Tools (${Object.keys(tools).length}):`);
	console.log(`   - knowledge_retrieve: 🆕 Front door KB search (Svelte docs + hybrid RAG)`);
	console.log(`   - qdrant_search: Search knowledge base`);
	console.log(`   - postgres_query: Query PostgreSQL`);
	console.log(`   - minio_fetch: Fetch from MinIO`);
	console.log(`   - redis_cache: Cache operations`);
	console.log(`   - read_file: Read files (supports line ranges)`);
	console.log(`   - ripgrep: Symbol/pattern search`);
	console.log(`   - search_codebase: Full-text search`);
	console.log(`   - web_search: External search (disabled by default)`);
	console.log(`   - write_file: Write/patch files`);
	console.log(`   - run_command: Execute shell commands`);
	console.log(`\n💡 Agent tip: Always call knowledge_retrieve FIRST before generating code!`);
	console.log(`   This ensures Svelte 5 runes, SvelteKit 2 routing, and Bits-UI patterns.`);
	console.log(`\n✨ Ready for autonomous error fixing with KB grounding!\n`);
});

// Keep-alive handler (don't exit on Ctrl+C, let parent process manage lifecycle)
process.on('SIGINT', () => {
	console.log('\n⚠️  SIGINT received (Ctrl+C). Use kill -9 or parent process to terminate.');
	// Don't exit - let the autonomous loop manage server lifecycle
});

// Unhandled errors shouldn't crash the server
process.on('uncaughtException', (error) => {
	console.error('❌ Uncaught exception (server continues):', error);
});

process.on('unhandledRejection', (reason) => {
	console.error('❌ Unhandled rejection (server continues):', reason);
});
