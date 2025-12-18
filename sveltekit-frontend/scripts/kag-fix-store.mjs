#!/usr/bin/env node
/**
 * KAG Fix Store - Node.js Native Implementation
 *
 * Pure JavaScript module for use with factory-fixer-v2.mjs.
 * No TypeScript, no SvelteKit aliases, no build step required.
 *
 * Uses Redis connection from environment variables (same as factory-fixer).
 * Stores successful fixes indexed by error signature for instant replay.
 */

import { createHash } from 'crypto';
import path from 'path';

// Redis namespace prefix
const REDIS_PREFIX = 'phase72:kag';

// Redis client - lazy initialized
let redis = null;
let redisAvailable = false;

/**
 * Initialize Redis connection
 * Uses same environment variables as factory-fixer-v2.mjs
 */
async function initRedis() {
	console.log('[KAG DEBUG] initRedis called, redis object:', redis ? 'exists' : 'null');
	if (redis) {
		console.log('[KAG DEBUG] Returning existing Redis client');
		return redis;
	}

	try {
		console.log('[KAG DEBUG] Creating new Redis client...');
		// Try to import ioredis (may not be installed)
		const { default: Redis } = await import('ioredis');

		const redisHost = process.env.REDIS_HOST || '127.0.0.1';
		const redisPort = parseInt(process.env.REDIS_PORT || '4005', 10);
		console.log('[KAG DEBUG] Connecting to Redis at', redisHost, ':', redisPort);

		redis = new Redis({
			host: redisHost,
			port: redisPort,
			retryStrategy: (times) => {
				if (times > 3) return null; // Stop retrying after 3 attempts
				return Math.min(times * 50, 200);
			},
			enableOfflineQueue: true,  // FIXED: Allow queueing while connecting
			lazyConnect: false,         // Connect immediately
			connectTimeout: 5000        // 5 second timeout
		});

		// Wait for ready event
		console.log('[KAG DEBUG] Waiting for Redis connection...');
		await new Promise((resolve, reject) => {
			redis.once('ready', resolve);
			redis.once('error', reject);
			setTimeout(() => reject(new Error('Connection timeout')), 5000);
		});

		console.log('[KAG DEBUG] Redis connection ready!');

		// Test connection
		console.log('[KAG DEBUG] Testing Redis connection with PING...');
		await redis.ping();
		console.log('[KAG DEBUG] Redis PING successful!');
		redisAvailable = true;

		redis.on('error', (err) => {
			console.warn('[KAG] Redis connection error:', err.message);
			redisAvailable = false;
		});

		return redis;
	} catch (error) {
		console.warn('[KAG] Redis init FAILED:', error.message);
		console.warn('[KAG] Error stack:', error.stack);
		console.warn('[KAG] KAG features disabled - fixes will not be cached');
		redisAvailable = false;
		return null;
	}
}

/**
 * Compute deterministic signature for error
 *
 * Normalizations:
 * - (123,45) → (X,Y) for line/col numbers
 * - File paths → *.ext
 * - Numbers → N
 * - Lowercase + trim
 */
function computeSignature(error) {
	// Normalize error message
	let normalized = (error.message || '')
		.replace(/\((\d+),(\d+)\)/g, '(X,Y)') // Line/col numbers
		.replace(/[A-Z]:\\[^:]+\.(ts|js|svelte)/gi, '*.$1') // Windows paths
		.replace(/\/[^/]+\.(ts|js|svelte)/g, '*.$1') // Unix paths
		.replace(/\b\d+\b/g, 'N') // Numbers (word boundaries only)
		.toLowerCase()
		.trim();

	// Get file extension
	const fileExt = error.file ? path.extname(error.file).substring(1) : 'unknown';

	// Tool name
	const tool = error.tool || 'unknown';

	// Context slice (50 chars before + after error position)
	let context = '';
	if (error.code && typeof error.position === 'number') {
		const start = Math.max(0, error.position - 50);
		const end = Math.min(error.code.length, error.position + 50);
		context = error.code.substring(start, end);
	}

	// Compute signature: tool:ext:message:context
	const sigInput = `${tool}:${fileExt}:${normalized}:${context}`;
	const sig = createHash('sha256').update(sigInput).digest('hex');

	return {
		sig,
		message: normalized,
		file: error.file || 'unknown',
		code: context,
		tool,
		fileExt
	};
}

/**
 * Query best fix for error signature
 * Returns highest confidence fix or null if not found
 */
async function queryBestFix(errorSig) {
	if (!redisAvailable) return null;

	try {
		const client = await initRedis();
		if (!client) return null;

		const key = `phase72:kag:sig:${errorSig.sig}`;
		const fixesJson = await client.get(key);

		if (!fixesJson) {
			// Update miss stats
			await updateStats('miss');
			return null;
		}

		const fixes = JSON.parse(fixesJson);

		// Return highest confidence fix (fixes are sorted)
		const bestFix = fixes[0] || null;

		if (bestFix) {
			// Update hit stats
			await updateStats('hit');
		}

		return bestFix;
	} catch (error) {
		console.warn('[KAG] Query error:', error.message);
		return null;
	}
}

/**
 * Store successful fix in KAG
 * Updates existing fix if patch already exists, otherwise adds new
 */
async function storeFix(errorSig, fix) {
	console.log('[KAG DEBUG] storeFix called');

	try {
		console.log('[KAG DEBUG] Calling initRedis...');
		const client = await initRedis();
		if (!client) {
			console.log('[KAG DEBUG] initRedis returned null - Redis not available');
			return;
		}

		const key = `phase72:kag:sig:${errorSig.sig}`;
		console.log('[KAG DEBUG] Storing fix with key:', key);

		// Get existing fixes
		const existingJson = await client.get(key);
		const existing = existingJson ? JSON.parse(existingJson) : [];

		// Check if this exact patch already exists
		const matchIndex = existing.findIndex((f) => f.patch === fix.patch);

		if (matchIndex >= 0) {
			// Update existing fix
			const match = existing[matchIndex];
			if (fix.verified) {
				match.successCount = (match.successCount || 0) + 1;
			} else {
				match.failureCount = (match.failureCount || 0) + 1;
			}
			match.confidence =
				match.successCount / (match.successCount + match.failureCount);
			match.appliedAt = fix.appliedAt;

			// Update stats if provided
			if (fix.filesBefore !== undefined) match.filesBefore = fix.filesBefore;
			if (fix.filesAfter !== undefined) match.filesAfter = fix.filesAfter;
			if (fix.errorsBefore !== undefined) match.errorsBefore = fix.errorsBefore;
			if (fix.errorsAfter !== undefined) match.errorsAfter = fix.errorsAfter;
			if (fix.runtime !== undefined) match.runtime = fix.runtime;
		} else {
			// Add new fix
			existing.push({
				sig: errorSig.sig,
				patchId: fix.patchId,
				patch: fix.patch,
				appliedAt: fix.appliedAt,
				verified: fix.verified || false,
				successCount: fix.verified ? 1 : 0,
				failureCount: fix.verified ? 0 : 1,
				confidence: fix.verified ? 1.0 : 0.0,
				tier: fix.tier || 2,
				filesBefore: fix.filesBefore || 0,
				filesAfter: fix.filesAfter || 0,
				errorsBefore: fix.errorsBefore || 0,
				errorsAfter: fix.errorsAfter || 0,
				runtime: fix.runtime || 0
			});
		}

		// Sort by confidence descending
		existing.sort((a, b) => b.confidence - a.confidence);

		// Store with 30-day TTL
		const ttlSeconds = 30 * 24 * 60 * 60;
		await client.set(key, JSON.stringify(existing), 'EX', ttlSeconds);

		// Also index by patch ID for reverse lookup
		const patchKey = `phase72:kag:patch:${fix.patchId}`;
		await client.set(patchKey, JSON.stringify(errorSig), 'EX', ttlSeconds);

		// Update global stats
		await updateStats('store', { fix, errorSig });
	} catch (error) {
		console.warn('[KAG] Store error:', error.message);
	}
}

/**
 * Get all fixes for signature (for analysis)
 */
async function getAllFixes(errorSig) {
	if (!redisAvailable) return [];

	try {
		const client = await initRedis();
		if (!client) return [];

		const key = `phase72:kag:sig:${errorSig.sig}`;
		const fixesJson = await client.get(key);

		return fixesJson ? JSON.parse(fixesJson) : [];
	} catch (error) {
		console.warn('[KAG] GetAll error:', error.message);
		return [];
	}
}

/**
 * Get KAG statistics
 */
async function getStats() {
	if (!redisAvailable) {
		return {
			totalSignatures: 0,
			totalFixes: 0,
			avgConfidence: 0,
			topFixes: [],
			recentFixes: [],
			hitRate: 0,
			missRate: 0
		};
	}

	try {
		const client = await initRedis();
		if (!client) return getDefaultStats();

		const statsKey = 'phase72:kag:stats';
		const statsJson = await client.get(statsKey);

		if (!statsJson) return getDefaultStats();

		const stats = JSON.parse(statsJson);

		// Calculate hit/miss rates
		const total = (stats.hits || 0) + (stats.misses || 0);
		const hitRate = total > 0 ? ((stats.hits || 0) / total) * 100 : 0;
		const missRate = total > 0 ? ((stats.misses || 0) / total) * 100 : 0;

		return {
			totalSignatures: stats.totalSignatures || 0,
			totalFixes: stats.totalFixes || 0,
			avgConfidence: stats.avgConfidence || 0,
			topFixes: stats.topFixes || [],
			recentFixes: stats.recentFixes || [],
			hitRate,
			missRate
		};
	} catch (error) {
		console.warn('[KAG] Stats error:', error.message);
		return getDefaultStats();
	}
}

/**
 * Update global stats (internal)
 */
async function updateStats(action, data = {}) {
	if (!redisAvailable) return;

	try {
		const client = await initRedis();
		if (!client) return;

		const statsKey = 'phase72:kag:stats';
		const statsJson = await client.get(statsKey);
		const stats = statsJson ? JSON.parse(statsJson) : getDefaultStats();

		switch (action) {
			case 'store':
				stats.totalFixes++;
				if (data.errorSig) {
					stats.seenSignatures = stats.seenSignatures || [];
					if (!stats.seenSignatures.includes(data.errorSig.sig)) {
						stats.seenSignatures.push(data.errorSig.sig);
						stats.totalSignatures = stats.seenSignatures.length;
					}
				}

				// Update top fixes
				if (data.fix) {
					stats.topFixes = stats.topFixes || [];
					stats.topFixes.push(data.fix);
					stats.topFixes.sort((a, b) => (b.successCount || 0) - (a.successCount || 0));
					stats.topFixes = stats.topFixes.slice(0, 10);

					// Update recent fixes
					stats.recentFixes = stats.recentFixes || [];
					stats.recentFixes.unshift(data.fix);
					stats.recentFixes = stats.recentFixes.slice(0, 10);

					// Update average confidence
					const totalConfidence = stats.topFixes.reduce(
						(sum, f) => sum + (f.confidence || 0),
						0
					);
					stats.avgConfidence =
						stats.topFixes.length > 0 ? totalConfidence / stats.topFixes.length : 0;
				}
				break;

			case 'hit':
				stats.hits = (stats.hits || 0) + 1;
				break;

			case 'miss':
				stats.misses = (stats.misses || 0) + 1;
				break;
		}

		const ttlSeconds = 30 * 24 * 60 * 60;
		await client.set(statsKey, JSON.stringify(stats), 'EX', ttlSeconds);
	} catch (error) {
		console.warn('[KAG] UpdateStats error:', error.message);
	}
}

/**
 * Get default stats structure
 */
function getDefaultStats() {
	return {
		totalSignatures: 0,
		totalFixes: 0,
		avgConfidence: 0,
		topFixes: [],
		recentFixes: [],
		hits: 0,
		misses: 0,
		seenSignatures: []
	};
}

/**
 * Export KAG data for analysis
 */
async function exportData() {
	try {
		const stats = await getStats();

		// Note: Full export requires scanning all keys
		// For now, return stats only (full export needs Redis SCAN)
		return {
			signatures: [],
			stats
		};
	} catch (error) {
		console.warn('[KAG] Export error:', error.message);
		return {
			signatures: [],
			stats: getDefaultStats()
		};
	}
}

/**
 * Health check for production verification
 * Returns Redis connectivity status and KAG namespace info
 */
async function health() {
	try {
		const client = await initRedis();
		if (!client) {
			return {
				ok: false,
				message: 'Redis not available',
				namespace: REDIS_PREFIX,
				version: '1.0.0'
			};
		}

		const pong = await client.ping();
		const stats = await getStats();

		return {
			ok: true,
			message: 'KAG store operational',
			redis: { connected: pong === 'PONG', host: process.env.REDIS_HOST || '127.0.0.1', port: parseInt(process.env.REDIS_PORT || '4005') },
			namespace: REDIS_PREFIX,
			version: '1.0.0',
			stats: {
				totalSignatures: stats.totalSignatures || 0,
				totalFixes: stats.totalFixes || 0,
				avgConfidence: stats.avgConfidence || 0,
				hits: stats.hits || 0,
				misses: stats.misses || 0
			}
		};
	} catch (error) {
		return {
			ok: false,
			message: error.message,
			namespace: REDIS_PREFIX,
			version: '1.0.0'
		};
	}
}

// Export singleton-style interface (production-simple)
export const kagFixStore = {
	computeSignature,
	queryBestFix,
	storeFix,
	getAllFixes,
	getStats,
	exportData,
	health
};

// Also export individual functions for flexibility
export { computeSignature, exportData, getAllFixes, getStats, health, queryBestFix, storeFix };

// CLI self-test handler
// Check if this script was invoked directly (works cross-platform)
const isMainModule = process.argv[1] && (
  import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
);

if (isMainModule && process.argv.includes('--selftest')) {
	console.log('[KAG Store] Running self-test...');
	health().then((healthCheck) => {
		if (healthCheck.ok) {
			console.log('[KAG Store] ✅ Self-test PASSED');
			console.log('[KAG Store] Redis:', JSON.stringify(healthCheck.redis));
			console.log('[KAG Store] Stats:', JSON.stringify(healthCheck.stats));
			process.exit(0);
		} else {
			console.error('[KAG Store] ❌ Self-test FAILED:', healthCheck.message);
			process.exit(1);
		}
	}).catch((error) => {
		console.error('[KAG Store] ❌ Self-test ERROR:', error.message);
		process.exit(1);
	});
}

