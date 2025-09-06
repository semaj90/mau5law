/**
 * Multi-tier cache: in-memory LRU + optional localStorage persistence.
 *
 * - Generic over V (value). Keys are strings to make persistence keys simple.
 * - memoryMaxEntries controls the in-memory LRU size.
 * - ttlMs optionally limits lifetime of entries.
 * - persistent enables localStorage backing (when available).
 */

type PersistedEntry = {
  value: unknown;
  expiresAt?: number | null;
};

interface MultiTierCacheOptions {
  memoryMaxEntries?: number; // max in-memory entries (LRU)
  defaultTtlMs?: number | null; // default TTL in ms, or null for no expiry
  persistent?: boolean; // whether to persist to localStorage
  storageKeyPrefix?: string; // prefix for localStorage keys
}

export default class MultiTierCache<V = unknown> {
  private memory = new Map<string, { value: V; expiresAt?: number | null }>();
  private memoryMaxEntries: number;
  private defaultTtlMs: number | null;
  private persistent: boolean;
  private storageKeyPrefix: string;
  private hasLocalStorage: boolean;

  constructor(options: MultiTierCacheOptions = {}) {
	this.memoryMaxEntries = options.memoryMaxEntries ?? 1000;
	this.defaultTtlMs = options.defaultTtlMs ?? null;
	this.persistent = options.persistent ?? false;
	this.storageKeyPrefix = options.storageKeyPrefix ?? 'mtcache:';
	// use globalThis to safely detect availability of localStorage in different runtimes
	this.hasLocalStorage = typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined';
  }

  private now() {
	return Date.now();
  }

  private storageKey(key: string) {
	return `${this.storageKeyPrefix}${key}`;
  }

  private isExpired(expiresAt?: number | null) {
	return typeof expiresAt === 'number' && expiresAt <= this.now();
  }

  private async loadFromStorage(key: string): Promise<{ value: V; expiresAt?: number | null } | null> {
	if (!this.persistent || !this.hasLocalStorage) return null;
	try {
	  const ls = (globalThis as any).localStorage;
	  if (!ls) return null;
	  const raw = ls.getItem(this.storageKey(key));
	  if (!raw) return null;
	  const parsed = JSON.parse(raw) as PersistedEntry;
	  if (this.isExpired(parsed.expiresAt ?? null)) {
		// remove stale item
		ls.removeItem(this.storageKey(key));
		return null;
	  }
	  return { value: parsed.value as V, expiresAt: parsed.expiresAt ?? null };
	} catch {
	  return null;
	}
  }

  private async saveToStorage(key: string, value: V, expiresAt?: number | null) {
	if (!this.persistent || !this.hasLocalStorage) return;
	try {
	  const ls = (globalThis as any).localStorage;
	  if (!ls) return;
	  const toStore: PersistedEntry = { value, expiresAt: expiresAt ?? null };
	  ls.setItem(this.storageKey(key), JSON.stringify(toStore));
	} catch {
	  // ignore storage errors (quota, serialization)
	}
  }

  private async removeFromStorage(key: string) {
	if (!this.persistent || !this.hasLocalStorage) return;
	try {
	  const ls = (globalThis as any).localStorage;
	  if (!ls) return;
	  ls.removeItem(this.storageKey(key));
	} catch {
	  // ignore
	}
  }

  private evictIfNeeded() {
	while (this.memory.size > this.memoryMaxEntries) {
	  // remove oldest (Map preserves insertion order; we keep most-recent-used by re-inserting on get/set)
	  const oldestKey = this.memory.keys().next().value;
	  if (!oldestKey) break;
	  this.memory.delete(oldestKey);
	}
  }

  private pruneExpiredInMemory() {
	const now = this.now();
	const toRemove: string[] = [];
	this.memory.forEach((v, k) => {
	  if (typeof v.expiresAt === 'number' && v.expiresAt <= now) {
		toRemove.push(k);
	  }
	});
	for (const k of toRemove) {
	  this.memory.delete(k);
	}
  }

  // Public API

  async get(key: string): Promise<V | undefined> {
	// prune expired entries first
	this.pruneExpiredInMemory();

	const inMem = this.memory.get(key);
	if (inMem) {
	  if (this.isExpired(inMem.expiresAt ?? null)) {
		this.memory.delete(key);
		await this.removeFromStorage(key);
		return undefined;
	  }
	  // move to the end to mark as recently used
	  this.memory.delete(key);
	  this.memory.set(key, inMem);
	  return inMem.value;
	}

	// attempt to load from persistent storage
	const fromStorage = await this.loadFromStorage(key);
	if (fromStorage) {
	  // put into memory (and maintain LRU)
	  this.memory.set(key, { value: fromStorage.value, expiresAt: fromStorage.expiresAt ?? null });
	  this.evictIfNeeded();
	  return fromStorage.value;
	}

	return undefined;
  }

  async set(key: string, value: V, ttlMs?: number | null): Promise<void> {
	const effectiveTtl = ttlMs === undefined ? this.defaultTtlMs : ttlMs;
	const expiresAt = typeof effectiveTtl === 'number' && effectiveTtl > 0 ? this.now() + effectiveTtl : null;

	// set in memory and mark as recently used
	this.memory.delete(key);
	this.memory.set(key, { value, expiresAt });
	this.evictIfNeeded();

	// persist if enabled
	await this.saveToStorage(key, value, expiresAt);
  }

  async clear(): Promise<void> {
	this.memory.clear();
	if (this.persistent && this.hasLocalStorage) {
	  try {
		// remove keys with our prefix
		const ls = (globalThis as any).localStorage;
		if (!ls) return;
		const prefix = this.storageKeyPrefix;
		const toRemove: string[] = [];
		for (let i = 0; i < ls.length; i++) {
		  const k = ls.key(i);
		  if (k && k.startsWith(prefix)) toRemove.push(k);
		}
		for (const k of toRemove) ls.removeItem(k);
	  } catch {
		// ignore
	  }
	}
  }

  // convenience sync helpers (they still return Promise to keep API consistent)
  async has(key: string): Promise<boolean> {
	const v = await this.get(key);
	return typeof v !== 'undefined';
  }

  // number of items currently in-memory (not counting persisted-only)
  size(): number {
	this.pruneExpiredInMemory();
	return this.memory.size;
  }
}
