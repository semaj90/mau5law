// src/lib/api/production-service-client.ts
/**
 * Production Service Client for Integration Testing
 * Simplified wrapper around the main production client for testing purposes
 */
import type { ServiceRequest, ServiceResponse } from './production-client.js';
}
export interface IntegrationServiceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string | object;
  timeout?: number;
}
class ProductionServiceClient {
  private baseUrl: string;
  constructor(baseUrl: string = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
  }
  async makeRequest(endpoint: string, options: IntegrationServiceRequest): Promise<ServiceResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = performance.now();
    try {
      const fetchOptions: RequestInit = {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        signal: AbortSignal.timeout(options.timeout || 5000)
      };
      // Handle body data
      if (options.body) {
        if (typeof options.body === 'string') {
          fetchOptions.body = options.body;
        } else {
          fetchOptions.body = JSON.stringify(options.body);
        }
      }
      const response = await fetch(url, fetchOptions);
      const latency = performance.now() - startTime;
      let data: any;
      try {
        data = await (response as { json?: any; text?: any; status?: any; headers?: any }).json();
      } catch (parseError) {
        // Handle non-JSON responses
        data = {
          error: 'Non-JSON response',
          text: await (response as { json?: any; text?: any; status?: any; headers?: any }).text(),
          parseError: parseError.message
        };
      }
      return {
        data,
        status: (response as { json?: any; text?: any; status?: any; headers?: any }).status,
        headers: Object.fromEntries((response as { json?: any; text?: any; status?: any; headers?: any }).headers.entries()),
        protocol: 'HTTP/1.1',
        service: this.extractServiceFromEndpoint(endpoint),
        latency
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      // Handle network errors, timeouts, etc.
      return {
        data: {
          error: error.message,
          type: error.name,
          code: 'NETWORK_ERROR'
        },
        status: 0, // Indicates network failure
        headers: { [key: string]: any },
        protocol: 'HTTP/1.1',
        service: this.extractServiceFromEndpoint(endpoint),
        latency
      };
    }
  }
  private extractServiceFromEndpoint(endpoint: string): string {
    // Extract service name from endpoint for logging
    const parts = endpoint.split('/').filter(Boolean);
    return parts[0] || 'unknown';
  }
  // Convenience methods for common patterns
  async get(endpoint: string, headers?: Record<string, string>): Promise<ServiceResponse> {
    return this.makeRequest(endpoint, { method: 'GET', headers });
  }
  async post(endpoint: string, body?: object, headers?: Record<string, string>): Promise<ServiceResponse> {
    return this.makeRequest(endpoint, { method: 'POST', body, headers });
  }
  async put(endpoint: string, body?: object, headers?: Record<string, string>): Promise<ServiceResponse> {
    return this.makeRequest(endpoint, { method: 'PUT', body, headers });
  }
  async patch(endpoint: string, body?: object, headers?: Record<string, string>): Promise<ServiceResponse> {
    return this.makeRequest(endpoint, { method: 'PATCH', body, headers });
  }
  async delete(endpoint: string, headers?: Record<string, string>): Promise<ServiceResponse> {
    return this.makeRequest(endpoint, { method: 'DELETE', headers });
  }
  // Health check for service availability
  async checkServiceHealth(servicePath: string = '/health'): Promise<boolean> {
    try {
      const response = await this.get(servicePath);
      return (response as { json?: any; text?: any; status?: any; headers?: any }).status >= 200 && (response as { json?: any; text?: any; status?: any; headers?: any }).status < 300;
    } catch (error) {
      return false;
    }
  }
  // Bulk health check for multiple services
  async checkServicesHealth(services: string[]): Promise<Record<string, boolean> {
    const results: Record<string, boolean> = {};
    await Promise.all(services.map(async (service) => {
        results[service] = await this.checkServiceHealth(`/${service}/health`));
      })
    );
    return results;
  }
  // Performance benchmarking utility
  async benchmark(endpoint: string, options: IntegrationServiceRequest, iterations: number = 5): Promise<any> {
    const results: ServiceResponse[] = [];
    let successCount = 0;
    for (let i = 0; i < iterations; i++) {
      const result = await this.makeRequest(endpoint, options);
      results.push(result);
      if ((result as { status?: any }).status >= 200 && (result as { status?: any }).status < 300) {
        successCount++;
      }
    }
    const latencies = results.map(r => r.latency);
    return {
      averageLatency: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      minLatency: Math.min(...latencies),
      maxLatency: Math.max(...latencies),
      successRate: successCount / iterations,
      results
    };
  }
}
// Export singleton instance for tests
export const productionServiceClient = new ProductionServiceClient();
// Export class for custom instances
export { ProductionServiceClient };