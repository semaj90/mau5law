/**
 * Enhanced API Route Example for Bits UI SSR
 * Demonstrates proper data extraction and serialization patterns
 */

import type { RequestHandler } from './$types';
import { createSSRResponse, withSSRHandler, batchSSRRequests } from '$lib/server/api-ssr-helpers';
import type { DashboardStats, SystemHealth, RecentActivity } from '$lib/types/api-schemas';

export const GET: RequestHandler = withSSRHandler(async ({ url, locals }) => {
  const dataType = url.searchParams.get('type') || 'dashboard';

  switch (dataType) {
    case 'dashboard':
      return getDashboardData(locals);
    case 'health':
      return getSystemHealth();
    case 'activities':
      return getRecentActivities(locals);
    case 'batch':
      return getBatchData(locals);
    default:
      return createSSRResponse({ message: 'Invalid data type requested' }, { status: 400 });
  }
});

async function getDashboardData(locals: any) {
  const dashboardStats: DashboardStats = {
    activeCases: 42,
    evidenceItems: 1337,
    aiAnalyses: 89,
    systemUptime: Date.now() - (1000 * 60 * 60 * 24), // 24 hours
    cognitive: {
      routingEfficiency: 87.5,
      cacheHitRatio: 92.3,
      gpuUtilization: 78.1,
      consciousnessLevel: 12,
      quantumCoherence: 50,
      timestamp: new Date().toISOString()
    }
  };

  return createSSRResponse(dashboardStats);
}

async function getSystemHealth(): Promise<Response> {
  const systemHealth: SystemHealth = {
    overall: {
      status: 'healthy',
      healthScore: 95.8,
      healthyServices: 7,
      totalServices: 8,
      timestamp: new Date().toISOString()
    },
    services: {
      databases: {
        postgresql: { host: 'localhost', port: 5432, status: 'healthy' },
        redis: { host: 'localhost', port: 4005, status: 'healthy' }
      },
      aiServices: {
        ollama: { host: 'localhost', port: 11434, status: 'healthy' }
      },
      gpuServices: {
        rtx3060ti: { status: 'healthy', vram: '8GB' }
      },
      orchestration: {
        sveltekit: { host: 'localhost', port: 5176, status: 'healthy' }
      },
      storage: {
        minio: { host: 'localhost', port: 4002, status: 'healthy' }
      }
    },
    performance: {
      systemUptime: Date.now() - (1000 * 60 * 60 * 2), // 2 hours
      memoryUsage: {
        heapUsed: 156 * 1024 * 1024,
        heapTotal: 256 * 1024 * 1024,
        external: 32 * 1024 * 1024,
        rss: 384 * 1024 * 1024
      }
    },
    architecture: {
      platform: 'win32',
      version: '2.0.0',
      gpuArchitecture: 'RTX 3060 Ti',
      microservices: 8,
      protocols: ['HTTP', 'WebSocket', 'gRPC'],
      features: ['Vector Search', 'AI Analysis', 'Real-time Chat', 'Document Processing']
    }
  };

  return createSSRResponse(systemHealth);
}

async function getRecentActivities(locals: any): Promise<Response> {
  const activities: RecentActivity[] = [
    {
      id: '001',
      type: 'case_created',
      title: 'Corporate Espionage Investigation',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      priority: 'high'
    },
    {
      id: '002',
      type: 'evidence_uploaded',
      title: 'Financial Records - Anomaly Detected',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      priority: 'medium'
    },
    {
      id: '003',
      type: 'ai_analysis',
      title: 'Pattern Recognition Complete',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      priority: 'low'
    },
    {
      id: '004',
      type: 'document_processed',
      title: 'Contract Analysis - 15 entities extracted',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      priority: 'medium'
    }
  ];

  return createSSRResponse({ activities, total: activities.length });
}

async function getBatchData(locals: any): Promise<Response> {
  // Demonstrate batch loading for efficient SSR
  const batchedData = await batchSSRRequests({
    dashboard: () => getDashboardData(locals).then(r => r.json()),
    health: () => getSystemHealth().then(r => r.json()),
    activities: () => getRecentActivities(locals).then(r => r.json())
  });

  return createSSRResponse({
    ...batchedData,
    meta: {
      batchLoaded: true,
      loadTime: new Date().toISOString()
    }
  });
}

// POST handler for Bits UI form submissions
export const POST: RequestHandler = withSSRHandler(async ({ request, locals }) => {
  const data = await request.json();
  
  // Process form data with proper serialization
  const processedData = {
    received: data,
    processedAt: new Date().toISOString(),
    userId: locals.user?.id,
    status: 'processed'
  };

  return createSSRResponse(processedData, { status: 201 });
});