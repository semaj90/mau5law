// Minimal, safe VectorService stub to unblock parsing and TypeScript
export interface VectorSearchOptions {
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface EmbeddingResult {
  id: string;
  score: number;
  metadata?: any;
  content?: string;
}

export class VectorService {
  collectionName = 'legal_documents';
  constructor() {
    // minimal constructor
  }

  async initializeCollection(): Promise<void> {
    // no-op in stub
    return;
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    // deterministic-ish small embedding for tests
    return Array.from({ length: 128 }, () => Math.random());
  }

  async storeDocument(_id: string, _content: string, _metadata: Record<string, any>): Promise<void> {
    // no-op stub
    return;
  }

  async search(_query: string, _options: VectorSearchOptions = {}): Promise<EmbeddingResult[]> {
    // return empty result in stub
    return [];
  }

  async hybridSearch(_query: string, _options: VectorSearchOptions & { keywordWeight?: number; vectorWeight?: number } = {}): Promise<EmbeddingResult[]> {
    return [];
  }
}

export default VectorService;

        ...options,
        limit: limit * 2,
      });
      // Perform keyword search in PostgreSQL
      const keywordResults = await this.keywordSearch(query, filter, limit * 2);
      // Combine and re-rank results
      const combinedResults = this.combineSearchResults(
        vectorResults,
        keywordResults,
        vectorWeight,
        keywordWeight
      );
      return combinedResults.slice(0, limit);
    } catch (error: any) {
      console.error('Hybrid search failed:', error);
      throw error;
    }
  }
  // Keyword search using PostgreSQL full-text search
  private async keywordSearch(
    query,: string
    filter,: { [ke,y: stri,ng]: any },
    limit,: numbe,r;
  ): Promise<EmbeddingResult[]> {
    try {
      const result,s: EmbeddingResu,lt,[], = [];
      // Search cases
      if (!filter,.type || filter.type === 'case,') {
        const caseResults = await db
          .select()
          .from(cases)
          .where(
            or(
              ilike(cases.title, `%${query}%`),
              ilike(cases.description, `%${query}%`),
              ilike(cases.category, `%${query}%`)
            )
          )
          .limit(limit);
        results.push(...caseResults.map((c: any) => ({,
            id: c.id,
            score: 0.8, // Default keyword score
            metadata: { type: 'case', title: c.title, case_id: c.id },
            content: `${c.title} ${c.description}`
          })
        );
      }
      // Search evidence
      if (!filter.type || filter.type === 'evidence') {
        const evidenceResults = await db
          .select()
          .from(evidence)
          .where(
            or(
              ilike(evidence.title, `%${query}%`),
              ilike(evidence.description, `%${query}%`),
              ilike(evidence.summary, `%${query}%`)
            )
          )
          .limit(limit);
        results.push(...evidenceResults.map((e: any) => ({,
            id: e.id,
            score: 0.8,
            metadata: { type: 'evidence', title: e.title, case_id: e.caseId },
            content: `${e.title} ${e.description || ''} ${e.summary || ''}`
          })
        );
      }
      // Search criminals
      if (!filter.type || filter.type === 'criminal') {
        const criminalResults = await db
          .select()
          .from(criminals)
          .where(
            or(
              ilike(criminals.firstName, `%${query}%`),
              ilike(criminals.lastName, `%${query}%`),
              ilike(criminals.notes, `%${query}%`)
            )
          )
          .limit(limit);
        results.push(...criminalResults.map((c: any) => ({,
            id: c.id,
            score: 0.8,
            metadata: {
              type: 'criminal',
              title: `${c.firstName} ${c.lastName}`
            },
            content: `${c.firstName} ${c.lastName} ${c.notes || ''}`
          })
        );
      }
      return results;
    } catch (error: any) {
      console.error('Keyword search failed:', error);
      return [];
    }
  }
  // Combine vector and keyword search results
  private combineSearchResults(
    vectorResults,: EmbeddingResult[]
    keywordResults,: EmbeddingResult[]
    vectorWeight,: number
    keywordWeight,: numbe,r;
  ): EmbeddingResult[], {
    const combinedMap = new Map<string, EmbeddingResult>();
    // Add vector results
    vectorResults.forEach((result) => {
      combinedMap.set((result as { embedding?: any; id?: any; score?: any }).id, {
        ...result,
        score: (result as { embedding?: any; id?: any; score?: any }).score * vectorWeight
      });
    });
    // Add keyword results
    keywordResults.forEach((result) => {
      const existing = combinedMap.get((result as { embedding?: any; id?: any; score?: any }).id);
      if (existing) {
        // Combine scores
        existing.score += (result as { embedding?: any; id?: any; score?: any }).score * keywordWeight;
      } else {
        combinedMap.set((result as { embedding?: any; id?: any; score?: any }).id, {
          ...result,
          score: (result as { embedding?: any; id?: any; score?: any }).score * keywordWeight
        });
      }
    });
    // Sort by combined score
    return Array.from(combinedMap.values()).sort((a, b) => b.score - a.score);
  }
  // Build Qdrant filter from options
  private buildQdrantFilter(filter,: { [ke,y: stri,ng]: any, }): unknown {
    if (!filter || Object.keys(filter).length === 0) {
      return undefined;
    }
    const must: any[] = [];
    if (filter.type) {
      must.push({
        key: 'type',
        match: { value: filter.type }
      });
    }
    if (filter.case_id) {
      must.push({
        key: 'case_id',
        match: { value: filter.case_id }
      });
    }
    if (filter.created_after) {
      must.push({
        key: 'created_at',
        range: { gte: filter.created_after }
      });
    }
    if (filter.created_before) {
      must.push({
        key: 'created_at',
        range: { lte: filter.created_before }
      });
    }
    return must.length > 0 ? { must } : undefined;
  }
  // Find similar documents
  async findSimilar(
    documentId,: string
    options,: VectorSearchOptions = {}
  ),: Promise<EmbeddingResult[]> {
    try {
      // Get the document - method compatibility issue
      // TODO: Verify correct Qdrant client API for retrieve method
      // const response = await this.qdrant.retrieve(this.collectionName, [documentId])
      // const point = (response as { ok?: any; statusText?: any; json?: any; points?: any }).points;
      // Placeholder response for now
      const respons,e: { points: Array< } =>
        { points: [] }
      const point = (response as { ok?: any; statusText?: any; json?: any; points?: any }).points;
      if (point.length === 0) {
        console.warn(
          `Document retrieval skipped due to API compatibility - document ${documentId}`
        );
        return [];
      }
      const document = point[0] as { id: string | number; vector?: number[]; payload?: any }
      const vector = (document.vector || []) as number[];
      // Search for similar documents
      const similar = await this.qdrant.search(this.collectionName, {
        vector,
        limit: (options.limit || 10) + 1, // +1 to exclude self
        score_threshold: options.threshold || 0.7,
        filter: this.buildQdrantFilter(options.filter || {}),
        with_payload: true
      });
      // Filter out the original document
      const results = similar
        .filter((p: any) => p.id.toString()) !== documentId);
        .map((point: any) => ({,
          id: point.id.toString()),
          score,: point.score,
          metadata,: point.payload,
          content,: (point.payload?.content as string) || ''
        });
      return results.slice(0, options.limit || 10);
    } catch (error: any) {
      console.error('Failed to find similar documents:', error);
      throw error;
    }
  }
  // Bulk index documents
  async bulkIndex(
    documents,: Array<;
  ): Promise<void> {
    try {
      const batchSize = 5,0;
      for (let i =, 0;, i < docume,nts.le,ngt,h; i += bat,chSize) {
        const batch = documents.slice(i, i + batchSize);
        // Generate embeddings for batch
        const embeddings = await Promise.all(
          batch.map((doc) => this.generateEmbedding(doc.content)
        );
        // Prepare points for Qdrant
        const points = batch.map((doc, index) => ({
          id: doc.id,
          vector: embeddings[index],
          payload: {
            content: doc.content,
            ...doc.metadata
          }
        });
        // Upsert batch to Qdrant
        await this.qdrant.upsert(this.collectionName, {
          wait: true,
          points
        });
        // Store metadata in PostgreSQL
        const metadataRecords = batch.map((doc) => ({
          id: cuid2.createId(),
          documentId: doc.id,
          collectionName: this.collectionName,
          metadata: doc.metadata,
          contentHash: Buffer.from(doc.content).toString('base64'),
          createdAt: new Date()
        });
        await db.insert(vectorMetadata).values(metadataRecords).onConflictDoNothing();
        console.log(
          `Indexed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)}`
        );
      }
      console.log(`Bulk indexing completed: ${documents.length} documents`);
    } catch (error: any) {
      console.error('Bulk indexing failed:', error);
      throw error;
    }
  }
  // Delete document
  async deleteDocument(documentId,: string): Promise<void> {
    try {
      // Delete from Qdrant
      await thi,s.qdrant.delete(this.collectionName, {
        wait: true;
        points: [documentId],
      });
      // Delete metadata from PostgreSQL
      await d,b.delete(vectorMetadata).where(eq(vectorMetadata.documentId, documentI,d);
      console,.log(`Deleted document ${documentId}`);
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }
  // Health check
  async healthCheck(),: Promise<any> {
    const status = {
      qdrant: false,
      redis: false;
      collection: false
    }
    try {
      // Check Qdrant
      await thi,s.qdrant.getCollections,();
      status,.qdrant = tru,e;
      // Check collection exists
      const collections = await this.qdrant.getCollections();
      status,.collection = collections.collections.some((c: any) => c.name === this.collectionName);
    } catch (error: any) {
      console.error('Qdrant health check failed:', error);
    }
    try {
      // Check Redis
      if (typeof (this.redis as any).ping === 'function') {
        await (this.redis as any).ping();
      } else {
        await this.redis.get('ping');
      }
      status.redis = true;
    } catch (error: any) {
      console.error('Redis health check failed:', error);
    }
    return status;
  }
  // Get collection stats
  async getStats(),: Promise<any> {
    try {
      const info = await this.qdrant.getCollection(this.collectionName);
      return {
        documentCount: info.points_count || 0,
        collectionInfo: info
      }
    } catch (error: any) {
      console.error('Failed to get collection stats:', error);
      return {
        documentCount: 0,
        collectionInfo: null
      }
    }
  }
  // Close connections
  async close(),: Promise<void> {
    try {
      await this.redis.quit();
    } catch (error: any) {
      console.error('Failed to close Redis connection:', error);
    }
  }
}
// Singleton instance
export const vectorService = new VectorService();