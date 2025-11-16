import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

class LegalAISearchServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'legal-ai-search-server',
        version: '0.1.0',
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
          {
            name: 'web.index_urls',
            description: 'Fetch, parse and index one or more URLs into the web KB.',
            inputSchema: {
              type: 'object',
              properties: {
                urls: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of URLs to index'
                },
                source: {
                  type: 'string',
                  nullable: true,
                  description: 'Optional source identifier'
                }
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
                query: {
                  type: 'string',
                  description: 'Search query'
                },
                topK: {
                  type: 'number',
                  default: 10,
                  description: 'Number of results to return'
                },
                scope: {
                  type: 'string',
                  nullable: true,
                  enum: ['web', 'file'],
                  description: 'Scope to search (web, file, or both)'
                }
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
                root: {
                  type: 'string',
                  description: 'Root directory path to index'
                }
              },
              required: ['root'],
              additionalProperties: false
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
          case 'web.index_urls':
            return await this.handleIndexUrls(args);
          case 'kb.search_web':
            return await this.handleSearchWeb(args);
          case 'kb.index_directory':
            return await this.handleIndexDirectory(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  private async handleIndexUrls(args: any) {
    const { urls, source = 'web' } = args;

    // Call the SvelteKit API endpoint
    const response = await fetch('http://localhost:5173/api/admin/index-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, source })
    });

    if (!response.ok) {
      throw new Error(`Index URLs failed: ${response.status}`);
    }

    const result = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: `Successfully indexed ${urls.length} URLs. ${result.processed || 0} documents processed.`
        }
      ]
    };
  }

  private async handleSearchWeb(args: any) {
    const { query, topK = 10, scope } = args;

    // Call the SvelteKit websearch API
    const response = await fetch('http://localhost:5173/api/websearch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK, scope })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const result = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleIndexDirectory(args: any) {
    const { root } = args;

    // Call the SvelteKit API endpoint
    const response = await fetch('http://localhost:5173/api/admin/index-directory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ root })
    });

    if (!response.ok) {
      throw new Error(`Index directory failed: ${response.status}`);
    }

    const result = await response.json();

    return {
      content: [
        {
          type: 'text',
          text: `Successfully indexed directory ${root}. ${result.processed || 0} files processed.`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Legal AI Search MCP Server running...');
  }
}

// Start the server
const searchServer = new LegalAISearchServer();
searchServer.run().catch(console.error);