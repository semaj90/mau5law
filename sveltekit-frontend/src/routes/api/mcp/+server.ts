
import { McpServer, createMcpServer, McpContext } from '@modelcontextprotocol/sdk/server';
import type { RequestHandler } from '@sveltejs/kit';

const capabilities = {
  'hello-world': {
    capability: {
      type: 'function',
      description: 'A simple hello world function',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name to say hello to',
          },
        },
        required: ['name'],
      },
      returns: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
          },
        },
      },
    },
    handler: async (params: { name: string }) => {
      return { message: `Hello, ${params.name}!` };
    },
  },
};

const mcpServer = createMcpServer({
  capabilities,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getContext(_req: Request, _mcpContext: McpContext) {
    return {};
  },
});

export const GET: RequestHandler = async ({ request }) => {
  return mcpServer.handle(request);
};

export const POST: RequestHandler = async ({ request }) => {
  return mcpServer.handle(request);
};
