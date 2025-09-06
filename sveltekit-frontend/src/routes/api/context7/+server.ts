import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';


// Context7 MCP Server endpoints
const MCP_ENDPOINTS = {
  wrapper: 'http://localhost:4000', // mcp-context7-wrapper.js
  legal: 'http://localhost:4001', // mcp-legal-server.mjs
  extension: 'http://localhost:4002', // VS Code extension MCP
};

// GET /api/context7 - Get Context7 system status
export const GET: RequestHandler = async () => {
  try {
    const healthChecks = [];

    // Check all MCP servers
    for (const [name, endpoint] of Object.entries(MCP_ENDPOINTS)) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // Reduced timeout to 3s

        const response = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Context7-API/1.0'
          }
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;

        healthChecks.push({
          service: name,
          endpoint,
          status: response.ok ? 'healthy' : 'unhealthy',
          response_code: response.status,
          response_time: responseTime,
          last_check: new Date().toISOString()
        });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        let errorType = 'unknown';
        let errorMessage = error?.message || 'Unknown error';

        if (error.name === 'AbortError') {
          errorType = 'timeout';
          errorMessage = 'Health check timeout after 3 seconds';
        } else if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch')) {
          errorType = 'connection_refused';
          errorMessage = 'MCP server not running or unreachable';
        } else if (error.code === 'ENOTFOUND') {
          errorType = 'dns_error';
          errorMessage = 'Cannot resolve MCP server hostname';
        }

        healthChecks.push({
          service: name,
          endpoint,
          status: 'error',
          error_type: errorType,
          error: errorMessage,
          response_time: responseTime,
          last_check: new Date().toISOString()
        });
      }
    }

    // Get orchestrator Context7 integration status
    const orchestratorStatus = databaseOrchestrator.getStatus();

    return json({
      success: true,
      context7_status: {
        mcp_servers: healthChecks,
        healthy_count: healthChecks.filter((h) => h.status === 'healthy').length,
        total_count: healthChecks.length,
        // Provide a derived integration flag (placeholder until real integration flag added)
        orchestrator_integration: (orchestratorStatus as any).context7Integration ?? false,
        overall_status: healthChecks.every((h) => h.status === 'healthy') ? 'healthy' : 'degraded'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// POST /api/context7 - Execute Context7 operations
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, server, tool, data } = await request.json();

    switch (action) {
      case 'analyze_codebase':
        return await callMCPTool('wrapper', 'analyze_codebase', data);
      case 'check_services':
        return await callMCPTool('wrapper', 'check_services', {});
      case 'generate_recommendations':
        return await callMCPTool('wrapper', 'generate_recommendations', data);
      case 'synthesize_evidence':
        return await callMCPTool('legal', 'synthesize_evidence', data);
      case 'legal_rag_query':
        return await callMCPTool('legal', 'legal_rag_query', data);
      case 'get_case_summary':
        return await callMCPTool('legal', 'get_case_summary', data);
      case 'custom_tool':
        if (!server || !tool) {
          return json(
            {
              success: false,
              error: 'Server and tool parameters required for custom tool calls'
            },
            { status: 400 }
          );
        }
        return await callMCPTool(server, tool, data);
      case 'sync_with_orchestrator':
        return await syncWithOrchestrator(data);
      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${action}`
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};

// Helper function to call MCP tools
async function callMCPTool(server: string, tool: string, data: any): Promise<any> {
  try {
    const endpoint = MCP_ENDPOINTS[server as keyof typeof MCP_ENDPOINTS];
    if (!endpoint) {
      throw new Error(`Unknown MCP server: ${server}. Available servers: ${Object.keys(MCP_ENDPOINTS).join(', ')}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for tool calls

    const response = await fetch(`${endpoint}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Context7-API/1.0'
      },
      signal: controller.signal,
      body: JSON.stringify({
        name: tool,
        arguments: data
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`MCP tool call failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
    }

    const result = await response.json();

    // Save the result to database via orchestrator
    await databaseOrchestrator.saveToDatabase(
      {
        mcp_server: server,
        tool_name: tool,
        input_data: data,
        result,
        timestamp: new Date(),
        status: 'completed'
      },
      'mcp_tool_calls'
    );

    return json({
      success: true,
      server,
      tool,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    // Log the error to database
    await databaseOrchestrator.saveToDatabase(
      {
        mcp_server: server,
        tool_name: tool,
        input_data: data,
        error: error.message,
        timestamp: new Date(),
        status: 'failed'
      },
      'mcp_tool_calls'
    );

    throw error;
  }
}

// Sync Context7 results with database orchestrator
async function syncWithOrchestrator(data: any): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout for sync operations

    // Get latest Context7 recommendations
    const recommendationResponse = await fetch(`${MCP_ENDPOINTS.wrapper}/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Context7-API/1.0'
      },
      signal: controller.signal,
      body: JSON.stringify({
        name: 'generate_recommendations',
        arguments: data
      })
    });

    clearTimeout(timeout);

    if (recommendationResponse.ok) {
      const recommendations = await recommendationResponse.json();

      // Process recommendations through orchestrator
      for (const rec of recommendations.result?.recommendations || []) {
        await databaseOrchestrator.saveToDatabase(
          {
            type: 'context7_recommendation',
            content: rec.solution,
            confidence: rec.confidence,
            error_pattern: rec.error,
            source: 'context7_mcp',
            metadata: data,
            created_at: new Date()
          },
          'recommendations'
        );

        // Trigger orchestrator event
        databaseOrchestrator.emit('context7:recommendation_processed', {
          recommendation: rec,
          source_data: data
        });
      }
    }

    const processedCount = Array.isArray((recommendationResponse as any)?.result?.recommendations)
      ? (recommendationResponse as any).result.recommendations.length
      : 0;

    return json({
      success: true,
      message: 'Context7 sync completed',
      processed_recommendations: processedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}