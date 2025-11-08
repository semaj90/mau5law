import type { User } from '$lib/types';

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
  normalize?: boolean;
}

const DEFAULT_DIMENSIONS = 512;

export class EmbeddingService {
  constructor(
    private readonly baseUrl = 'http://localhost:11434',
    private readonly model = 'embeddinggemma:latest',
    private readonly dimensions = DEFAULT_DIMENSIONS
  ) {}

  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    const dimension = options.dimensions ?? this.dimensions;
    const raw = new Array(dimension)
      .fill(0)
      .map((_, index) => Math.sin((text.length + index) * 0.01));
    return options.normalize === false ? raw : this.normalizeVector(raw);
  }

  async generateBatchEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text, options)));
  }

  async generateUserProfileEmbedding(_userId: User['id']): Promise<void> {
    // no-op stub to keep API compatible
  }

  async generateUserPreferenceEmbedding(_userId: User['id']): Promise<void> {
    // no-op stub to keep API compatible
  }

  async generateDocumentEmbedding(
    _content: string,
    _metadata: Record<string, unknown>
  ): Promise<void> {
    // no-op stub to keep API compatible
  }

  async generateCaseEmbedding(_caseId: string, _content: string): Promise<void> {
    // no-op stub to keep API compatible
  }

  cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vectorA.length; i += 1) {
      dot += vectorA[i] * vectorB[i];
      normA += vectorA[i] ** 2;
      normB += vectorB[i] ** 2;
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
  }

  private normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm === 0) return vector;
    return vector.map((value) => value / norm);
  }
}

export const embeddingService = new EmbeddingService();
