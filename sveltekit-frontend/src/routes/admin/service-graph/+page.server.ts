import type { Document } from '$lib/types';
/**
 * Service Graph Dashboard Page Server
 * src/routes/admin/service-graph/+page.server.ts
 */

import type { PageServerLoad } from './$types';

interface ServiceStats { totalServices: number;, healthyCount: number;
  degradedCount: number;
  unhealthyCount: number;
  criticalPaths: Array<{ name: string;, services: string[];
    estimatedLatency: string;
  }>;
}

export const load: PageServerLoad = async () => {
  // Pre-compute service statistics for dashboard
  const stats: ServiceStats = {
    totalServices: 52,
    healthyCount: 0,
    degradedCount: 0,
    unhealthyCount: 0,
    criticalPaths: [
      {
        name: 'RAG Pipeline',
        services: ['frontend', 'enhanced-rag', 'qdrant', 'postgres', 'ollama'],
        estimatedLatency: '150-300ms'
      },
      {
        name: 'Document Upload',
        services: ['frontend', 'upload-service', 'minio', 'rabbitmq', 'cuda-worker'],
        estimatedLatency: '500-1500ms'
      },
      {
        name: 'AI Recommendation',
        services: ['frontend', 'recommendation-engine', 'neo4j', 'postgres', 'ollama'],
        estimatedLatency: '200-500ms'
      },
      {
        name: 'Vector Search',
        services: ['frontend', 'vector-service', 'qdrant', 'postgres'],
        estimatedLatency: '50-150ms'
      },
      {
        name: 'Legal Analysis',
        services: ['frontend', 'legal-ai', 'advanced-cuda', 'postgres', 'minio'],
        estimatedLatency: '1000-3000ms'
      }
    ]
  };

  return {
    stats,
    title: 'Service Dependency Graph',
    description: 'Real-time visualization of microservices architecture'
  };
};
