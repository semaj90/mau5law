export type CacheEntry<T> = {
  value: T;
  expiresAt?: number; // epoch ms
};

export default class MultiTierCache<T = unknown> {
  private memory = new Map<string, CacheEntry<T>>();
  private memoryLimit: number;
  private storagePrefix: string;

  constructor(options?: { memoryLimit?: number; storagePrefix?: string }) {
	this.memoryLimit = options?.memoryLimit ?? 500;
	this.storagePrefix = options?.storagePrefix ?? 'mtcache:';
  }

  private now(): number {
	return Date.now();
  }

  private isExpired(entry?: CacheEntry<T>): boolean {
	if (!entry) return true;
	return typeof entry.expiresAt === 'number' && entry.expiresAt <= this.now();
  }

  private trimMemory() {
	while (this.memory.size > this.memoryLimit) {
	  // remove the oldest inserted (first) entry
	  const firstKey = this.memory.keys().next().value;
	  if (!firstKey) break;
	  this.memory.delete(firstKey);
	}
  }

  private storageKey(key: string) {
	return `${this.storagePrefix}${key}`;
  }

  private saveToStorage(key: string, entry: CacheEntry<T> | undefined) {
	if (typeof window === 'undefined' || !window.localStorage) return;
	try {
	  const sKey = this.storageKey(key);
	  if (entry === undefined) {
		window.localStorage.removeItem(sKey);
	  } else {
		window.localStorage.setItem(sKey, JSON.stringify(entry));
	  }
	} catch {
	  // ignore storage errors (quota, private mode, etc.)
	}
  }

  private loadFromStorage(key: string): CacheEntry<T> | undefined {
	if (typeof window === 'undefined' || !window.localStorage) return undefined;
	try {
	  const s = window.localStorage.getItem(this.storageKey(key));
	  if (!s) return undefined;
	  const parsed = JSON.parse(s) as CacheEntry<T>;
	  return parsed;
	} catch {
	  return undefined;
	}
  }

  async get(key: string): Promise<T | undefined> {
	// Try memory
	const mem = this.memory.get(key);
	if (mem) {
	  if (this.isExpired(mem)) {
		this.memory.delete(key);
		this.saveToStorage(key, undefined);
		return undefined;
	  }
	  // mark as recently used by reinserting
	  this.memory.delete(key);
	  this.memory.set(key, mem);
	  return mem.value;
	}

	// Try persistent storage
	const stored = this.loadFromStorage(key);
	if (!stored) return undefined;
	if (this.isExpired(stored)) {
	  this.saveToStorage(key, undefined);
	  return undefined;
	}
	// promote to memory
	this.memory.set(key, stored);
	this.trimMemory();
	return stored.value;
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
	const entry: CacheEntry<T> = {
	  value,
	  expiresAt: typeof ttlMs === 'number' ? this.now() + ttlMs : undefined,
	};
	// set in memory (LRU)
	if (this.memory.has(key)) this.memory.delete(key);
	this.memory.set(key, entry);
	this.trimMemory();
	// persist
	this.saveToStorage(key, entry);
  }

  async del(key: string): Promise<void> {
	this.memory.delete(key);
	this.saveToStorage(key, undefined);
  }

  async has(key: string): Promise<boolean> {
	const mem = this.memory.get(key);
	if (mem) {
	  if (this.isExpired(mem)) {
		this.memory.delete(key);
		this.saveToStorage(key, undefined);
		return false;
	  }
	  return true;
	}
	const stored = this.loadFromStorage(key);
	if (!stored) return false;
	if (this.isExpired(stored)) {
	  this.saveToStorage(key, undefined);
	  return false;
	}
	return true;
  }

  async clear(): Promise<void> {
	this.memory.clear();
	if (typeof window === 'undefined' || !window.localStorage) return;
	try {
	  const prefix = this.storagePrefix;
	  const keysToRemove: string[] = [];
	  for (let i = 0; i < window.localStorage.length; i++) {
		const k = window.localStorage.key(i);
		if (k && k.startsWith(prefix)) keysToRemove.push(k);
	  }
	  for (const k of keysToRemove) window.localStorage.removeItem(k);
	} catch {
	  // ignore
	}
  }
}
