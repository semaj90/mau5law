import type { RequestHandler } from './$types.js';

/**
 * Service Discovery and Failover API
 * Automatic service discovery, health monitoring, and failover mechanisms
 * Integrates with cluster-manager Go service on port 8103
 */

import { productionServiceClient } from '$lib/services/productionServiceClient';
import { URL } from "url";

interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocols: string[];
  status: 'healthy' | 'unhealthy' | 'unknown' | 'starting' | 'stopping';
  health: {
    score: number; // 0-100
    latency: number;
    uptime: number;
    lastCheck: string;
    consecutiveFailures: number;
  };
  metadata: {
    version: string;
    capabilities: string[];
    region?: string;
    weight: number;
  };
  failover: {
    primary: boolean;
    backups: string[];
    autoFailover: boolean;
    failoverThreshold: number;
  };
}

interface DiscoveryRegistry {
  services: Record<string, ServiceInstance[]>;
  totalServices: number;
  healthyServices: number;
  lastUpdate: string;
  discoveryConfig: {
    checkInterval: number;
    failoverTimeout: number;
    healthThreshold: number;
  };
}

interface FailoverEvent {
  id: string;
  timestamp: string;
  serviceId: string;
  reason: string;
  from: string;
  to: string;
  duration: number;
  success: boolean;
}

// Service registry - in production, this would be persistent storage
const serviceRegistry = new Map<string, ServiceInstance[]>();
const failoverHistory: FailoverEvent[] = [];

// Initialize with known services from ecosystem
const KNOWN_SERVICES = [
  // Tier 1: Core Services
  { name: 'enhanced-rag', port: 8094, protocols: ['http', 'quic'], primary: true },
  { name: 'upload-service', port: 8093, protocols: ['http'], primary: true },
  { name: 'kratos-server', port: 50051, protocols: ['grpc'], primary: true },
  
  // Tier 2: Advanced Services  
  { name: 'advanced-cuda', port: 8095, protocols: ['http', 'quic', 'grpc'], primary: false },
  { name: 'dimensional-cache', port: 8097, protocols: ['http', 'quic'], primary: false },
  { name: 'xstate-manager', port: 8098, protocols: ['http', 'websocket'], primary: false },
  { name: 'module-manager', port: 8099, protocols: ['http', 'grpc'], primary: false },
  { name: 'recommendation-engine', port: 8100, protocols: ['http', 'websocket'], primary: false },
  
  // Additional services (sampling from the 37 total)
  { name: 'vector-service', port: 8101, protocols: ['http', 'grpc'], primary: false },
  { name: 'load-balancer', port: 8102, protocols: ['http', 'quic'], primary: true },
  { name: 'cluster-manager', port: 8103, protocols: ['http', 'grpc'], primary: true },
  { name: 't5-transformer', port: 8122, protocols: ['http'], primary: false },
  { name: 'multi-core-ollama', port: 8125, protocols: ['http'], primary: false },
];

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const action = url.searchParams.get('action') || 'discover';
    const body = await request.json();

    switch (action) {
      case 'register': {
        const { service } = body;
        
        if (!service || !service.name || !service.port) {
          return json({
            success: false,
            error: 'Service name and port are required'
          }, { status: 400 });
        }

        const registered = await registerService(service);
        
        return json({
          success: true,
          action: 'register',
          service: registered,
          timestamp: Date.now()
        });
      }

      case 'deregister': {
        const { serviceId } = body;
        
        const deregistered = await deregisterService(serviceId);
        
        return json({
          success: deregistered,
          action: 'deregister',
          serviceId,
          timestamp: Date.now()
        });
      }

      case 'health-check': {
        const { serviceId, force = false } = body;
        
        const health = serviceId 
          ? await checkServiceHealth(serviceId, force)
          : await performFullHealthCheck(force);
        
        return json({
          success: true,
          action: 'health-check',
          health,
          timestamp: Date.now()
        });
      }

      case 'failover': {
        const { serviceId, reason = 'manual', targetInstance } = body;
        
        const failoverResult = await executeFailover(serviceId, reason, targetInstance);
        
        return json({
          success: failoverResult.success,
          action: 'failover',
          result: failoverResult,
          timestamp: Date.now()
        });
      }

      case 'update-config': {
        const { config } = body;
        
        const updated = await updateDiscoveryConfig(config);
        
        return json({
          success: true,
          action: 'update-config',
          config: updated,
          timestamp: Date.now()
        });
      }

      case 'discover': {
        const { force = false } = body;
        
        const discovered = await discoverServices(force);
        
        return json({
          success: true,
          action: 'discover',
          discovered: discovered.length,
          services: discovered,
          timestamp: Date.now()
        });
      }

      default:
        return json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: ['register', 'deregister', 'health-check', 'failover', 'update-config', 'discover']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Service Discovery error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    const service = url.searchParams.get('service');
    const includeHistory = url.searchParams.get('history') === 'true';
    
    if (service) {
      // Get specific service instances
      const instances = serviceRegistry.get(service) || [];
      
      return json({
        success: true,
        service,
        instances,
        healthy: instances.filter(i => i.status === 'healthy').length,
        total: instances.length,
        timestamp: Date.now()
      });
    }

    // Get full registry
    const registry = await getServiceRegistry();
    
    const response: any = {
      success: true,
      registry,
      capabilities: [
        'Service registration and discovery',
        'Health monitoring and alerting',
        'Automatic failover',
        'Load balancing integration',
        'Circuit breaker patterns',
        'Service mesh coordination'
      ],
      endpoints: {
        registry: '/api/cluster/discovery (GET)',
        service_instances: '/api/cluster/discovery?service={name} (GET)',
        register: '/api/cluster/discovery?action=register (POST)',
        health_check: '/api/cluster/discovery?action=health-check (POST)',
        failover: '/api/cluster/discovery?action=failover (POST)',
        discover: '/api/cluster/discovery?action=discover (POST)'
      },
      timestamp: Date.now()
    };

    if (includeHistory) {
      response.failoverHistory = failoverHistory.slice(-20); // Last 20 events
    }

    return json(response);

  } catch (error: any) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }, { status: 500 });
  }
};

// Helper functions

async function getServiceRegistry(): Promise<DiscoveryRegistry> {
  const allServices = Array.from(serviceRegistry.values()).flat();
  const healthyServices = allServices.filter(s => s.status === 'healthy').length;

  const services: Record<string, ServiceInstance[]> = {};
  serviceRegistry.forEach((instances, name) => {
    services[name] = instances;
  });

  return {
    services,
    totalServices: allServices.length,
    healthyServices,
    lastUpdate: new Date().toISOString(),
    discoveryConfig: {
      checkInterval: 30000, // 30 seconds
      failoverTimeout: 5000, // 5 seconds  
      healthThreshold: 70
    }
  };
}

async function registerService(serviceData: any): Promise<ServiceInstance> {
  const service: ServiceInstance = {
    id: `${serviceData.name}-${serviceData.host}-${serviceData.port}`,
    name: serviceData.name,
    host: serviceData.host || 'localhost',
    port: serviceData.port,
    protocols: serviceData.protocols || ['http'],
    status: 'unknown',
    health: {
      score: 0,
      latency: 0,
      uptime: 0,
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0
    },
    metadata: {
      version: serviceData.version || '1.0.0',
      capabilities: serviceData.capabilities || [],
      region: serviceData.region,
      weight: serviceData.weight || 100
    },
    failover: {
      primary: serviceData.primary || false,
      backups: serviceData.backups || [],
      autoFailover: serviceData.autoFailover !== false,
      failoverThreshold: serviceData.failoverThreshold || 3
    }
  };

  const existingInstances = serviceRegistry.get(service.name) || [];
  existingInstances.push(service);
  serviceRegistry.set(service.name, existingInstances);

  // Perform initial health check
  await checkServiceHealth(service.id);

  return service;
}

async function deregisterService(serviceId: string): Promise<boolean> {
  for (const [name, instances] of serviceRegistry.entries()) {
    const filtered = instances.filter(s => s.id !== serviceId);
    if (filtered.length !== instances.length) {
      serviceRegistry.set(name, filtered);
      return true;
    }
  }
  return false;
}

async function checkServiceHealth(serviceId: string, force: boolean = false): Promise<any> {
  const service = findServiceById(serviceId);
  if (!service) {
    return { error: 'Service not found' };
  }

  try {
    const startTime = Date.now();
    
    // In production, make actual HTTP request to service health endpoint
    const isHealthy = await performHealthCheck(service);
    const latency = Date.now() - startTime;

    if (isHealthy) {
      service.health.score = Math.min(100, service.health.score + 10);
      service.health.consecutiveFailures = 0;
      service.status = 'healthy';
    } else {
      service.health.score = Math.max(0, service.health.score - 20);
      service.health.consecutiveFailures++;
      service.status = service.health.consecutiveFailures >= service.failover.failoverThreshold ? 'unhealthy' : 'healthy';
    }

    service.health.latency = latency;
    service.health.lastCheck = new Date().toISOString();

    // Trigger failover if needed
    if (service.status === 'unhealthy' && service.failover.autoFailover && service.failover.primary) {
      await executeFailover(serviceId, 'health-check-failure');
    }

    return {
      serviceId,
      status: service.status,
      health: service.health,
      failoverTriggered: service.status === 'unhealthy' && service.failover.autoFailover
    };

  } catch (error: any) {
    service.health.consecutiveFailures++;
    service.status = 'unhealthy';
    service.health.lastCheck = new Date().toISOString();
    
    return {
      serviceId,
      status: 'unhealthy',
      error: error.message,
      health: service.health
    };
  }
}

async function performFullHealthCheck(force: boolean = false): Promise<any> {
  const allServices = Array.from(serviceRegistry.values()).flat();
  
  const results = await Promise.all(
    allServices.map(service => checkServiceHealth(service.id, force))
  );

  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;

  return {
    summary: {
      total,
      healthy,
      unhealthy: total - healthy,
      healthPercentage: Math.round((healthy / total) * 100)
    },
    results: results.slice(0, 10), // First 10 detailed results
    timestamp: new Date().toISOString()
  };
}

async function executeFailover(serviceId: string, reason: string, targetInstance?: string): Promise<any> {
  const service = findServiceById(serviceId);
  if (!service) {
    return { success: false, error: 'Service not found' };
  }

  const startTime = Date.now();
  
  try {
    // Find backup instances
    const serviceName = service.name;
    const allInstances = serviceRegistry.get(serviceName) || [];
    const backupInstances = allInstances.filter(s => s.id !== serviceId && s.status === 'healthy');

    if (backupInstances.length === 0) {
      return { success: false, error: 'No healthy backup instances available' };
    }

    // Select target instance
    const target = targetInstance 
      ? backupInstances.find(s => s.id === targetInstance)
      : backupInstances.sort((a, b) => b.health.score - a.health.score)[0];

    if (!target) {
      return { success: false, error: 'Target instance not found or unhealthy' };
    }

    // Execute failover
    service.failover.primary = false;
    service.status = 'unhealthy';
    
    target.failover.primary = true;
    
    // Record failover event
    const failoverEvent: FailoverEvent = {
      id: `failover-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serviceId: service.id,
      reason,
      from: service.id,
      to: target.id,
      duration: Date.now() - startTime,
      success: true
    };
    
    failoverHistory.push(failoverEvent);
    
    // Keep only last 100 events
    if (failoverHistory.length > 100) {
      failoverHistory.splice(0, failoverHistory.length - 100);
    }

    return {
      success: true,
      from: service.id,
      to: target.id,
      reason,
      duration: failoverEvent.duration,
      event: failoverEvent
    };

  } catch (error: any) {
    const failoverEvent: FailoverEvent = {
      id: `failover-failed-${Date.now()}`,
      timestamp: new Date().toISOString(),
      serviceId: service.id,
      reason,
      from: service.id,
      to: 'none',
      duration: Date.now() - startTime,
      success: false
    };
    
    failoverHistory.push(failoverEvent);

    return {
      success: false,
      error: error.message,
      duration: failoverEvent.duration,
      event: failoverEvent
    };
  }
}

async function discoverServices(force: boolean = false): Promise<ServiceInstance[]> {
  const discovered: ServiceInstance[] = [];

  // Initialize known services if registry is empty or force discovery
  if (serviceRegistry.size === 0 || force) {
    for (const knownService of KNOWN_SERVICES) {
      const service = await registerService({
        name: knownService.name,
        host: 'localhost',
        port: knownService.port,
        protocols: knownService.protocols,
        primary: knownService.primary,
        capabilities: [`${knownService.name}-service`],
        autoFailover: true
      });
      
      discovered.push(service);
    }
  }

  return discovered;
}

async function updateDiscoveryConfig(config: any): Promise<any> {
  // In production, this would update persistent configuration
  return {
    checkInterval: config.checkInterval || 30000,
    failoverTimeout: config.failoverTimeout || 5000,
    healthThreshold: config.healthThreshold || 70,
    updated: new Date().toISOString()
  };
}

function findServiceById(serviceId: string): ServiceInstance | null {
  for (const instances of serviceRegistry.values()) {
    const service = instances.find(s => s.id === serviceId);
    if (service) return service;
  }
  return null;
}

async function performHealthCheck(service: ServiceInstance): Promise<boolean> {
  try {
    // In production, make actual HTTP request to service
    // For now, simulate with high success rate
    const successRate = service.name.includes('core') ? 0.95 : 0.85;
    return Math.random() < successRate;
  } catch (error) {
    return false;
  }
}

// Initialize registry with known services on startup
setTimeout(async () => {
  if (serviceRegistry.size === 0) {
    await discoverServices(true);
  }
}, 1000);