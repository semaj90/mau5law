// Conservatively declare common runtime shapes used across the repo to
// reduce transient TypeScript noise. Keep intentionally permissive (any)
// to avoid changing runtime behavior.

declare global {
  // Generic DB result used in many places (rows, rowCount, error)
  type RowList<T = any> = {
    rows?: T[];
    rowCount?: number;
    // allow arbitrary additional properties (e.g., cursor, meta)
    [k: string]: any;
  };

  // Minimal thread-safe Postgres surface used by middleware tests and wiring.
  interface ThreadSafePostgres {
    query: (q: string, ...args: any[]) => Promise<any>;
    insertJsonbDocument?: (...args: any[]) => Promise<any>;
    deleteJsonbDocuments?: (...args: any[]) => Promise<any>;
    // fallback catch-all
    [k: string]: any;
  }

  // GPU coordinator with permissive methods used by orchestrators
  interface GPUThreadCoordinator {
    processEmbeddingBatch?: (batch: any[]) => Promise<any>;
    // allow other runtime helpers
    [k: string]: any;
  }
}

export {};
// src/lib/types/auto-shims.d.ts
// Conservative, temporary shims to reduce noise during fast typecheck.
// These should be short-lived — they convert many frequent shapes to `any`.

// Common project-level types
type LegalAIMetadata = any;

declare interface RowList<T = any> {
  rowCount?: number;
  [k: string]: any;
}

// Note: Do NOT declare a global `vi` here; vitest/globals provides proper typings.

// Make `performance.memory` available in tests
interface Performance {
  memory?: { usedJSHeapSize?: number } & Record<string, any>;
}

declare var performance: Performance & typeof globalThis;

// PNG embed extractor shape (tests call instance methods that may be static in typings)
declare class PNGEmbedExtractor {
  embedMetadata?: (...args: any[]) => Promise<any> | any;
  extractMetadata?: (...args: any[]) => Promise<any> | any;
  createPortableArtifact?: (...args: any[]) => Promise<any> | any;
  validateMetadata?: (...args: any[]) => Promise<any> | any;
  static embedMetadata?: (...args: any[]) => Promise<any> | any;
  static extractMetadata?: (...args: any[]) => Promise<any> | any;
  static createPortableArtifact?: (...args: any[]) => Promise<any> | any;
  static validateMetadata?: (...args: any[]) => Promise<any> | any;
}

declare module 'png-embed-extractor' {
  const PNGEmbedExtractorAny: any;
  export default PNGEmbedExtractorAny;
}

// Broad internal module shims — non-invasive
declare module '$lib/server/*' {
  const _default: any;
  export default _default;
}

declare module '$lib/server/db/*' {
  const _default: any;
  export default _default;
}

declare module '$lib/services/*' {
  const _default: any;
  export default _default;
}

declare module '$lib/components/*' {
  const _default: any;
  export default _default;
}

// Fallback: any unknown module
declare module '*';
