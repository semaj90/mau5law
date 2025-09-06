import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, fetch }) => {
  try {
    // Define API endpoints for testing
    const apiEndpoints = [
      {
        id: 'system-status',
        name: 'System Status',
        url: '/api/yorha/system/status',
        method: 'GET',
        type: 'yorha-api',
        description: 'Get real-time system health and metrics',
        headers: {},
        body: null
      },
      {
        id: 'graph-data',
        name: 'Graph Data',
        url: '/api/yorha/graph/data',
        method: 'GET',
        type: 'yorha-api',
        description: 'Retrieve system architecture graph data',
        headers: {},
        body: null
      },
      {
        id: 'enhanced-rag',
        name: 'Enhanced RAG',
        url: '/api/yorha/enhanced-rag',
        method: 'POST',
        type: 'standard',
        description: 'Test Enhanced RAG service functionality',
        headers: { 'Content-Type': 'application/json' },
        body: { query: 'test legal document analysis', context: [] }
      },
      {
        id: 'multicore-status',
        name: 'Context7 Multicore Status',
        url: '/api/context7/multicore/status',
        method: 'GET',
        type: 'context7',
        description: 'Get Context7 multicore service health',
        headers: {},
        body: null
      },
      {
        id: 'process-text',
        name: 'Context7 Text Processing',
        url: '/api/context7/multicore/process',
        method: 'POST',
        type: 'context7',
        description: 'Test text processing with legal classification',
        headers: { 'Content-Type': 'application/json' },
        body: { text: 'Sample legal document for analysis', type: 'legal_classification' }
      },
      {
        id: 'json-parse',
        name: 'Context7 JSON Parser',
        url: '/api/context7/multicore/json-parse',
        method: 'POST',
        type: 'context7',
        description: 'Test advanced JSON parsing capabilities',
        headers: { 'Content-Type': 'application/json' },
        body: { jsonString: '{"legal": {"case": "test", "priority": "high"}}' }
      },
      {
        id: 'component-metrics',
        name: 'Component Metrics',
        url: '/api/yorha/components/metrics',
        method: 'GET',
        type: 'yorha-api',
        description: 'Get 3D component performance metrics',
        headers: {},
        body: null
      },
      {
        id: 'database-health',
        name: 'Database Health',
        url: '/api/v1/database/health',
        method: 'GET',
        type: 'standard',
        description: 'Test database connectivity and performance',
        headers: {},
        body: null
      },
      {
        id: 'vector-search',
        name: 'Vector Search',
        url: '/api/v1/vector/search',
        method: 'POST',
        type: 'standard',
        description: 'Test pgvector similarity search',
        headers: { 'Content-Type': 'application/json' },
        body: { query: 'legal document similarity', limit: 10 }
      },
      {
        id: 'ai-inference',
        name: 'AI Inference',
        url: '/api/v1/ai/inference',
        method: 'POST',
        type: 'standard',
        description: 'Test Ollama AI model inference',
        headers: { 'Content-Type': 'application/json' },
        body: { prompt: 'Analyze this legal contract', model: 'gemma3-legal' }
      }
    ];

    // Define test suites
    const testSuites = [
      {
        id: 'yorha-complete',
        name: 'Complete YoRHa Suite',
        description: 'Test all YoRHa interface APIs',
        endpoints: ['system-status', 'graph-data', 'component-metrics']
      },
      {
        id: 'context7-suite',
        name: 'Context7 Multicore Suite', 
        description: 'Test Context7 multicore services',
        endpoints: ['multicore-status', 'process-text', 'json-parse']
      },
      {
        id: 'ai-pipeline',
        name: 'AI Pipeline Suite',
        description: 'Test complete AI processing pipeline',
        endpoints: ['enhanced-rag', 'vector-search', 'ai-inference']
      },
      {
        id: 'infrastructure',
        name: 'Infrastructure Suite',
        description: 'Test core infrastructure components',
        endpoints: ['database-health', 'system-status']
      },
      {
        id: 'smoke-test',
        name: 'Smoke Test',
        description: 'Quick health check of critical endpoints',
        endpoints: ['system-status', 'multicore-status', 'database-health']
      }
    ];

    // Generate test documentation
    const testDocumentation = {
      overview: 'YoRHa API Testing Suite provides comprehensive testing for all system APIs',
      features: [
        'Real-time API testing with live metrics',
        'Context7 multicore service integration',
        'YoRHa 3D interface API validation',
        'Performance monitoring and latency tracking',
        'Test suite automation with batch execution',
        'Historical test result tracking'
      ],
      protocols: [
        { name: 'YoRHa API', description: 'Custom APIs for YoRHa 3D interface components' },
        { name: 'Context7', description: 'Multicore processing and AI analysis services' },
        { name: 'Standard REST', description: 'Traditional HTTP REST API endpoints' }
      ],
      metrics: [
        'Total test executions',
        'Pass/fail rates',
        'Average response latency',
        'Success rate percentage',
        'Error categorization'
      ]
    };

    return {
      endpoints: apiEndpoints,
      testSuites,
      documentation: testDocumentation,
      initialLoad: true,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Error loading API test data:', error);
    
    return {
      endpoints: [],
      testSuites: [],
      documentation: { overview: '', features: [], protocols: [], metrics: [] },
      initialLoad: false,
      timestamp: new Date().toISOString(),
      error: 'Failed to load API test configuration'
    };
  }
};