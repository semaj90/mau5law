// Low-risk ambient shims for triage: narrow, permissive declarations
// These intentionally use `any` to reduce repetitive type noise while we iteratively
// stabilize the codebase. Remove or replace with precise types later.

declare global {
  // Common row-list shape used across DB helpers
  type LegalAIMetadata = any;

  interface RowList<T = any> {
    rows?: T[];
    rowCount?: number;
    [k: string]: any;
  }

  // Some environments reference performance.memory; make it optional
  interface Performance {
    memory?: { usedJSHeapSize?: number } | undefined;
  }

  // Vitest/Jest-style test runtime global used in tests
  const vi: any;
}

// Some internal modules are not typed precisely during triage — provide permissive
// module declarations to avoid TS2305/TS2576 cascading errors.
declare module '$lib/server/db/enhanced-operations' {
  export const CaseOperations: any;
  const _default: any;
  export default _default;
}

// PNG embed extractor used by tests — provide permissive instance/static members
declare class PNGEmbedExtractor {
  embedMetadata(...args: any[]): Promise<any>;
  extractMetadata(...args: any[]): Promise<any>;
  createPortableArtifact(...args: any[]): Promise<any>;
  validateMetadata(...args: any[]): Promise<any>;
  static embedMetadata(...args: any[]): Promise<any>;
  static extractMetadata(...args: any[]): Promise<any>;
  static createPortableArtifact(...args: any[]): Promise<any>;
  static validateMetadata(...args: any[]): Promise<any>;
}

declare module 'png-embed-extractor' {
  export = PNGEmbedExtractor;
}

export {};
