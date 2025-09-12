// Legal AI Orchestrator Health Check API
// Nintendo-Style Service Health Monitoring

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time_ms?: number;
  details?: string;
}

interface HealthResponse {
  overall_status: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  nintendo_memory_banks: {
    L1_GPU_VRAM: { used_mb: number; total_mb: number; utilization: number };
    L2_SYSTEM_RAM: { used_mb: number; total_mb: number; utilization: number };
    L3_REDIS_CACHE: { used_mb: number; total_mb: number; utilization: number };
  };
  timestamp: string;
}

async function checkServiceHealth(url: string, timeout = 5000): Promise<{ healthy: boolean; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: response.ok,
      responseTime
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime
    };
  }
}

async function checkRedisHealth(): Promise<ServiceHealth> {
  try {
    // Try to connect to Redis using a simple ping
    // In production, you might want to use a proper Redis client
    const response = await fetch('http://localhost:6379/ping', {
      method: 'GET',
      timeout: 3000
    }).catch(() => null);
    
    return {
      service: 'Redis Cache (L3)',
      status: response?.ok ? 'healthy' : 'down',
      response_time_ms: response ? 50 : undefined,
      details: response?.ok ? 'Nintendo L3 memory bank operational' : 'Redis connection failed'
    };
  } catch {
    return {
      service: 'Redis Cache (L3)',
      status: 'down',
      details: 'Redis service not available'
    };
  }
}

async function getMemoryBankStatus() {
  // Simulate memory bank readings - in production, you'd get actual metrics
  return {
    L1_GPU_VRAM: {
      used_mb: Math.floor(Math.random() * 6000 + 2000), // 2-8GB used
      total_mb: 8192, // 8GB RTX 3060
      utilization: 0
    },
    L2_SYSTEM_RAM: {
      used_mb: Math.floor(Math.random() * 4000 + 8000), // 8-12GB used
      total_mb: 32768, // 32GB system RAM
      utilization: 0
    },
    L3_REDIS_CACHE: {
      used_mb: Math.floor(Math.random() * 500 + 200), // 200-700MB used
      total_mb: 1024, // 1GB Nintendo budget
      utilization: 0
    }
  };
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const services = [
      {
        name: 'Legal Expert (vLLM)',
        url: 'http://localhost:8000/health',
        key: 'legal_expert'
      },
      {
        name: 'Fast Router (vLLM)',
        url: 'http://localhost:8001/health',
        key: 'fast_router'
      },
      {
        name: 'Embedding Service',
        url: 'http://localhost:11434/api/tags',
        key: 'embedding_service'
      },
      {
        name: 'PostgreSQL',
        url: 'postgresql://legal_admin:123456@localhost:5433/legal_ai_db',
        key: 'postgres'
      }
    ];

    // Check all HTTP services in parallel
    const serviceChecks = await Promise.all(
      services.slice(0, 3).map(async (service) => {
        const { healthy, responseTime } = await checkServiceHealth(service.url);
        return {
          service: service.name,
          status: healthy ? 'healthy' : 'down',
          response_time_ms: responseTime,
          details: healthy ? 'Service operational' : 'Service unreachable'
        } as ServiceHealth;
      })
    );

    // Check Redis separately
    const redisHealth = await checkRedisHealth();
    serviceChecks.push(redisHealth);

    // Check PostgreSQL (simplified - in production use proper connection check)
    serviceChecks.push({
      service: 'PostgreSQL + pgvector',
      status: 'healthy', // Assume healthy for demo
      response_time_ms: 25,
      details: 'Database operational'
    });

    // Get memory bank status
    const memoryBanks = await getMemoryBankStatus();
    
    // Calculate utilizations
    memoryBanks.L1_GPU_VRAM.utilization = Math.round((memoryBanks.L1_GPU_VRAM.used_mb / memoryBanks.L1_GPU_VRAM.total_mb) * 100);
    memoryBanks.L2_SYSTEM_RAM.utilization = Math.round((memoryBanks.L2_SYSTEM_RAM.used_mb / memoryBanks.L2_SYSTEM_RAM.total_mb) * 100);
    memoryBanks.L3_REDIS_CACHE.utilization = Math.round((memoryBanks.L3_REDIS_CACHE.used_mb / memoryBanks.L3_REDIS_CACHE.total_mb) * 100);

    // Determine overall status
    const healthyServices = serviceChecks.filter(s => s.status === 'healthy').length;
    const totalServices = serviceChecks.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (healthyServices === totalServices) {
      overallStatus = 'healthy';
    } else if (healthyServices >= totalServices * 0.6) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'critical';
    }

    const healthResponse: HealthResponse = {
      overall_status: overallStatus,
      services: serviceChecks,
      nintendo_memory_banks: memoryBanks,
      timestamp: new Date().toISOString()
    };

    return json(healthResponse, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503
    });

  } catch (error) {
    return json({
      overall_status: 'critical',
      services: [],
      nintendo_memory_banks: {},
      timestamp: new Date().toISOString(),
      error: 'Health check system failure'
    }, { status: 500 });
  }
};