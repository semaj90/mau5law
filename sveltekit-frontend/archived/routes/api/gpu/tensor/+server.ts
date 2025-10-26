import type { RequestHandler } from './$types.js'
/*
 * SvelteKit API Route: GPU Tensor Processing
 * Integrates with Go GPU microservice and provides load balancing
 */
import { ensureError } from '$lib/utils/ensure-error'
import { json, error } from '@sveltejs/kit'
import { dev } from '$app/environment'

// GPU service pool for load balancing
const gpuServicePool = [
  'http://localhost:8095',  // Primary GPU service
  'http://localhost:8096',  // Secondary GPU service
  'http://localhost:8097',  // Tertiary GPU service
]
// Service health tracking
export interface ServiceHealth {
  url: string
  healthy: boolean
  lastCheck: number
  responseTime: number
  errorCount: number
}

// New: Interface for detailed tensor processing statistics
export interface TensorStats {
  inputSize?: number;
  outputSize?: number;
  processingDurationMs?: number;
  peakMemoryUsageBytes?: number;
  flops?: number;
  // Add other specific tensor statistics as needed
}

// New: Interface for the expected response from GPU microservices
export interface GPUTensorProcessingResult {
  success: boolean;
  data?: unknown; // Use 'unknown' for better type safety, forcing explicit handling
  cache_hit?: boolean;
  route?: string;
  metadata?: {
    tensorStats?: TensorStats; // Use the specific TensorStats interface
    optimizationLevel?: string;
    gpuMemoryUsed?: number;
    // Add other metadata properties as needed
  };
  error?: string;
}

// New: Interface for the raw tensor data received in the request body
export interface TensorData {
  shape: number[];
  data: number[];
  layout?: string;
  lodLevel?: number;
  [key: string]: unknown; // Allow for other properties from the original request
}

// New: Interface for the enhanced tensor data passed to GPU services
export interface EnhancedTensorData extends TensorData {
  cacheKey: string;
  timestamp: number;
  requestId: string;
  clientAddress: string;
  userAgent: string | null;
  context: string;
  dimensions: number;
  layout?: string; // Added missing property
  lodLevel?: number; // Added missing property
}

class GPUServiceManager {
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private currentServiceIndex = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  constructor() {
    // Initialize health tracking for all services
    gpuServicePool.forEach(url => {
      this.serviceHealth.set(url, {
        url,
        healthy: true,
        lastCheck: 0,
        responseTime: 0,
        errorCount: 0,
      });
    });
    // Start periodic health checks
    this.startHealthChecks();
  }
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkAllServicesHealth();
    }, 30000); // Check every 30 seconds
  }
  private async checkAllServicesHealth(): Promise<void> {
    const healthPromises = gpuServicePool.map(url => this.checkServiceHealth(url));
    await Promise.all(healthPromises);
  }
  private async checkServiceHealth(url: string): Promise<void> {
    const startTime = Date.now();
    const health = this.serviceHealth.get(url)!;
    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout using standard AbortSignal
      });
      if (response.ok) {
        health.healthy = true;
        health.responseTime = Date.now() - startTime;
        health.errorCount = Math.max(0, health.errorCount - 1); // Reduce error count on success
      } else {
        health.healthy = false;
        health.errorCount++;
      }
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      health.healthy = false;
      health.errorCount++;
      if (ensureError(error).name === 'AbortError') {
        // Use ensureError for type safety
        console.warn(`Health check for ${url} timed out.`);
      } else {
        console.error(`Health check for ${url} failed:`, ensureError(error).message); // Use ensureError for type safety
      }
    }
    health.lastCheck = Date.now();
  }
  getHealthyService(): string | null {
    // Get healthy services sorted by response time
    const healthyServices = Array.from(this.serviceHealth.values())
      .filter(service => service.healthy)
      .sort((a, b) => a.responseTime - b.responseTime);
    if (healthyServices.length === 0) {
      return null;
    }
    // Round-robin with preference for fastest services
    const service = healthyServices[this.currentServiceIndex % healthyServices.length];
    this.currentServiceIndex++;
    return service.url;
  }
  getServiceForHash(hash: string): string {
    const healthyServices = Array.from(this.serviceHealth.values()).filter(service => service.healthy);
    if (healthyServices.length === 0) {
      return gpuServicePool[0]; // Fallback to primary
    }
    // Consistent hashing
    const hashCode = this.hashString(hash);
    const serviceIndex = hashCode % healthyServices.length;
    return healthyServices[serviceIndex].url;
  }
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  getHealthStats(): ServiceHealth[] {
    // Changed return type to ServiceHealth[]
    return Array.from(this.serviceHealth.values()); // Return full ServiceHealth objects
  }
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
} // Added semicolon to explicitly terminate the class declaration statement
// Initialize service manager directly as the logic was identical for dev and production
const serviceManager = new GPUServiceManager();

// Request processing statistics
export interface ProcessingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cacheHits: number;
  averageProcessingTime: number;
}
const stats: ProcessingStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  cacheHits: 0,
  averageProcessingTime: 0,
};
// POST: Process tensor with GPU acceleration
export const POST: RequestHandler = async ({ request, getClientAddress, url: _url }) => {
  const startTime = Date.now();
  stats.totalRequests++;
  try {
    const rawTensorData: TensorData = await request.json(); // Use TensorData
    // Validate tensor data structure
    if (!rawTensorData.shape || !rawTensorData.data) {
      stats.failedRequests++;
      throw error(400, {
        message: 'Invalid tensor data: missing shape or data fields',
      });
    }
    // Validate tensor shape
    if (
      !Array.isArray(rawTensorData.shape) ||
      rawTensorData.shape.some((dim: number) => typeof dim !== 'number' || dim <= 0)
    ) {
      stats.failedRequests++;
      throw error(400, {
        message: 'Invalid tensor shape: must be array of positive integers',
      });
    }
    // Validate tensor data
    const expectedSize = rawTensorData.shape.reduce((a: number, b: number) => a * b, 1);
    if (!Array.isArray(rawTensorData.data) || rawTensorData.data.length !== expectedSize) {
      stats.failedRequests++;
      throw error(400, {
        message: 'Tensor data size mismatch',
      });
    }
    // Generate cache key for consistent routing
    const cacheKey = generateCacheKey(rawTensorData);
    // Enhance tensor data with metadata
    const enhancedTensorData: EnhancedTensorData = {
      // Explicitly type as EnhancedTensorData
      ...rawTensorData,
      cacheKey,
      timestamp: Date.now(),
      requestId: generateRequestId(),
      clientAddress: getClientAddress(),
      userAgent: request.headers.get('user-agent'),
      context: 'legal-ai-processing',
      dimensions: rawTensorData.shape.length,
      layout: rawTensorData.layout || 'standard',
      lodLevel: rawTensorData.lodLevel || 0,
    };
    // Select appropriate GPU service
    const targetService = serviceManager.getServiceForHash(cacheKey);
    if (!targetService) {
      stats.failedRequests++;
      throw error(
        503,
        ensureError({
          message: 'All GPU services unavailable',
        })
      );
    }
    // Process with primary service
    const result: GPUTensorProcessingResult = await processWithService(targetService, enhancedTensorData);
    // Update statistics
    const processingTime = Date.now() - startTime;
    updateProcessingStats(processingTime, result.cache_hit || false);
    stats.successfulRequests++;
    return json({
      success: true,
      data: result.data,
      metadata: {
        processingTime,
        cacheHit: result.cache_hit || false,
        service: targetService,
        route: result.route || generateRouteHash(cacheKey),
        requestId: enhancedTensorData.requestId,
        tensorStats: result.metadata?.tensorStats,
        optimizationLevel: result.metadata?.optimizationLevel || 'standard',
        gpuMemoryUsed: result.metadata?.gpuMemoryUsed || 0,
      },
      stats: {
        totalRequests: stats.totalRequests,
        successRate: (stats.successfulRequests / stats.totalRequests) * 100,
        averageProcessingTime: stats.averageProcessingTime,
        cacheHitRate: (stats.cacheHits / stats.totalRequests) * 100,
      },
    });
  } catch (err: unknown) {
    // Changed 'any' to 'unknown'
    stats.failedRequests++;
    console.error('GPU tensor processing error:', err);
    // Check if it's a SvelteKit error object (which has a 'status' property)
    if (
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status: number }).status === 'number'
    ) {
      // Re-throw SvelteKit errors
      throw err;
    }
    // Otherwise, treat as a generic error and ensure it's an Error instance
    const errorInstance = ensureError(err);
    throw error(500, {
      message: `Processing failed: ${errorInstance.message}`,
      // Optionally add more details from errorInstance if needed, e.g., stack
      // details: errorInstance.stack,
    });
  }
};
// GET: Retrieve processing statistics and service health
export const GET: RequestHandler = async ({ url }) => {
  const statsType = url.searchParams.get('type');
  try {
    switch (statsType) {
      case 'health': {
        return json({
          serviceHealth: serviceManager.getHealthStats(),
          timestamp: Date.now(),
        });
      }
      case 'stats': {
        return json({
          processing: {
            totalRequests: stats.totalRequests,
            successfulRequests: stats.successfulRequests,
            failedRequests: stats.failedRequests,
            successRate: stats.totalRequests > 0 ? (stats.successfulRequests / stats.totalRequests) * 100 : 0,
            cacheHitRate: stats.totalRequests > 0 ? (stats.cacheHits / stats.totalRequests) * 100 : 0,
            averageProcessingTime: stats.averageProcessingTime,
          },
          services: serviceManager.getHealthStats(),
          timestamp: Date.now(),
        });
      }
      case 'full':
      default: {
        // Get detailed stats from primary GPU service
        const primaryService = gpuServicePool[0];
        let serviceStats = null;
        try {
          const response = await fetch(`${primaryService}/stats`);
          if (response.ok) {
            serviceStats = await response.json();
          }
        } catch (error: unknown) {
          console.warn('Failed to fetch service stats:', ensureError(error).message);
        }
        return json({
          api: {
            processing: stats,
            services: serviceManager.getHealthStats(),
          },
          gpuService: serviceStats,
          timestamp: Date.now(),
          uptime: process.uptime(),
          environment: dev ? 'development' : 'production',
        });
      }
    }
  } catch (err: unknown) {
    console.error('Stats retrieval error:', err);
    throw error(
      500,
      ensureError({
        message: `Stats retrieval failed: ${ensureError(err).message}`,
        code: 'STATS_ERROR',
      })
    );
  }
};
// DELETE: Clear caches and reset statistics (development only)
export const DELETE: RequestHandler = async ({ url }) => {
  if (!dev) {
    throw error(
      403,
      ensureError({
        message: 'Cache clearing only available in development mode',
        code: 'PRODUCTION_PROTECTION',
      })
    );
  }
  try {
    const clearType = url.searchParams.get('type') || 'cache';
    if (clearType === 'stats' || clearType === 'all') {
      // Reset API statistics
      stats.totalRequests = 0;
      stats.successfulRequests = 0;
      stats.failedRequests = 0;
      stats.cacheHits = 0;
      stats.averageProcessingTime = 0;
    }
    if (clearType === 'cache' || clearType === 'all') {
      // Clear caches in GPU services
      const clearPromises = gpuServicePool.map(async serviceUrl => {
        try {
          const response = await fetch(`${serviceUrl}/stats`, {
            method: 'DELETE',
          });
          return {
            service: serviceUrl,
            success: response.ok,
          };
        } catch (error: unknown) {
          // Changed 'any' to 'unknown'
          return { service: serviceUrl, success: false, error: ensureError(error).message };
        }
      });
      const results = await Promise.all(clearPromises);
      return json({
        success: true,
        message: `${clearType} cleared successfully`,
        details: {
          clearedType: clearType,
          serviceResults: results,
        },
      });
    }
    return json({
      success: true,
      message: 'Operation completed',
    });
  } catch (err: unknown) {
    // Changed 'any' to 'unknown'
    console.error('Cache clearing error:', err);
    throw error(
      500,
      ensureError({
        message: `Cache clearing failed: ${ensureError(err).message}`,
        code: 'CACHE_CLEAR_ERROR',
      })
    );
  }
};
// Helper functions
async function processWithService(
  serviceUrl: string,
  tensorData: EnhancedTensorData
): Promise<GPUTensorProcessingResult> {
  // Changed tensorData type
  const maxRetries = 2;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${serviceUrl}/process-tensor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': tensorData.requestId,
          'X-Client-IP': tensorData.clientAddress,
          'X-Cache-Key': tensorData.cacheKey,
          'X-Attempt': (attempt + 1).toString(),
          'User-Agent': tensorData.userAgent || 'SvelteKit-API',
        },
        body: JSON.stringify(tensorData),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      if (!response.ok) {
        throw new Error(`GPU service error: ${response.status} ${response.statusText}`);
      }
      const result: GPUTensorProcessingResult = await response.json();
      if (!result.success) {
        throw new Error(`GPU processing failed: ${result.error || 'Unknown error'}`);
      }
      return result;
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      lastError = ensureError(error); // Use ensureError
      if (lastError.name === 'AbortError') {
        console.warn(`Attempt ${attempt + 1} failed for service ${serviceUrl}: Timeout.`);
      } else {
        console.warn(`Attempt ${attempt + 1} failed for service ${serviceUrl}:`, lastError.message);
      }
      if (attempt < maxRetries - 1) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  // All attempts failed, try fallback services
  const healthyServices = serviceManager
    .getHealthStats()
    .filter(s => s.healthy && s.url !== serviceUrl)
    .sort((a, b) => a.responseTime - b.responseTime);
  for (const fallbackService of healthyServices) {
    try {
      console.log(`Trying fallback service: ${fallbackService.url}`);
      const response = await fetch(`${fallbackService.url}/process-tensor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': tensorData.requestId,
          'X-Fallback': 'true',
        },
        body: JSON.stringify(tensorData),
        signal: AbortSignal.timeout(15000), // Shorter timeout for fallback
      });
      if (response.ok) {
        const result: GPUTensorProcessingResult = await response.json();
        if (result.success) {
          // Complete the if statement and check for success
          return result; // Return the successful result from the fallback service
        } else {
          throw new Error(`Fallback GPU processing failed: ${result.error || 'Unknown error'}`);
        }
      } else {
        throw new Error(`Fallback GPU service error: ${response.status} ${response.statusText}`);
      }
    } catch (error: unknown) {
      lastError = ensureError(error);
      console.warn(`Fallback attempt failed for service ${fallbackService.url}:`, lastError.message);
    }
  }
  // If all attempts and fallbacks fail
  throw lastError || error(500, ensureError({ message: 'All GPU processing attempts failed.' }));
}

// Helper function to generate a unique request ID
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Helper function to generate a cache key from tensor data
function generateCacheKey(tensorData: TensorData): string {
  // A simple hash of shape and data for caching purposes
  const shapeString = tensorData.shape.join(',');
  const dataSample = tensorData.data.slice(0, 10).join(','); // Use a sample for performance
  return `${shapeString}-${dataSample}-${tensorData.layout || ''}-${tensorData.lodLevel || ''}`;
}

// Helper function to generate a route hash (can be more sophisticated)
function generateRouteHash(cacheKey: string): string {
  // For now, just return the cacheKey, but could be a more specific routing hash
  return `route-${cacheKey}`;
}

// Helper function to update processing statistics
function updateProcessingStats(processingTime: number, cacheHit: boolean): void {
  // Update average processing time using a moving average or simple average
  if (stats.successfulRequests === 0) {
    stats.averageProcessingTime = processingTime;
  } else {
    stats.averageProcessingTime =
      (stats.averageProcessingTime * stats.successfulRequests + processingTime) / (stats.successfulRequests + 1);
  }
  if (cacheHit) {
    stats.cacheHits++;
  }
}