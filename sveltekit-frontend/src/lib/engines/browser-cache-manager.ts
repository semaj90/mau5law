// (removed unused `import stream from "stream";`)

/**
 * Browser Cache Manager for Neural Sprite JSON States
 * Multi-layer caching with compression and Service Worker integration
 */
export interface BrowserCacheConfig {
  cachePrefix: string;
  maxCacheSize: number; // bytes
  enableCompression: boolean;
  enableServiceWorkerIntegration: boolean;
}

// tighter types instead of `any`
type SpritePayload = { id: string } & Record<string, unknown>;
type SpriteData = Record<string, unknown> | unknown[] | string | number | null;

export interface CachedSprite {
  id: string;
  data: SpriteData | null;
  compressed: boolean;
  timestamp: number;
  accessCount: number;
  size: number;
}

interface CompressionStreamConstructor {
  new (format: string): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  };
}

interface DecompressionStreamConstructor {
  new (format: string): {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
  };
}

export class BrowserCacheManager {
  private config: BrowserCacheConfig;
  private memoryCache: Map<string, CachedSprite> = new Map();
  private currentCacheSize = 0;
  private serviceWorkerRegistration?: ServiceWorkerRegistration;

  constructor(config: BrowserCacheConfig) {
    this.config = config;
    this.initializeServiceWorker().catch(e => {
      // fail gracefully; SW integration is optional
      console.warn('Service worker init failed:', e);
    });
    this.loadPersistedCache();
  }

  // Initialize service worker if enabled and supported
  private async initializeServiceWorker(): Promise<void> {
    if (!this.config.enableServiceWorkerIntegration || !('serviceWorker' in navigator)) {
      return;
    }
    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/workers/sprite-cache-sw.js');
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
      console.log('Sprite cache service worker registered');
    } catch (error: unknown) {
      console.warn('Failed to register sprite cache service worker:', this.formatError(error));
    }
  }

  // Handle messages from Service Worker
  private handleServiceWorkerMessage(event: MessageEvent): void {
    try {
      const { type, data } = event.data || {};
      switch (type) {
        case 'SPRITE_CACHED':
          console.log(`Sprite ${data?.spriteId} cached in Service Worker`);
          break;
        case 'CACHE_FULL':
          console.warn('Service Worker sprite cache is full');
          break;
      }
    } catch (e) {
      // swallow
    }
  }

  // Load index metadata from localStorage (no actual sprite bodies)
  private loadPersistedCache(): void {
    try {
      const cacheIndex = localStorage.getItem(`${this.config.cachePrefix}index`);
      if (!cacheIndex) return;
      const parsed = JSON.parse(cacheIndex) as Record<string, Omit<CachedSprite, 'data'>>;
      for (const [key, meta] of Object.entries(parsed)) {
        const sprite: CachedSprite = {
          id: meta.id,
          data: null, // lazy load from IDB
          compressed: !!meta.compressed,
          timestamp: meta.timestamp,
          accessCount: meta.accessCount || 0,
          size: meta.size || 0,
        };
        this.memoryCache.set(key, sprite);
        this.currentCacheSize += sprite.size;
      }
    } catch (error: unknown) {
      console.warn('Failed to load persisted sprite cache:', this.formatError(error));
    }
  }

  // Public getter
  public async getSprite(spriteId: string): Promise<SpriteData | null> {
    const cacheKey = this.getCacheKey(spriteId);

    // memory
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.data != null) {
      cached.accessCount++;
      cached.timestamp = Date.now();
      return await this.decompressData(cached.data, cached.compressed);
    }

    // service worker
    const swActive = this.serviceWorkerRegistration?.active ?? null;
    if (swActive) {
      const swCached = await this.getFromServiceWorker(spriteId);
      if (swCached) {
        await this.cacheSprite(swCached as SpritePayload); // best-effort cast; stored payload must include id
        return swCached;
      }
    }

    // indexedDB
    const idbCached = await this.getFromIndexedDB(cacheKey);
    if (idbCached) {
      const restored: CachedSprite = {
        id: spriteId,
        data: idbCached,
        compressed: true,
        timestamp: Date.now(),
        accessCount: 1,
        size: JSON.stringify(idbCached).length,
      };
      this.memoryCache.set(cacheKey, restored);
      this.currentCacheSize += restored.size;
      return await this.decompressData(idbCached, true);
    }

    return null;
  }

  // Public cache writer
  public async cacheSprite(sprite: SpritePayload): Promise<void> {
    const cacheKey = this.getCacheKey(sprite.id);
    const spriteData = { ...sprite };

    const compressedData = this.config.enableCompression
      ? await this.compressData(spriteData)
      : JSON.stringify(spriteData);

    const size = new Blob([compressedData]).size;

    if (this.currentCacheSize + size > this.config.maxCacheSize) {
      await this.evictLeastUsedSprites(this.currentCacheSize + size - this.config.maxCacheSize);
    }

    const cached: CachedSprite = {
      id: sprite.id,
      data: compressedData,
      compressed: this.config.enableCompression,
      timestamp: Date.now(),
      accessCount: 1,
      size,
    };

    this.memoryCache.set(cacheKey, cached);
    this.currentCacheSize += size;

    await this.storeInIndexedDB(cacheKey, compressedData);

    const sw = this.serviceWorkerRegistration?.active ?? null;
    if (sw) {
      this.cacheInServiceWorker(sprite);
    }

    this.updateCacheIndex();
  }

  // Ask service worker for sprite (MessageChannel)
  private async getFromServiceWorker(spriteId: string): Promise<SpriteData | null> {
    const sw = this.serviceWorkerRegistration?.active ?? null;
    if (!sw) return null;

    return new Promise(resolve => {
      let settled = false;
      const messageChannel = new MessageChannel();
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            messageChannel.port1.close();
          } catch (e) {
            console.debug('messageChannel.port1.close() failed (timeout):', e);
          }
          resolve(null);
        }
      }, 200);

      messageChannel.port1.onmessage = (ev: MessageEvent) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          messageChannel.port1.close();
        } catch (e) {
          console.debug('messageChannel.port1.close() failed (onmessage):', e);
        }
        resolve(ev.data?.result ?? null);
      };

      try {
        sw.postMessage({ type: 'GET_SPRITE', spriteId }, [messageChannel.port2]);
      } catch (e) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          try {
            messageChannel.port1.close();
          } catch (err) {
            console.debug('messageChannel.port1.close() failed (postMessage error):', err);
          }
          console.debug('postMessage to service worker failed:', e);
          resolve(null);
        }
      }
    });
  }

  // Send sprite to service worker
  private cacheInServiceWorker(sprite: SpritePayload): void {
    const sw = this.serviceWorkerRegistration?.active ?? null;
    if (!sw) return;
    try {
      sw.postMessage({ type: 'CACHE_SPRITE', sprite });
    } catch (e) {
      // ignore
    }
  }

  // IndexedDB get
  private async getFromIndexedDB(key: string): Promise<SpriteData | null> {
    return new Promise(resolve => {
      const request = indexedDB.open(`${this.config.cachePrefix}db`, 1);
      request.onerror = () => resolve(null);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sprites')) {
          db.createObjectStore('sprites', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(['sprites'], 'readonly');
          const store = tx.objectStore('sprites');
          const getReq = store.get(key);
          getReq.onsuccess = () => {
            resolve(getReq.result?.data ?? null);
            db.close();
          };
          getReq.onerror = () => {
            resolve(null);
            db.close();
          };
        } catch (e) {
          console.debug('IndexedDB read failed:', e);
          resolve(null);
          db.close();
        }
      };
    });
  }

  // IndexedDB put
  private async storeInIndexedDB(key: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`${this.config.cachePrefix}db`, 1);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sprites')) {
          db.createObjectStore('sprites', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        try {
          const tx = db.transaction(['sprites'], 'readwrite');
          const store = tx.objectStore('sprites');
          store.put({ key, data, timestamp: Date.now() });
          tx.oncomplete = () => {
            resolve();
            db.close();
          };
          tx.onerror = () => {
            reject(tx.error);
            db.close();
          };
        } catch (e: unknown) {
          const err = e instanceof Error ? e : new Error(String(e));
          reject(err);
          db.close();
        }
      };
    });
  }

  // Compression helper - returns base64/gzipped string when possible, otherwise JSON string (possibly shortened)
  private async compressData(obj: unknown): Promise<string> {
    const jsonString = JSON.stringify(obj);
    if (!this.config.enableCompression) return jsonString;

    const CS = (window as unknown as { CompressionStream?: CompressionStreamConstructor }).CompressionStream;
    if (CS) {
      try {
        const cs = new CS('gzip');
        const writer = cs.writable.getWriter();
        const encoder = new TextEncoder();
        writer.write(encoder.encode(jsonString));
        await writer.close();
        const compressedStream = cs.readable;
        const resp = new Response(compressedStream);
        const arrayBuffer = await resp.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);
        // safe base64
        const binary = Array.from(uint8)
          .map(b => String.fromCharCode(b))
          .join('');
        return btoa(binary);
      } catch (e) {
        console.warn('CompressionStream failed, falling back to JSON string:', e);
        return jsonString;
      }
    }

    // Fallback simple key-shortening compression
    const shortcuts: Record<string, string> = {
      '"jsonState"': '"j"',
      '"metadata"': '"m"',
      '"objects"': '"o"',
      '"complexity"': '"c"',
      '"triggers"': '"t"',
      '"usageCount"': '"u"',
      '"createdAt"': '"ca"',
    };
    let compact = jsonString;
    for (const [longKey, shortKey] of Object.entries(shortcuts)) {
      compact = compact.replace(new RegExp(longKey, 'g'), shortKey);
    }
    return compact;
  }

  // Decompression helper - accepts base64 gzipped or compacted JSON
  private async decompressData(data: unknown, compressed: boolean): Promise<SpriteData> {
    if (!compressed) {
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }
      return data as SpriteData;
    }

    if (typeof data !== 'string') return data as SpriteData;

    // If looks like JSON already
    if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
      try {
        return JSON.parse(data);
      } catch {
        return data as SpriteData;
      }
    }

    // Try DecompressionStream path (base64 gzipped)
    const DS = (window as unknown as { DecompressionStream?: DecompressionStreamConstructor }).DecompressionStream;
    if (DS) {
      try {
        const binaryString = atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        const ds = new DS('gzip');
        const decompressedStream = new Response(bytes).body!.pipeThrough(ds);
        const arrayBuffer = await new Response(decompressedStream).arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        return JSON.parse(text);
      } catch (e) {
        console.warn('DecompressionStream failed, trying fallback parse:', e);
      }
    }

    // Fallback: expand shortcuts back to full JSON keys
    try {
      const shortcuts: Record<string, string> = {
        '"j"': '"jsonState"',
        '"m"': '"metadata"',
        '"o"': '"objects"',
        '"c"': '"complexity"',
        '"t"': '"triggers"',
        '"u"': '"usageCount"',
        '"ca"': '"createdAt"',
      };
      let jsonString = data;
      for (const [short, long] of Object.entries(shortcuts)) {
        jsonString = jsonString.replace(new RegExp(short, 'g'), long);
      }
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn('Fallback decompression/parse failed:', e);
      return data as SpriteData;
    }
  }

  // Evict least-used sprites until required bytes are freed
  private async evictLeastUsedSprites(requiredBytes: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    const sorted = entries.sort(([, a], [, b]) => {
      if (a.accessCount !== b.accessCount) return a.accessCount - b.accessCount;
      return a.timestamp - b.timestamp;
    });
    let freed = 0;
    const toRemove: string[] = [];
    for (const [key, sprite] of sorted) {
      if (freed >= requiredBytes) break;
      toRemove.push(key);
      freed += sprite.size;
    }
    for (const key of toRemove) {
      const s = this.memoryCache.get(key);
      if (s) this.currentCacheSize -= s.size;
      this.memoryCache.delete(key);
      // also remove from IDB
      try {
        const request = indexedDB.open(`${this.config.cachePrefix}db`, 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['sprites'], 'readwrite');
          const store = tx.objectStore('sprites');
          store.delete(key);
          tx.oncomplete = () => db.close();
          tx.onerror = () => db.close();
        };
      } catch (e) {
        console.debug('Failed to schedule IDB delete for evicted sprite:', e);
      }
    }
    this.updateCacheIndex();
    console.log(`Evicted ${toRemove.length} sprites, freed ${freed} bytes`);
  }

  // Utility key
  private getCacheKey(spriteId: string): string {
    return `${this.config.cachePrefix}${spriteId}`;
  }

  // Persist index of cache metadata (no sprite bodies)
  private updateCacheIndex(): void {
    try {
      const index: Record<string, Omit<CachedSprite, 'data'>> = {};
      for (const [key, sprite] of this.memoryCache.entries()) {
        index[key] = {
          id: sprite.id,
          compressed: sprite.compressed,
          timestamp: sprite.timestamp,
          accessCount: sprite.accessCount,
          size: sprite.size,
        };
      }
      localStorage.setItem(`${this.config.cachePrefix}index`, JSON.stringify(index));
    } catch (error: unknown) {
      console.warn('Failed to update cache index:', this.formatError(error));
    }
  }

  // Stats
  public getCacheStats(): {
    memorySprites: number;
    totalSize: number;
    compressionRatio: number;
    hitRate: number;
  } {
    const cacheValues = Array.from(this.memoryCache.values());
    const totalAccess = cacheValues.reduce((sum, s) => sum + s.accessCount, 0);
    const compressedCount = cacheValues.filter(s => s.compressed).length;
    return {
      memorySprites: this.memoryCache.size,
      totalSize: this.currentCacheSize,
      compressionRatio: this.memoryCache.size ? compressedCount / this.memoryCache.size : 0,
      hitRate: totalAccess > 0 ? (totalAccess - this.memoryCache.size) / totalAccess : 0,
    };
  }

  // Clear all caches
  public async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.currentCacheSize = 0;
    try {
      await new Promise<void>(resolve => {
        const req = indexedDB.deleteDatabase(`${this.config.cachePrefix}db`);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    } catch (e) {
      console.warn('Failed to clear IndexedDB cache:', e);
    }
    try {
      localStorage.removeItem(`${this.config.cachePrefix}index`);
    } catch (e) {
      console.debug('Failed to remove cache index from localStorage:', e);
    }
    const sw = this.serviceWorkerRegistration?.active ?? null;
    if (sw) {
      try {
        sw.postMessage({ type: 'CLEAR_CACHE' });
      } catch (e) {
        console.debug('ServiceWorker CLEAR_CACHE postMessage failed:', e);
      }
    }
  }

  // Small helper to safely convert unknown errors to readable strings / Error objects
  private formatError(err: unknown): string {
    if (err instanceof Error) return err.message;
    try {
      return String(err);
    } catch {
      return 'Unknown error';
    }
  }
}
