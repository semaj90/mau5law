import type { RequestHandler } from './$types.js';

/*
 * QUIC Services Management API - Central Hub for All QUIC Services
 * Provides centralized management, health monitoring, and configuration for all QUIC services
 */
import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';
import { URL } from "url";

const QUIC_SERVICES_CONFIG = {
  gateway: {
    name: 'QUIC Gateway',
    primaryPort: 8443,
    fallbackPort: 8444,
    baseUrl: 'http://localhost:8443',
    fallbackUrl: 'http://localhost:8444',
    description: 'HTTP/3 gateway proxy to SvelteKit frontend',
    features: ['HTTP/3', 'HTTP/2 Fallback', 'TLS Generation', 'Proxy Headers']
  },
  vector: {
    name: 'QUIC Vector Proxy',
    primaryPort: 8445,
    fallbackPort: 8446,
    baseUrl: 'http://localhost:8445',
    fallbackUrl: 'http://localhost:8446',
    description: 'High-performance vector operations with intelligent caching',
    features: ['Multi-backend Routing', 'Vector Caching', 'Qdrant Integration', 'pgvector Support']
  },
  aiStream: {
    name: 'QUIC AI Stream',
    primaryPort: 8447,
    fallbackPort: 8448,
    baseUrl: 'http://localhost:8447',
    fallbackUrl: 'http://localhost:8448',
    description: 'Real-time AI streaming with WebSocket + HTTP/3 support',
    features: ['AI Streaming', 'WebSocket Support', 'Session Management', 'Multiple Models']
  },
  ragProxy: {
    name: 'RAG QUIC Proxy',
    primaryPort: 8451,
    fallbackPort: 8452,
    baseUrl: 'http://localhost:8451',
    fallbackUrl: 'http://localhost:8452',
    description: 'Enhanced RAG service with edge caching and metrics',
    features: ['Edge Caching', 'ETag Revalidation', 'Prometheus Metrics', 'JSON Optimization']
  }
};

export interface QUICServiceStatus {
  name: string;
  status: 'healthy' | 'fallback' | 'unhealthy' | 'error';
  protocol: string;
  ports: {
    quic: number;
    fallback: number;
  };
  url: string;
  responseTime?: number;
  error?: string;
  features: string[];
  metrics?: Record<string, any>;
}

export interface QUICClusterStatus {
  totalServices: number;
  healthyServices: number;
  fallbackServices: number;
  unhealthyServices: number;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, QUICServiceStatus>;
  timestamp: string;
}

/*
 * GET /api/v1/quic - Get comprehensive QUIC services status
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const includeMetrics = url.searchParams.get('metrics') === 'true';
    const serviceName = url.searchParams.get('service');
    const timeout = parseInt(url.searchParams.get('timeout') || '5000', 10);

    // If specific service requested, return only that service
    if (serviceName) {
      const serviceConfig = QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG];
      if (!serviceConfig) {
        error(404, ensureError({ message: `Service '${serviceName}' not found` }));
      }

      const serviceStatus = await checkServiceHealth(serviceName, serviceConfig, includeMetrics, timeout);
      return json(serviceStatus);
    }

    // Check all services
    const servicePromises = Object.entries(QUIC_SERVICES_CONFIG).map(([key, config]) =>
      checkServiceHealth(key, config, includeMetrics, timeout)
    );

    const serviceResults = await Promise.allSettled(servicePromises);
    const services: Record<string, QUICServiceStatus> = {};

    let healthyCount = 0;
    let fallbackCount = 0;
    let unhealthyCount = 0;

    serviceResults.forEach((result, index) => {
      const serviceName = Object.keys(QUIC_SERVICES_CONFIG)[index];
      
      if (result.status === 'fulfilled') {
        services[serviceName] = result.value;
        
        switch (result.value.status) {
          case 'healthy':
            healthyCount++;
            break;
          case 'fallback':
            fallbackCount++;
            break;
          case 'unhealthy':
          case 'error':
            unhealthyCount++;
            break;
        }
      } else {
        services[serviceName] = {
          name: QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG].name,
          status: 'error',
          protocol: 'N/A',
          ports: {
            quic: QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG].primaryPort,
            fallback: QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG].fallbackPort
          },
          url: 'N/A',
          error: result.reason?.message || 'Unknown error',
          features: QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG].features
        };
        unhealthyCount++;
      }
    });

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0) {
      overallStatus = fallbackCount === 0 ? 'healthy' : 'degraded';
    } else if (healthyCount > 0 || fallbackCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const clusterStatus: QUICClusterStatus = {
      totalServices: Object.keys(QUIC_SERVICES_CONFIG).length,
      healthyServices: healthyCount,
      fallbackServices: fallbackCount,
      unhealthyServices: unhealthyCount,
      overallStatus,
      services,
      timestamp: new Date().toISOString()
    };

    return json(clusterStatus);

  } catch (err: any) {
    console.error('QUIC services status check failed:', err);
    error(500, ensureError({
      message: 'Failed to check QUIC services status',
      error: err instanceof Error ? err.message : 'Unknown error'
    }));
  }
};

/*
 * POST /api/v1/quic - Execute command across QUIC services
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { command, services, parameters } = await request.json();
    const targetServices = services || Object.keys(QUIC_SERVICES_CONFIG);

    // Validate command
    const validCommands = ['restart', 'health-check', 'clear-cache', 'update-config'];
    if (!validCommands.includes(command)) {
      error(400, ensureError({ message: `Invalid command. Valid commands: ${validCommands.join(', ')}` }));
    }

    const results: Record<string, any> = {};

    for (const serviceName of targetServices) {
      const serviceConfig = QUIC_SERVICES_CONFIG[serviceName as keyof typeof QUIC_SERVICES_CONFIG];
      if (!serviceConfig) {
        results[serviceName] = {
          success: false,
          error: `Service '${serviceName}' not found`
        };
        continue;
      }

      try {
        results[serviceName] = await executeServiceCommand(
          serviceName, 
          serviceConfig, 
          command, 
          parameters
        );
      } catch (commandError) {
        results[serviceName] = {
          success: false,
          error: commandError instanceof Error ? commandError.message : 'Unknown error'
        };
      }
    }

    return json({
      command,
      services: targetServices,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('QUIC services command execution failed:', err);
    error(500, ensureError({
      message: 'Command execution failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }));
  }
};

/*
 * PUT /api/v1/quic - Update QUIC services configuration
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const { service, configuration } = await request.json();

    if (!service || !configuration) {
      error(400, ensureError({ message: 'Service name and configuration are required' }));
    }

    const serviceConfig = QUIC_SERVICES_CONFIG[service as keyof typeof QUIC_SERVICES_CONFIG];
    if (!serviceConfig) {
      error(404, ensureError({ message: `Service '${service}' not found` }));
    }

    // In a real implementation, this would update the service configuration
    // For now, we'll simulate the update
    const updatedConfig = {
      ...serviceConfig,
      ...configuration,
      lastUpdated: new Date().toISOString()
    };

    return json({
      success: true,
      service,
      message: `Configuration updated for ${serviceConfig.name}`,
      configuration: updatedConfig,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('QUIC configuration update failed:', err);
    error(500, ensureError({
      message: 'Configuration update failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }));
  }
};

/*
 * Check health of individual QUIC service
 */
async function checkServiceHealth(
  serviceName: string, 
  serviceConfig: any, 
  includeMetrics: boolean,
  timeout: number
): Promise<QUICServiceStatus> {
  const startTime = Date.now();
  let status: 'healthy' | 'fallback' | 'unhealthy' | 'error' = 'unhealthy';
  let protocol = 'N/A';
  let url = serviceConfig.baseUrl;
  let serviceError: string | undefined;
  let metrics: Record<string, any> | undefined;

  try {
    // Try primary QUIC endpoint first
    const primaryResponse = await fetch(`${serviceConfig.baseUrl}/health`, {
      signal: AbortSignal.timeout(timeout)
    });

    if (primaryResponse.ok) {
      status = 'healthy';
      protocol = 'HTTP/3';
      
      if (includeMetrics) {
        try {
          const healthData = await primaryResponse.json();
          metrics = healthData.metrics || {};
        } catch (e: any) {
          // Metrics parsing failed, continue without metrics
        }
      }
    } else {
      throw new Error(`Primary endpoint returned ${primaryResponse.status}`);
    }

  } catch (primaryError) {
    // Try fallback HTTP/2 endpoint
    try {
      const fallbackResponse = await fetch(`${serviceConfig.fallbackUrl}/health`, {
        signal: AbortSignal.timeout(timeout)
      });

      if (fallbackResponse.ok) {
        status = 'fallback';
        protocol = 'HTTP/2';
        url = serviceConfig.fallbackUrl;

        if (includeMetrics) {
          try {
            const healthData = await fallbackResponse.json();
            metrics = healthData.metrics || {};
          } catch (e: any) {
            // Metrics parsing failed, continue without metrics
          }
        }
      } else {
        throw new Error(`Fallback endpoint returned ${fallbackResponse.status}`);
      }

    } catch (fallbackError) {
      status = 'error';
      serviceError = `Primary: ${primaryError instanceof Error ? primaryError.message : 'Unknown'}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown'}`;
    }
  }

  const responseTime = Date.now() - startTime;

  return {
    name: serviceConfig.name,
    status,
    protocol,
    ports: {
      quic: serviceConfig.primaryPort,
      fallback: serviceConfig.fallbackPort
    },
    url,
    responseTime,
    error: serviceError,
    features: serviceConfig.features,
    metrics
  };
}

/*
 * Execute command on specific service
 */
async function executeServiceCommand(
  serviceName: string,
  serviceConfig: any,
  command: string,
  parameters?: any
): Promise<any> {
  const baseUrl = serviceConfig.baseUrl;

  switch (command) {
    case 'health-check':
      const healthResponse = await fetch(`${baseUrl}/health`);
      return {
        success: healthResponse.ok,
        status: healthResponse.status,
        data: healthResponse.ok ? await healthResponse.json() : null
      };

    case 'clear-cache':
      const cacheResponse = await fetch(`${baseUrl}/cache`, {
        method: 'DELETE'
      });
      return {
        success: cacheResponse.ok,
        message: 'Cache cleared',
        data: cacheResponse.ok ? await cacheResponse.json() : null
      };

    case 'update-config':
      if (!parameters) {
        throw new Error('Parameters required for config update');
      }
      
      const configResponse = await fetch(`${baseUrl}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameters)
      });
      
      return {
        success: configResponse.ok,
        message: 'Configuration updated',
        data: configResponse.ok ? await configResponse.json() : null
      };

    case 'restart':
      // In a real implementation, this would trigger a service restart
      return {
        success: true,
        message: `Restart signal sent to ${serviceConfig.name}`,
        note: 'Restart functionality would be implemented based on deployment method'
      };

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}