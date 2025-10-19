// Advanced Type Patches for Complex Services
declare global {
  namespace Fuse {
    interface FuseOptions<T> {
      keys?: (string | { name: string; weight: number })[];
      threshold?: number;
      includeScore?: boolean;
      distance?: number;
      minMatchCharLength?: number;
      isCaseSensitive?: boolean;
      includeMatches?: boolean;
      findAllMatches?: boolean;
      location?: number;
      useExtendedSearch?: boolean;
      ignoreLocation?: boolean;
      ignoreFieldNorm?: boolean;
      fieldNormWeight?: number;
    }
  }
  interface BufferLike {
    byteLength: number;
    length?: number;
  }
  namespace Asset3DSearchResult {
    interface Result {
      id: string;
      score: number;
    }
  }
  namespace HybridRAGResult {
    interface Result {
      content: string;
      score: number;
    }
  }
  namespace ChatRequest {
    interface Request {
      messages: any[];
      stream?: boolean;
    }
  }
  namespace ChatResponse {
    interface Response {
      message: string;
      done: boolean;
    }
  }
  interface GPUSearchMetrics {
    searchTime: number;
    resultCount: number;
  }
  namespace PipelineSearchResult {
    interface Result {
      id: string;
      score: number;
      snippet: string;
      source: string;
    }
  }
}
export {};
