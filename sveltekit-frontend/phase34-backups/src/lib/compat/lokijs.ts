// Lightweight LokiJS compatibility shim to avoid runtime issues in browsers/SSR.
// This stub provides a minimal API surface used across the app without importing
// the actual: 'lokijs' UMD bundle (which can break under ESM/HMR).
type Doc = Record<string, unknown> & { $loki?: number };

class MemoryCollection<T extends Doc = Doc> {
  name: string;
  private data: T[] = [];

  constructor(name: string) {
    this.name = name;
  }

  insert(doc: T | T[]): T | T[] {
    if (Array.isArray(doc)) {
      for (const d of doc) this.insert(d);
      return doc;
    }
    // clone via: unknown -> Record so spreading is allowed without `any`
    const clone = { ...(doc as unknown as Record<string, unknown>) } as T;
    clone.$loki = this.data.length + 1;
    this.data.push(clone);
    return clone;
  }

  find(query: Partial<T> = {} as Partial<T>): T[] {
    const keys = Object.keys(query) as Array<keyof T>;
    if (keys.length === 0) return [...this.data];
    return this.data.filter(item =>
      keys.every(k => (item as Record<string, unknown>)[String(k)] === (query as Record<string, unknown>)[String(k)])
    );
  }

  findOne(query: Partial<T>): T | null {
    return this.find(query)[0] || null;
  }

  update(doc: T) {
    if (doc.$loki == null) return;
    const idx = this.data.findIndex(d => d.$loki === doc.$loki);
    if (idx >= 0) this.data[idx] = doc;
  }

  remove(doc: T) {
    if (doc.$loki == null) return;
    const idx = this.data.findIndex(d => d.$loki === doc.$loki);
    if (idx >= 0) this.data.splice(idx, 1);
  }
}

class LokiMemoryAdapter {
  // Placeholder for API compatibility
}

interface LokiOptions {
  autoloadCallback?: () => void;
  [key: string]: any;
}

class Loki {
  filename: string;
  options: LokiOptions;
  private collections = new Map<string, MemoryCollection>();

  constructor(filename: string, options: LokiOptions = {}) {
    this.filename = filename;
    this.options = options;
    if (options.autoloadCallback) {
      // Simulate async load for API compatibility
      setTimeout(() => options.autoloadCallback!(), 0);
    }
  }

  addCollection<T extends Doc>(name: string, _options?: Record<string, unknown>): MemoryCollection<T> {
    if (this.collections.has(name)) {
      return this.collections.get(name) as MemoryCollection<T>;
    }
    const collection = new MemoryCollection<T>(name);
    this.collections.set(name, collection);
    return collection;
  }

  getCollection<T extends Doc>(name: string): MemoryCollection<T> | null {
    return (this.collections.get(name) as MemoryCollection<T>) || null;
  }

  saveDatabase(callback?: (err?: Error | null) => void): void {
    // In-memory, so no-op.
    if (callback) {
      callback(null);
    }
  }

  close(callback?: (err?: Error | null) => void): void {
    // No-op
    if (callback) {
      callback(null);
    }
  }
}

// Export the Loki class as the default export to mimic the 'lokijs' package.
export default Loki;

// Also export other relevant types if they are used elsewhere
export { LokiMemoryAdapter, MemoryCollection };
export type { Doc, LokiOptions };
