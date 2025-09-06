

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Try to import MCP helpers to test for issues
    const { generateMCPPrompt, commonMCPQueries } = await import('$lib/utils/mcp-helpers');
    
    // Test basic MCP query generation
    const testQuery = commonMCPQueries.analyzeSvelteKit();
    const testPrompt = generateMCPPrompt(testQuery);
    
    return json({
      success: true,
      message: 'MCP helpers loaded successfully',
      testQuery,
      testPrompt,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return json({
      success: false,
      error: 'MCP helpers import failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
};