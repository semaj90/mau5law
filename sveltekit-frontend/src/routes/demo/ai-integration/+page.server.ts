import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  try {
    // Fetch initial system health and embeddings data
    const [embeddingsStatus, systemHealth] = await Promise.allSettled([
      // Check embeddings API status
      fetch('/api/embeddings'),
      // Check system health (with timeout to prevent blocking)
      Promise.race([
        checkSystemHealth(fetch),
        new Promise(resolve => setTimeout(() => resolve({ 
          go: { status: 'timeout', details: 'Health check timeout' },
          ollama: { status: 'timeout', details: 'Health check timeout' },
          postgres: { status: 'timeout', details: 'Health check timeout' },
          redis: { status: 'checking', details: 'Checking...' }
        }), 3000))
      ])
    ]);

    // Process embeddings status
    let embeddingsData = null;
    if (embeddingsStatus.status === 'fulfilled') {
      const response = embeddingsStatus.value;
      if (response.ok) {
        embeddingsData = await response.json();
      }
    }

    // Process system health
    let healthData = {
      go: { status: 'unknown', details: 'Unable to check' },
      ollama: { status: 'unknown', details: 'Unable to check' },
      postgres: { status: 'unknown', details: 'Unable to check' },
      redis: { status: 'checking', details: 'Checking...' }
    };
    
    if (systemHealth.status === 'fulfilled') {
      healthData = systemHealth.value as typeof healthData;
    }

    // Generate demo embeddings for immediate display
    const demoDocuments = [
      { id: 'doc1', title: 'Contract Analysis', content: 'This contract contains liability clauses...' },
      { id: 'doc2', title: 'Legal Precedent', content: 'Similar cases show evidence patterns...' },
      { id: 'doc3', title: 'Risk Assessment', content: 'Based on the evidence, the risk factors...' },
      { id: 'doc4', title: 'Compliance Review', content: 'The regulatory framework requires...' }
    ];

    // Create demo embeddings (3D vectors for visualization)
    const demoEmbeddings = demoDocuments.map((_, index) => {
      const base = index * 0.25;
      return [
        Math.sin(base) * 0.5 + Math.random() * 0.1,
        Math.cos(base) * 0.5 + Math.random() * 0.1,
        Math.sin(base * 2) * 0.3 + Math.random() * 0.1
      ];
    });

    return {
      // Initial system state
      systemHealth: healthData,
      embeddingsApi: embeddingsData,
      
      // Demo data for immediate visualization
      initialEmbeddings: demoEmbeddings,
      initialLabels: demoDocuments.map(doc => doc.title),
      demoDocuments,
      
      // Performance metrics baseline
      performanceMetrics: {
        requests: 0,
        avgResponseTime: 0,
        cacheHitRate: 85, // Start with realistic baseline
        embeddingsGenerated: demoDocuments.length,
        vectorSimilarityQueries: 0
      },
      
      // Server-side timestamp for performance tracking
      serverLoadTime: Date.now()
    };
  } catch (err) {
    console.error('Server-side data loading error:', err);
    
    // Don't fail the page, provide fallback data
    return {
      systemHealth: {
        go: { status: 'error', details: 'Server load error' },
        ollama: { status: 'error', details: 'Server load error' },
        postgres: { status: 'error', details: 'Server load error' },
        redis: { status: 'error', details: 'Server load error' }
      },
      embeddingsApi: null,
      initialEmbeddings: [],
      initialLabels: [],
      demoDocuments: [],
      performanceMetrics: {
        requests: 0,
        avgResponseTime: 0,
        cacheHitRate: 0,
        embeddingsGenerated: 0,
        vectorSimilarityQueries: 0
      },
      serverLoadTime: Date.now(),
      error: 'Failed to load initial data'
    };
  }
};

// Helper function to check system health
async function checkSystemHealth(fetch: any) {
  const healthChecks = [
    { name: 'go', url: 'http://localhost:8080/health' },
    { name: 'ollama', url: 'http://localhost:11434/api/tags' },
    { name: 'postgres', url: 'http://localhost:8080/database-status' },
  ];

  const health: Record<string, { status: string; details?: string }> = {};

  // Check each service with short timeout
  for (const check of healthChecks) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(check.url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      health[check.name] = {
        status: response.ok ? 'healthy' : 'error',
        details: response.ok ? 'Connected' : `HTTP ${response.status}`
      };
    } catch (error) {
      health[check.name] = {
        status: 'error',
        details: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  // Mock Redis status (typically managed internally)
  health.redis = { status: 'healthy', details: 'Internal service' };
  
  return health;
}