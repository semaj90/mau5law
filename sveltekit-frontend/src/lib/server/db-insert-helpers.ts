export interface EmbeddingInsertInput {
  documentId?: string;
  content: string;
  embedding: number[] | string;
  metadata?: unknown;
  model?: string;
  createdAt?: Date;
}

export function prepareEmbeddingInsert(input: EmbeddingInsertInput) {
  return {
    documentId: input.documentId,
    content: input.content,
    embedding: Array.isArray(input.embedding) ? JSON.stringify(input.embedding) : input.embedding,
    metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    model: input.model || 'nomic-embed-text',
    createdAt: input.createdAt || new Date(),
  } as any;
}

export interface SearchSessionInsertInput {
  query: string;
  results?: unknown;
  searchType?: string;
  queryEmbedding?: number[];
  resultCount?: number;
}

export function prepareSearchSessionInsert(input: SearchSessionInsertInput) {
  return {
    query: input.query,
    results: input.results ? JSON.stringify(input.results) : null,
    searchType: input.searchType || 'hybrid',
    queryEmbedding: input.queryEmbedding ? JSON.stringify(input.queryEmbedding) : null,
    resultCount: input.resultCount ?? (Array.isArray(input.results) ? input.results.length : null),
    createdAt: new Date(),
  } as any;
}
