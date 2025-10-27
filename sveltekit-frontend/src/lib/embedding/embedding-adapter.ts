// Simple embedding adapter abstraction to enable unit testing & future swaps.
export interface EmbeddingAdapterOptions {
  dimensions?: number;
  deterministic?: boolean; // deterministic mode is useful for repeatable tests
}

export interface EmbeddingResult {
  vector: Float32Array;
  model: string;
  input: string;
}

export class EmbeddingAdapter {
  private readonly dimensions: number;
  private readonly deterministic: boolean;
  private readonly model: string;

  constructor(model = 'mock-embedding-model', opts: EmbeddingAdapterOptions = {}) {
    this.model = model;
    this.dimensions = opts.dimensions ?? 64;
    this.deterministic = Boolean(opts.deterministic);
  }

  async embed(text: string): Promise<EmbeddingResult> {
    if (!text?.trim()) {
      throw new Error('Text required');
    }

    const vector = new Float32Array(this.dimensions);
    if (this.deterministic) {
      const seed = this.createHash(text);
      for (let i = 0; i < this.dimensions; i += 1) {
        const value = Math.sin(seed + i) * 10000;
        vector[i] = value - Math.floor(value);
      }
    } else {
      for (let i = 0; i < this.dimensions; i += 1) {
        vector[i] = Math.random();
      }
    }

    return { vector, model: this.model, input: text };
  }

  private createHash(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return hash;
  }
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vector length mismatch');
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
