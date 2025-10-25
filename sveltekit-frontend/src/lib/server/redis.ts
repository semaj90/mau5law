import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
import { CONFIG } from '$lib/config/env.server';

// Lightweight runtime guard and safe wrapper for createClient
if (typeof createClient !== 'function') {
	// Fail fast so devs/CI see a clear error rather than many "possibly undefined" issues.
	throw new Error('redis.createClient is not available. Ensure "redis" package is installed and the import is correct.');
}

type ConnectableClient = {
	connect?: () => Promise<void>;
	on?: (...args: unknown[]) => void;
};

function safeCreateClient(opts?: { url?: string }): RedisClientType {
	// createClient is runtime-checked above
	return createClient(opts) as RedisClientType;
}

const REDIS_URL = CONFIG.REDIS_URL;
const REDIS_PASSWORD = CONFIG.REDIS_PASSWORD;

let instance: RedisClientType | null = null;

function buildUrlWithPassword(url: string, password?: string) {
  // if password is provided and not already in the URL, inject it
  if (!password) return url;
  try {
    const u = new URL(url);
    if (!u.username && !u.password) {
      u.username = '';
      u.password = password;
      return u.toString();
    }
    return url;
  } catch {
    // fallback: naive replace (shouldn't normally happen)
    if (url.startsWith('redis://')) {
      return `redis://:${encodeURIComponent(password)}@${url.slice('redis://'.length)}`;
    }
    return url;
  }
}

// Helper: safe error->string extractor (avoids 'any')
function extractErrorMessage(err: unknown): string {
	try {
		if (!err) return String(err);
		// common Error shape
		if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
			return (err as { message?: string }).message || String(err);
		}
		return String(err);
	} catch {
		return 'Unknown error';
	}
}

// Helper: attach safe logging (accept unknown args and coerce)
function attachRedisLogging(c: RedisClientType | null) {
	if (!c || typeof c.on !== 'function') return;

	c.on('error', (...args: unknown[]) => {
		const maybeErr = args[0];
		const msg = extractErrorMessage(maybeErr);

		if (msg.includes('NOAUTH')) {
			console.warn(
				'[redis] NOAUTH (authentication required). Provide REDIS_URL with credentials or set REDIS_PASSWORD.'
			);
			return;
		}

		console.error('[redis] error', msg);
	});

	// connect event may not exist in all builds; guard it
	try {
		(c as unknown as ConnectableClient).on?.('connect', () => console.log('[redis] connected'));
	} catch {
		/* ignore if not supported */
	}
}

function createClientInstance(): RedisClientType {
	if (instance) return instance;
	const url = buildUrlWithPassword(REDIS_URL, REDIS_PASSWORD);
	const client = safeCreateClient({ url });

	// attach lightweight logging for dev (uses safe handler)
	attachRedisLogging(client);

	// attempt to connect but don't fail creation; only call if present
	const maybeConnect = (client as unknown as ConnectableClient).connect;
	if (typeof maybeConnect === 'function') {
		maybeConnect().catch((err: unknown) => {
			const msg = extractErrorMessage(err);
			console.warn('[redis] connect failed (will retry on use)', msg);
		});
	}

	instance = client;
	return instance;
}

export const redis = createClientInstance();

export async function getFromCache(key: string): Promise<string | null> {
  try {
    // ensure connected (node-redis will handle reconnection internally)
    const maybeConnect = (redis as unknown as ConnectableClient).connect;
    if (typeof maybeConnect === 'function' && !redis.isOpen) await maybeConnect();
    return await redis.get(key);
  } catch (err) {
    console.warn('[redis] get error', extractErrorMessage(err));
    return null;
  }
}

export async function setCache(key: string, value: string, ttl?: number): Promise<boolean> {
  try {
    const maybeConnect = (redis as unknown as ConnectableClient).connect;
    if (typeof maybeConnect === 'function' && !redis.isOpen) await maybeConnect();

    if (typeof ttl === 'number') {
      await redis.set(key, value, { EX: ttl });
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn('[redis] set error', extractErrorMessage(err));
    return false;
  }
}

export function createRedisClientSet() {
	const url = buildUrlWithPassword(REDIS_URL, REDIS_PASSWORD);
	const primary = safeCreateClient({ url });
	const subscriber = safeCreateClient({ url });
	const publisher = safeCreateClient({ url });

	// attach simple error logging
	for (const c of [primary, subscriber, publisher]) {
		attachRedisLogging(c);
		// attempt background connect if available
		const maybeConnect = (c as unknown as ConnectableClient).connect;
		if (typeof maybeConnect === 'function') maybeConnect().catch(() => undefined);
	}

	return { primary, subscriber, publisher };
}

export default redis;
