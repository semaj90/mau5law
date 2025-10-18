import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

// Added/relocated imports (moved here so they are available to functions defined earlier)
import { qdrantOptimized } from './qdrant-optimized.js';
import { createQdrantWrapper, QdrantApiWrapper } from './qdrant-api-wrapper.js';
import { productionLogger as logger } from '../production-logger.js';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error instanceof Error ? error : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      // removed arbitrary `topK` field to match logger's expected meta shape
    });
    return [];
  }
}

// --- Qdrant passthroughs for admin API (enhanced with logging) ---
export async function getCollections(): Promise<QdrantCollectionList> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollections();
}
export async function getCollection(collection: string): Promise<QdrantCollection | null> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.getCollection(collection);
}
export async function createCollection(name: string, config: QdrantConfig): Promise<QdrantCollection> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.createCollection(name, config);
}
export async function deleteCollection(name: string): Promise<void> {
  const wrapper = getQdrantWrapper();
  if (!wrapper) {
    logger.error('Qdrant not configured', undefined, {
      component: 'QdrantService',
      service: 'qdrant',
    });
    throw new Error('Qdrant not configured');
  }
  return wrapper.deleteCollection(name);
}
// Qdrant vector search service
// High-performance vector search with memory optimization
// Now using optimized service with cache-like logging system
import type { DocumentItem, VisionItem, SearchResult } from '$lib/types/sharedTypes';

export interface QdrantOptions {
  url?: string;
}

export async function upsertToQdrant(item: DocumentItem | VisionItem, opts: QdrantOptions = {}) {
  // Use provided URL (opts.url) if present to create a temporary wrapper, otherwise use configured wrapper.
  const wrapper = opts.url ? createQdrantWrapper({ url: opts.url }) : getQdrantWrapper();
  if (!wrapper) {
    logger.warn('Qdrant not configured for upsert', {
      component: 'QdrantService',
      service: 'qdrant',
    });
    return { ok: false };
  }
  // Safely read embeddings length without using `any`
  const maybeEmb = (item as unknown as { embeddings?: number[] }).embeddings;
  const embLen = maybeEmb?.length ?? 0;
  console.debug('qdrant.upsert:', item.id, 'size', embLen);

  try {
    const vector = Array.from(maybeEmb ?? []);
    await wrapper.upsert(COLLECTIONS.DOCUMENTS, {
      wait: true,
      points: [
        {
          id: item.id,
          vector,
          payload: item as unknown as Record<string, unknown>,
        },
      ],
    });
    return { ok: true };
  } catch (err: unknown) {
    logger.error('Failed to upsert item to Qdrant', err instanceof Error ? err : undefined, {
      component: 'QdrantService',
      service: 'qdrant',
      itemId: item.id,
    });
    return { ok: false };
  }
}

export async function searchQdrant(queryVector: number[], topK = 10): Promise<SearchResult[]> {
  // Prefer optimized client search when available
  try {
    const opt = qdrantOptimized as unknown as
      | { search?: (collection: string, q: number[], options?: { limit?: number }) => Promise<unknown[]> }
      | undefined;
    if (opt?.search && typeof opt.search === 'function') {
      const results = await opt.search(COLLECTIONS.DOCUMENTS, queryVector, { limit: topK });
      return (results as SearchResult[]) ?? [];
    }
    // Fallback to wrapper search if available
    const wrapper = getQdrantWrapper();
    if (!wrapper || typeof wrapper.search !== 'function') {
      return [];
    }
    // Provide a correctly-typed options object (vector is required)
    const options = {
      vector: Array.from(queryVector),
      limit: topK,
    };
    const res = await wrapper.search(COLLECTIONS.DOCUMENTS, options);
    return (res as SearchResult[]) ?? [];
  } catch (error: unknown) {
    logger.error('Qdrant search failed', error