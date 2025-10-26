import { QdrantClient } from '@qdrant/js-client-rest';
// TODO: Integrate QdrantService with Context7 audit/agent pipeline
// - Use this service for vector search in semantic_search-driven audit
// - Expose helper to fetch similar legal documents for audit/agent flows
// - After audit, log Qdrant search results to todo log and trigger agent actions as needed
/**
 * Example: Fetch similar documents for audit/agent pipeline
 * Usage: const similar = await qdrantService.findSimilarForAudit(vector, 5);
 */
/**
 * Find similar documents and log results for audit/agent pipeline.
 * Optionally triggers agent actions if similar docs found.
 */
export async function findSimilarForAudit(vector: number[], limit = 5, triggerAgent = false): Promise<any> {
  const similar = await qdrantService.searchSimilar(vector, limit);
  // Log results to console (replace with file/db logging as needed)
  console.log('[Qdrant Audit] Similar documents:', similar);
  // TODO: Write to phase10-todo.log or DB
  if (triggerAgent && similar.length > 0) {
    // Example: trigger agent action for each similar doc (stub)
    for (const doc of similar) {
      // TODO: Replace with real agent trigger (CrewAI/Autogen, Context7)
      console.log(`[Agent Trigger] Would trigger agent for doc: ${doc.id}`);
    }
  }
  return similar;
}
// TODO: After initial test, connect this to /api/audit/semantic and agent integration for live pipeline validation
// Qdrant Service for Legal Document Vector Operations
export interface LegalDocumentMetadata {
  documentId: string;
  filename: string;
  documentType: string;
  uploadedBy: string;
  uploadedAt: Date | string;
  jurisdiction?: string;
  practiceArea?: string;
  classification?: {
    documentType: string;
    practiceArea: string;
    jurisdiction: string;
    confidentialityLevel: string;
    tags: string[];
  };
  extractedData?: {
    parties?: string[];
    dates?: string[];
    amounts?: string[];
    legalCitations?: string[];
    keyTerms?: string[];
  };
  fileMetadata: {
    size: number;
    mimeType: string;
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
  [key: string]: unknown;
}
export interface QdrantServiceConfig {
  url: string;
  collectionName: string;
  vectorSize: number;
  apiKey?: string;
}

// New: move helper types to top-level (cannot declare `type` inside a class)
export type PointInsert = {
  id?: string | number;
  vector: number[];
  payload?: LegalDocumentMetadata | Record<string, unknown>;
};
export type SearchItem = {
  id: string | number;
  score?: number;
  payload?: LegalDocumentMetadata | Record<string, unknown>;
};

export class QdrantService {
  private client: InstanceType<typeof QdrantClient>;
  private collectionName: string;
  private vectorSize: number;
  constructor(config: QdrantServiceConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName;
    this.vectorSize = config.vectorSize;
  }

  async ensureCollection(): Promise<void> {
    try {
      // Use collectionsApi.getCollection - returns metadata if exists
      await (this.client as any).collectionsApi.getCollection({ collection_name: this.collectionName });
    } catch (err: unknown) {
      // If not found, create it
      // Note: the client throws on 404, so create if error.
      try {
        await (this.client as any).collectionsApi.createCollection({
          collection_name: this.collectionName,
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        } as any);
      } catch (createErr: unknown) {
        // rethrow for upstream handling
        throw createErr;
      }
    }
  }

  async upsertPoints(points: PointInsert[]): Promise<void> {
    await this.ensureCollection();
    // Use pointsApi.upsert
    await (this.client as any).pointsApi.upsert({
      collection_name: this.collectionName,
      wait: true,
      points,
    } as any);
  }

  async searchSimilar(vector: number[], limit: number = 10, filter?: Record<string, unknown>): Promise<SearchItem[]> {
    await this.ensureCollection();
    const resp = await (this.client as any).pointsApi.search({
      collection_name: this.collectionName,
      vector,
      limit,
      with_payload: true,
      filter,
      score_threshold: 0.5,
    } as any);

    // response shapes may vary by client version; prefer resp.result or resp as array
    const hits = (resp as any).result ?? (resp as any);
    return (Array.isArray(hits) ? hits : []).map((item: any) => ({
      id: item.id,
      score: item.score,
      payload: item.payload as LegalDocumentMetadata | Record<string, unknown>,
    }));
  }

  async deletePoints(ids: Array<string | number>): Promise<void> {
    // Use pointsApi.delete; some clients expect delete method under pointsApi
    await (this.client as any).pointsApi.delete({
      collection_name: this.collectionName,
      wait: true,
      points: ids,
    } as any);
  }

  async getCollectionInfo() {
    try {
      const info = await (this.client as any).collectionsApi.getCollection({ collection_name: this.collectionName });
      return info;
    } catch (err: unknown) {
      return null;
    }
  }
}
// Export singleton instance
export const qdrantService = new QdrantService({
  url: import.meta.env.QDRANT_URL || 'http://localhost:6333',
  collectionName: 'legal_documents',
  vectorSize: 768,
  apiKey: import.meta.env.QDRANT_API_KEY,
});
  apiKey: import.meta.env.QDRANT_API_KEY,
});
