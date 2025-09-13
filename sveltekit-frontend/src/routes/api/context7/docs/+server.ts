import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Context7 Documentation RAG API endpoint
// Integrates with Go RAG pipeline and Gemma embeddings

const CONTEXT7_MCP_ENDPOINT = 'http://localhost:4000';
const GO_RAG_QUERY_SERVER = 'http://localhost:8090';
const ENHANCED_RAG_SERVICE = 'http://localhost:8080';

interface DocFetchRequest {
  action: 'fetch' | 'search' | 'list';
  library?: string;
  topic?: string;
  query?: string;
  limit?: number;
  useEnhancedRAG?: boolean;
}

interface SearchRequest {
  query: string;
  library?: string;
  topic?: string;
  limit?: number;
  threshold?: number;
}

// GET /api/context7/docs - List available documentation
export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'list';
    
    if (action === 'libraries') {
      // Get list of available libraries from Go RAG server
      const response = await fetch(`${GO_RAG_QUERY_SERVER}/api/rag/libraries`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch libraries');
      }
      
      const libraries = await response.json();
      
      return json({
        success: true,
        libraries,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'topics') {
      const library = url.searchParams.get('library');
      
      // Get topics for a specific library
      const topicsUrl = library 
        ? `${GO_RAG_QUERY_SERVER}/api/rag/topics?library=${library}`
        : `${GO_RAG_QUERY_SERVER}/api/rag/topics`;
      
      const response = await fetch(topicsUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch topics');
      }
      
      const topics = await response.json();
      
      return json({
        success: true,
        topics,
        library,
        timestamp: new Date().toISOString()
      });
    }
    
    // Default: Get health status
    const healthResponse = await fetch(`${GO_RAG_QUERY_SERVER}/health`);
    const health = await healthResponse.json();
    
    return json({
      success: true,
      service: 'Context7 Documentation RAG',
      health,
      endpoints: {
        fetch: 'POST /api/context7/docs - Fetch documentation from Context7',
        search: 'POST /api/context7/docs?action=search - Search documentation',
        libraries: 'GET /api/context7/docs?action=libraries - List libraries',
        topics: 'GET /api/context7/docs?action=topics - List topics'
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

// POST /api/context7/docs - Fetch or search documentation
export const POST: RequestHandler = async ({ request }) => {
  try {
    const req: DocFetchRequest = await request.json();
    
    switch (req.action) {
      case 'fetch':
        return await fetchDocumentation(req);
      
      case 'search':
        return await searchDocumentation(req);
      
      case 'list':
        return await listDocumentation();
      
      default:
        return json(
          {
            success: false,
            error: `Unknown action: ${req.action}`
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

// Fetch documentation from Context7 MCP server
async function fetchDocumentation(req: DocFetchRequest): Promise<Response> {
  try {
    const libraries = [
      { id: 'typescript', name: 'TypeScript' },
      { id: 'webgpu', name: 'WebGPU' },
      { id: 'postgresql', name: 'PostgreSQL 17' },
      { id: 'drizzle-orm', name: 'Drizzle ORM' }
    ];
    
    const results = [];
    
    for (const library of libraries) {
      if (req.library && library.id !== req.library) {
        continue;
      }
      
      // Fetch from Context7 MCP server
      const response = await fetch(`${CONTEXT7_MCP_ENDPOINT}/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: 'get_library_docs',
          arguments: {
            context7CompatibleLibraryID: library.id,
            topic: req.topic,
            tokens: 15000,
            format: 'markdown'
          }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.result) {
          results.push({
            library: library.name,
            library_id: library.id,
            topic: req.topic,
            content: result.result.content,
            metadata: result.result.metadata,
            snippets: result.result.snippets
          });
        }
      }
    }
    
    return json({
      success: true,
      action: 'fetch',
      results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    throw error;
  }
}

// Search documentation using Go RAG server with Gemma embeddings
async function searchDocumentation(req: DocFetchRequest): Promise<Response> {
  try {
    if (!req.query) {
      return json(
        {
          success: false,
          error: 'Query parameter is required for search'
        },
        { status: 400 }
      );
    }
    
    let searchEndpoint = `${GO_RAG_QUERY_SERVER}/api/rag/search`;
    
    // Use Enhanced RAG service if requested
    if (req.useEnhancedRAG) {
      searchEndpoint = `${ENHANCED_RAG_SERVICE}/api/rag/query`;
    }
    
    const searchRequest: SearchRequest = {
      query: req.query,
      library: req.library,
      topic: req.topic,
      limit: req.limit || 10,
      threshold: 0.7
    };
    
    const response = await fetch(searchEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(searchRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    const searchResults = await response.json();
    
    // If using Enhanced RAG, also get memory context
    let memoryContext = null;
    if (req.useEnhancedRAG) {
      try {
        const memoryResponse = await fetch(`${ENHANCED_RAG_SERVICE}/api/rag/memory/default`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (memoryResponse.ok) {
          memoryContext = await memoryResponse.json();
        }
      } catch (memError) {
        console.error('Failed to fetch memory context:', memError);
      }
    }
    
    return json({
      success: true,
      action: 'search',
      query: req.query,
      results: searchResults.results || searchResults,
      count: searchResults.count || searchResults.length,
      memory_context: memoryContext,
      service: req.useEnhancedRAG ? 'enhanced-rag' : 'go-rag',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    throw error;
  }
}

// List all available documentation
async function listDocumentation(): Promise<Response> {
  try {
    // Get libraries list
    const librariesResponse = await fetch(`${GO_RAG_QUERY_SERVER}/api/rag/libraries`);
    const libraries = librariesResponse.ok ? await librariesResponse.json() : [];
    
    // Get topics list
    const topicsResponse = await fetch(`${GO_RAG_QUERY_SERVER}/api/rag/topics`);
    const topics = topicsResponse.ok ? await topicsResponse.json() : [];
    
    // Get health status
    const healthResponse = await fetch(`${GO_RAG_QUERY_SERVER}/health`);
    const health = healthResponse.ok ? await healthResponse.json() : { status: 'unknown' };
    
    return json({
      success: true,
      action: 'list',
      libraries,
      topics,
      health,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    throw error;
  }
}