import { OllamaService } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/server/ollama';

export class EmbeddingService {
  async createEmbedding(text: string) {
    const ollama = new OllamaService();
    const res = await ollama.generateEmbedding(text);
    return res;
  }
}
