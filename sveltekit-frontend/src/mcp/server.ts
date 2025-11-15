import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { mcpTools } from '../mcp/index.js';

class YoRhaLegalMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'yorha-legal-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // RAG Tools
          {
            name: 'rag_web_search',
            description: 'Search indexed web pages using vector similarity',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                topK: { type: 'number', description: 'Number of results to return', default: 10 },
                scope: { type: 'string', description: 'Search scope (web, file, minio)', default: 'web' },
                threshold: { type: 'number', description: 'Similarity threshold', default: 0.1 }
              },
              required: ['query']
            }
          },
          {
            name: 'rag_index_web_page',
            description: 'Index a web page for search',
            inputSchema: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'URL to index' }
              },
              required: ['url']
            }
          },
          {
            name: 'rag_index_directory',
            description: 'Index all text files in a directory',
            inputSchema: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'Directory path to index' }
              },
              required: ['path']
            }
          },
          {
            name: 'rag_sync_minio',
            description: 'Sync and index documents from MinIO storage',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'rag_cache_stats',
            description: 'Get LangCache statistics',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'rag_clear_cache',
            description: 'Clear LangCache for a scope',
            inputSchema: {
              type: 'object',
              properties: {
                scope: { type: 'string', description: 'Cache scope to clear' }
              }
            }
          },
          // Web & Directory KB Tools
          {
            name: 'web.index_urls',
            description: 'Fetch, parse and index one or more URLs into the web KB.',
            inputSchema: {
              type: 'object',
              properties: {
                urls: { type: 'array', items: { type: 'string' } },
                source: { type: 'string', nullable: true }
              },
              required: ['urls'],
              additionalProperties: false
            }
          },
          {
            name: 'kb.search_web',
            description: 'Search the combined web/file KB using embeddings (embeddinggemma:latest) and cosine similarity.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                topK: { type: 'number', default: 10 },
                scope: { type: 'string', nullable: true } // e.g., 'web' | 'file'
              },
              required: ['query'],
              additionalProperties: false
            }
          },
          {
            name: 'kb.index_directory',
            description: 'Walks a filesystem directory, indexes text files into the KB, and embeds them with embeddinggemma:latest.',
            inputSchema: {
              type: 'object',
              properties: {
                root: { type: 'string' }
              },
              required: ['root'],
              additionalProperties: false
            }
          },
          {
            name: 'evidence_load',
            description: 'Load evidence for cases',
            inputSchema: {
              type: 'object',
              properties: {
                caseId: { type: 'string' },
                limit: { type: 'number', default: 10 },
                query: { type: 'string' }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'rag_web_search':
            const searchResult = await mcpTools.rag.webSearch(
              args.query,
              {
                topK: args.topK,
                scope: args.scope,
                threshold: args.threshold
              }
            );
            return {
              content: [{ type: 'text', text: JSON.stringify(searchResult, null, 2) }]
            };

          case 'rag_index_web_page':
            const indexResult = await mcpTools.rag.indexWebPage(args.url);
            return {
              content: [{ type: 'text', text: JSON.stringify(indexResult, null, 2) }]
            };

          case 'rag_index_directory':
            const dirResult = await mcpTools.rag.indexDirectory(args.path);
            return {
              content: [{ type: 'text', text: JSON.stringify(dirResult, null, 2) }]
            };

          case 'rag_sync_minio':
            const syncResult = await mcpTools.rag.syncMinIO();
            return {
              content: [{ type: 'text', text: JSON.stringify(syncResult, null, 2) }]
            };

          case 'rag_cache_stats':
            const statsResult = await mcpTools.rag.getLangCacheStats();
            return {
              content: [{ type: 'text', text: JSON.stringify(statsResult, null, 2) }]
            };

          case 'rag_clear_cache':
            const clearResult = await mcpTools.rag.clearLangCache(args.scope);
            return {
              content: [{ type: 'text', text: JSON.stringify(clearResult, null, 2) }]
            };

          case 'cases_load':
            const casesResult = await mcpTools.cases.loadCases(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(casesResult, null, 2) }]
            };

          case 'evidence_load':
            const evidenceResult = await mcpTools.evidence.loadEvidence(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(evidenceResult, null, 2) }]
            };

          case 'web.index_urls':
            try {
              const indexResult = await fetch('http://localhost:5173/api/admin/index-web', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: args.urls, source: args.source })
              });
              const result = await indexResult.json();
              return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Error indexing URLs: ${error.message}` }],
                isError: true
              };
            }

          case 'kb.search_web':
            try {
              const searchResult = await fetch('http://localhost:5173/api/websearch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: args.query, topK: args.topK, scope: args.scope })
              });
              const result = await searchResult.json();
              return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Error searching KB: ${error.message}` }],
                isError: true
              };
            }

          case 'kb.index_directory':
            try {
              const dirResult = await fetch('http://localhost:5173/api/admin/index-directory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ root: args.root })
              });
              const result = await dirResult.json();
              return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
              };
            } catch (error) {
              return {
                content: [{ type: 'text', text: `Error indexing directory: ${error.message}` }],
                isError: true
              };
            }
        }
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('YoRHa Legal MCP Server started');
  }
}

// Start the server
const server = new YoRhaLegalMCPServer();
server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});