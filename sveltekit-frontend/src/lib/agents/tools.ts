/**
 * Phase 13: Agentic Tool Calling - Tool Registry
 * Implements 5 core tools for agent orchestration
 */

import type { ToolCall, ToolResult, RagLookupResult, WebCrawlResult, WebDocSummaryResult } from './types';
import { generateEmbedding } from '$lib/ai/ollama-config';
import {
  ToolErrorHandler,
  withRetry,
  withTimeout,
  validateNonEmpty,
  validateUrl,
  logError
} from './error-handler';

/**
 * Redis cache client for tool results
 * PHASE13: Redis integration for caching RAG results
 */
class RedisCache {
  private endpoint: string;

  constructor() {
    this.endpoint = process.env.REDIS_ENDPOINT ?? 'http://localhost:6379';
  }

  async get(key: string): Promise<any | null> {
    try {
      // Redis HTTP interface (if available) or fallback
      const response = await fetch(`${this.endpoint}/get/${key}`, {
        method: 'GET'
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.value ?? null;
    } catch (error) {
      console.warn('Redis cache get failed:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 43200): Promise<boolean> {
    try {
      // Redis HTTP interface (if available) or fallback
      const response = await fetch(`${this.endpoint}/set/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, ttl })
      });

      return response.ok;
    } catch (error) {
      console.warn('Redis cache set failed:', error);
      return false;
    }
  }
}

const redisCache = new RedisCache();

/**
 * Tool registry mapping tool names to implementations
 */
export const toolRegistry: Record<string, (args: any) => Promise<any>> = {
  /**
   * RAG Lookup: Query knowledge base using vector similarity search
   * PHASE13: Implements vector similarity search with Redis caching and error recovery
   */
  rag_lookup: async (args: { query: string; topK?: number }) => {
    const { query, topK = 5 } = args;

    try {
      // Validate input
      validateNonEmpty(query, 'Query');

      // Check Redis cache first
      const cacheKey = `rag:${query}:${topK}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log(`RAG cache hit for query: "${query}"`);
        return cached as RagLookupResult;
      }

      // Generate embedding for query with retry
      const embedding = await withRetry(
        () => generateEmbedding(query),
        'RAG embedding generation',
        2
      );

      // Query Qdrant for similar memories with timeout
      const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';
      const collection = process.env.QDRANT_COLLECTION ?? 'codemod_memories';

      const response = await withTimeout(
        () =>
          fetch(`${qdrantUrl}/collections/${collection}/points/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vector: embedding,
              limit: topK,
              with_payload: true
            })
          }),
        5000,
        'Qdrant search'
      );

      if (!response.ok) {
        throw ToolErrorHandler.handleResponseError(
          response.status,
          response.statusText,
          'Qdrant search'
        );
      }

      const data = await response.json();
      const matches = data.result?.map((item: any) => ({
        score: item.score,
        ...item.payload
      })) ?? [];

      const result: RagLookupResult = {
        summary: `Retrieved ${matches.length} similar memories for query: "${query}"`,
        matches
      };

      // Cache the result (12 hour TTL)
      await redisCache.set(cacheKey, result, 43200);

      return result;
    } catch (error) {
      const toolError = ToolErrorHandler.handleExecutionError(error, 'RAG lookup');
      logError(toolError, 'rag_lookup');

      return {
        summary: `Error during RAG lookup: ${ToolErrorHandler.formatErrorMessage(toolError)}`,
        matches: []
      } as RagLookupResult;
    }
  },

  /**
   * Web Crawl: Fetch and parse web pages
   * PHASE13: Implements web page fetching with link extraction and error recovery
   * NOTE: depth parameter reserved for future multi-level crawling implementation
   */
  web_crawl: async (args: { url: string; depth?: number; maxLinks?: number }) => {
    const { url, maxLinks = 5 } = args;
    // depth parameter reserved for future implementation of recursive crawling

    try {
      // Validate URL format
      validateUrl(url);

      // Check cache first
      const cacheKey = `crawl:${url}:${maxLinks}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log(`Web crawl cache hit for URL: "${url}"`);
        return cached as WebCrawlResult;
      }

      // Fetch with timeout and retry
      const response = await withRetry(
        () =>
          withTimeout(
            () =>
              fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; LegalAI/1.0)'
                }
              }),
            10000,
            'Web crawl fetch'
          ),
        'Web crawl',
        2
      );

      if (!response.ok) {
        throw ToolErrorHandler.handleResponseError(
          response.status,
          response.statusText,
          'Web crawl'
        );
      }

      const text = await response.text();

      // Extract links from HTML
      const linkRegex = /href=["']([^"']+)["']/g;
      const links: string[] = [];
      let match;

      while ((match = linkRegex.exec(text)) !== null && links.length < maxLinks) {
        const link = match[1];
        if (link.startsWith('http')) {
          links.push(link);
        }
      }

      const result: WebCrawlResult = {
        url,
        status: response.status,
        text: text.substring(0, 5000), // Limit text size
        links
      };

      // Cache the result (7 day TTL)
      await redisCache.set(cacheKey, result, 604800);

      return result;
    } catch (error) {
      const toolError = ToolErrorHandler.handleExecutionError(error, 'Web crawl');
      logError(toolError, 'web_crawl');

      return {
        url,
        status: 0,
        text: `Error: ${ToolErrorHandler.formatErrorMessage(toolError)}`,
        links: []
      } as WebCrawlResult;
    }
  },

  /**
   * Web Document Summary: Summarize web documentation
   * PHASE13: Implements documentation summarization with Ollama integration and error recovery
   */
  web_doc_summary: async (args: { url: string; topic?: string }) => {
    const { url, topic = 'SvelteKit/TypeScript codemods' } = args;

    try {
      // Validate URL format
      validateUrl(url);

      // Check cache first
      const cacheKey = `summary:${url}:${topic}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log(`Web doc summary cache hit for URL: "${url}"`);
        return cached as WebDocSummaryResult;
      }

      // Fetch the document with timeout and retry
      const response = await withRetry(
        () =>
          withTimeout(
            () => fetch(url),
            10000,
            'Web doc fetch'
          ),
        'Web doc fetch',
        2
      );

      if (!response.ok) {
        throw ToolErrorHandler.handleResponseError(
          response.status,
          response.statusText,
          'Web doc fetch'
        );
      }

      const text = await response.text();

      // Call Ollama to summarize with retry
      const ollamaEndpoint = process.env.OLLAMA_ENDPOINT ?? 'http://localhost:11434';
      const model = process.env.OLLAMA_MODEL ?? 'gemma3-legal:latest';

      const summaryResponse = await withRetry(
        () =>
          withTimeout(
            () =>
              fetch(`${ollamaEndpoint}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model,
                  prompt: `Summarize the following documentation for ${topic}:\n\n${text.substring(0, 2000)}\n\nProvide a concise summary in markdown format.`,
                  stream: false
                })
              }),
            15000,
            'Ollama summarization'
          ),
        'Ollama summarization',
        2
      );

      if (!summaryResponse.ok) {
        throw ToolErrorHandler.handleResponseError(
          summaryResponse.status,
          summaryResponse.statusText,
          'Ollama summarization'
        );
      }

      const summaryData = await summaryResponse.json();

      const result: WebDocSummaryResult = {
        url,
        topic,
        summary: summaryData.response ?? 'No summary generated'
      };

      // Cache the result (30 day TTL)
      await redisCache.set(cacheKey, result, 2592000);

      return result;
    } catch (error) {
      const toolError = ToolErrorHandler.handleExecutionError(error, 'Web doc summary');
      logError(toolError, 'web_doc_summary');

      return {
        url,
        topic,
        summary: `Error: ${ToolErrorHandler.formatErrorMessage(toolError)}`
      } as WebDocSummaryResult;
    }
  },

  /**
   * Web Search: Search the web (stub - ready for integration)
   * PHASE13: Stub implementation ready for search API integration
   * TODO: Integrate with Google/Bing/DuckDuckGo API
   * IMPLEMENT: Add API key configuration and search result parsing
   */
  web_search: async (args: { query: string }) => {
    const { query } = args;

    try {
      // Validate query
      validateNonEmpty(query, 'Search query');

      // Check cache first
      const cacheKey = `search:${query}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log(`Web search cache hit for query: "${query}"`);
        return cached;
      }

      // Check if search API is configured
      const searchApiKey = process.env.SEARCH_API_KEY;
      const searchApiEndpoint = process.env.SEARCH_API_ENDPOINT;

      if (!searchApiKey || !searchApiEndpoint) {
        console.warn('Web search API not configured, returning stub response');
        return {
          query,
          results: [],
          status: 'stub',
          message: 'Web search API integration pending. Configure SEARCH_API_KEY and SEARCH_API_ENDPOINT in environment.'
        };
      }

      // TODO: Implement actual search API integration
      // This is a placeholder for future integration with Google/Bing/DuckDuckGo API
      console.log(`Web search stub called for query: "${query}"`);

      const result = {
        query,
        results: [
          {
            title: 'Search API Integration Pending',
            url: 'https://example.com',
            snippet: 'Web search tool is ready for integration with Google/Bing/DuckDuckGo API'
          }
        ],
        status: 'stub',
        message: 'Web search API integration pending.'
      };

      // Cache the result (1 day TTL)
      await redisCache.set(cacheKey, result, 86400);

      return result;
    } catch (error) {
      const toolError = ToolErrorHandler.handleExecutionError(error, 'Web search');
      logError(toolError, 'web_search');

      return {
        query: args.query,
        results: [],
        status: 'error',
        message: `Error: ${ToolErrorHandler.formatErrorMessage(toolError)}`
      };
    }
  },

  /**
   * Code Search: Search codebase (stub - ready for Go service integration)
   * PHASE13: Stub implementation ready for Go microservice integration
   * TODO: Integrate with Go code search microservice
   * IMPLEMENT: Add Go service endpoint configuration and result parsing
   */
  code_search: async (args: { pattern: string; path?: string }) => {
    const { pattern, path = '.' } = args;

    try {
      // Validate pattern
      validateNonEmpty(pattern, 'Search pattern');

      // Check cache first
      const cacheKey = `code:${pattern}:${path}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        console.log(`Code search cache hit for pattern: "${pattern}"`);
        return cached;
      }

      // Check if code search service is configured
      const codeSearchEndpoint = process.env.CODE_SEARCH_ENDPOINT;

      if (!codeSearchEndpoint) {
        console.warn('Code search service not configured, returning stub response');
        return {
          pattern,
          path,
          matches: [],
          status: 'stub',
          message: 'Code search Go service integration pending. Configure CODE_SEARCH_ENDPOINT in environment.'
        };
      }

      // TODO: Implement actual Go service integration
      // This is a placeholder for future integration with Go code search microservice
      console.log(`Code search stub called for pattern: "${pattern}" in path: "${path}"`);

      const result = {
        pattern,
        path,
        matches: [
          {
            file: 'example.ts',
            line: 1,
            content: 'Code search tool is ready for integration with Go microservice'
          }
        ],
        status: 'stub',
        message: 'Code search Go service integration pending.'
      };

      // Cache the result (1 day TTL)
      await redisCache.set(cacheKey, result, 86400);

      return result;
    } catch (error) {
      const toolError = ToolErrorHandler.handleExecutionError(error, 'Code search');
      logError(toolError, 'code_search');

      return {
        pattern: args.pattern,
        path: args.path ?? '.',
        matches: [],
        status: 'error',
        message: `Error: ${ToolErrorHandler.formatErrorMessage(toolError)}`
      };
    }
  }
};

/**
 * Execute a tool call
 */
export async function executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
  const tool = toolRegistry[toolCall.tool];

  if (!tool) {
    return {
      tool: toolCall.tool,
      arguments: toolCall.arguments,
      error: `Unknown tool: ${toolCall.tool}`,
      status: 'error'
    };
  }

  try {
    const result = await tool(toolCall.arguments);
    return {
      tool: toolCall.tool,
      arguments: toolCall.arguments,
      result,
      status: 'success'
    };
  } catch (error) {
    return {
      tool: toolCall.tool,
      arguments: toolCall.arguments,
      error: error instanceof Error ? error.message : String(error),
      status: 'error'
    };
  }
}

/**
 * Get list of available tools
 */
export function getAvailableTools() {
  return Object.keys(toolRegistry).map((name) => ({
    name,
    description: getToolDescription(name)
  }));
}

/**
 * Get tool description
 */
function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    rag_lookup: 'Query knowledge base using vector similarity search',
    web_crawl: 'Fetch and parse web pages with optional shallow crawling',
    web_doc_summary: 'Summarize web documentation into README-ready markdown',
    web_search: 'Search the web (ready for API integration)',
    code_search: 'Search codebase using ripgrep patterns (ready for Go service integration)'
  };

  return descriptions[toolName] ?? 'Unknown tool';
}
