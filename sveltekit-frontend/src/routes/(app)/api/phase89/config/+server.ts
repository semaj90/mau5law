/**
 * Phase 89: Configuration Truth Endpoint
 * Returns all resolved env vars, collection names, and prefixes
 * This is the "source of truth" for namespace coherence
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const config = {
		timestamp: new Date().toISOString(),

		// Database configs
		postgres: {
			primary: {
				url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/legal',
				host: process.env.DATABASE_URL?.match(/@([^:]+):/)?.[1] || 'localhost',
				port: parseInt(process.env.DATABASE_URL?.match(/:(\d+)\//)?.[1] || '5432'),
				database: process.env.DATABASE_URL?.split('/').pop()?.split('?')[0] || 'legal',
				user: process.env.DATABASE_URL?.match(/\/\/([^:]+):/)?.[1] || 'user'
			},
			legal_ai: {
				url: 'postgresql://legal_admin:123456@localhost:5434/legal_ai_db',
				host: 'localhost',
				port: 5434,
				database: 'legal_ai_db',
				user: 'legal_admin'
			}
		},

		// Redis config
		redis: {
			url: process.env.REDIS_URL || 'redis://127.0.0.1:6379/0',
			db: parseInt((process.env.REDIS_URL || '').split('/').pop() || '0'),
			host: (process.env.REDIS_URL || 'redis://127.0.0.1:6379').match(/\/\/([^:]+)/)?.[1] || '127.0.0.1',
			port: parseInt((process.env.REDIS_URL || '').match(/:(\d+)/)?.[1] || '6379')
		},

		// Qdrant config
		qdrant: {
			url: process.env.QDRANT_URL || 'http://127.0.0.1:6333',
			collections: {
				error_chunks: 'phase89_error_chunks',
				ast_chunks: 'phase89_ast_embeddings',
				error_clusters: 'phase89_error_clusters',
				rag_patterns: 'phase89_rag_patterns',
				kb_cards: 'phase89_kb_cards',
				// Legacy (read-only fallback)
				legacy_kb: 'phase76_knowledge_base'
			}
		},

		// Ollama config
		ollama: {
			url: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
			models: {
				embed: process.env.OLLAMA_EMBED_MODEL || 'embeddinggemma:latest',
				llm: process.env.OLLAMA_LLM_MODEL || 'gemma3-legal:latest'
			}
		},

		// Key prefixes (CRITICAL for namespace coherence)
		redis_prefixes: {
			embeddings: 'emb:',
			phase89: 'phase89:',
			topk: 'topk:',
			kb: 'kb:',
			retrieval: 'phase89:retrieval:',
			cluster: 'phase89:cluster:'
		},

		// TTLs
		cache_ttl: {
			embeddings: 7 * 24 * 60 * 60, // 7 days
			retrieval: 2 * 60 * 60,        // 2 hours
			cluster: 24 * 60 * 60          // 1 day
		},

		// CUDA config
		cuda: {
			enabled: true,
			python_path: 'C:\\Users\\james\\Videos\\deeds-web-app\\.venv\\Scripts\\python.exe',
			device: 'cuda', // cuda | cpu
			batch_size: 32
		},

		// Phase 89 specific
		phase89: {
			schema_version: '1.0.0',
			tables: [
				'phase89_error_instances',
				'phase89_embeddings',
				'phase89_fix_attempts',
				'phase89_kb_cards',
				'error_cluster_recommendations',
				'kag_nodes',
				'kag_edges',
				'phase89_import_edges'
			],
			views: [
				'phase89_active_errors',
				'phase89_fix_success_rate'
			]
		}
	};

	return json(config);
};
