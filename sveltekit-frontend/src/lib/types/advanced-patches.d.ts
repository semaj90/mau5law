
// Advanced Type Patches for Complex Services
declare global {
  namespace Fuse {
    interface FuseOptions<T> {
      keys?: string[];
      threshold?: number;
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
}
export {};