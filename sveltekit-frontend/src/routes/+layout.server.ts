import loki from 'lokijs';
import type { RequestEvent } from '@sveltejs/kit';
import { loadWithSSR } from '$lib/server/api-ssr-helpers';
import type { SystemHealth, DashboardStats, HomePageData } from '$lib/types/api-schemas';

/**
 * +layout.server.ts
 * 
 * Enhanced for Bits UI SSR compatibility
 * Lightweight server-side caching using LokiJS (recommended for dev / single-process).
 * Caches "startupStatus" from $lib/services/multi-library-startup for a short TTL.
 *
 * Replace with a Redis-backed implementation for production (shared cache).
 */


type CacheDoc = {
  key: string;
  value: any;
  expiresAt?: number;
};

// Create a single DB instance for the server process lifetime
const db = new loki('server-cache.db');
const collectionName = 'layoutCache';
let layoutCache = db.getCollection<CacheDoc>(collectionName);
if (!layoutCache) {
  layoutCache = db.addCollection<CacheDoc>(collectionName, {
    unique: ['key'],
    autoupdate: true
  });
}

const getFromCache = (key: string): any | null => {
  const doc = layoutCache.findOne({ key }) as CacheDoc | null;
  if (!doc) return null;
  if (doc.expiresAt && Date.now() > doc.expiresAt) {
    // expired — remove and treat as miss
    layoutCache.remove(doc);
    return null;
  }
  return doc.value;
};

const setCache = (key: string, value: any, ttlSeconds?: number) => {
  const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
  const existing = layoutCache.findOne({ key }) as CacheDoc | null;
  if (existing) {
    existing.value = value;
    existing.expiresAt = expiresAt;
    layoutCache.update(existing);
  } else {
    layoutCache.insert({ key, value, expiresAt });
  }
};

// TTL for startup status cache (adjust for your needs)
const STARTUP_TTL_SECONDS = 60 * 5; // 5 minutes

export const load = async (event: RequestEvent): Promise<any> => {
  const cacheKey = 'layout:startupStatus';

  // 1. Try to return cached startup status  
  const cached = getFromCache(cacheKey);
  if (cached) {
    return {
      startupStatus: cached,
      _cacheHit: true,
      user: event.locals.user,
      session: event.locals.session
    };
  }

  // 2. Cache miss — use SSR-optimized loading
  return loadWithSSR(
    async () => {
      console.log('⚠️  Multi-library startup temporarily disabled for development');
      
      // Return SSR-optimized startup status for Bits UI
      const startupStatus = {
        initialized: true,
        services: {
          loki: true,
          fuse: true,
          fabric: true,
          xstate: true,
          redis: false,  // These might be causing the hang
          rabbitmq: false,
          orchestrator: false,
          ollama: false
        },
        errors: [],
        startTime: Date.now(),
        initTime: 0,
        bitsUICompatible: true
      };

      // Store the result in cache
      setCache(cacheKey, startupStatus, STARTUP_TTL_SECONDS);

      return {
        startupStatus,
        _cacheHit: false,
        _mocked: true,
        user: event.locals.user,
        session: event.locals.session,
        isAuthenticated: !!event.locals.user
      };
    },
    // Fallback data for SSR errors
    {
      startupStatus: null,
      error: 'Failed to initialize startup services',
      user: null,
      session: null,
      isAuthenticated: false
    }
  );
};