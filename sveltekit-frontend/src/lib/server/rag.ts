/**
 * RAG (Retrieval-Augmented Generation) Service
 * Combines vector search with LLM generation for enhanced responses
 */
import { OllamaService } from './ollama';
import { EmbeddingService } from './embeddings';

export class RAGService {
  private ollamaService: OllamaService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.ollamaService = new OllamaService();
    this.embeddingService = new EmbeddingService();
  }

  async search(params: {
    query: string;
    caseId?: string;
    userId: string;
    limit?: number;
  }): Promise<any[]> {
    const { query, caseId, userId, limit = 10 } = params;

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Search for similar content (placeholder)
    const similarContent = await this.embeddingService.searchSimilar(queryEmbedding, limit);

    return similarContent;
  }

  async chat(params: {
    message: string;
    sessionId?: string;
    caseId?: string;
    userId: string;
  }): Promise<string> {
    const { message, sessionId, caseId, userId } = params;

    // Get relevant context through vector search
    const searchResults = await this.search({
      query: message,
      caseId,
      userId,
      limit: 5,
    });

    // Extract context from search results
    const context = searchResults.map((result: any) => result.content || result.text);

    // Generate response with context
    const response = await this.ollamaService.chat(message, context);

    return response;
  }
}