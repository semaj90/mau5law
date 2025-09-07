import type { RequestHandler } from './$types.js';

/*
 * QUIC Gateway API - HTTP/3 Gateway Proxy
 * Provides high-performance HTTP/3 connectivity to SvelteKit frontend
 * Port: 8443 (QUIC), 8444 (HTTP/2 fallback)
 */
import { json, error } from '@sveltejs/kit';

import { ensureError } from '$lib/utils/ensure-error';
import { productionServiceClient } from '$lib/services/production-service-client.js';
import { URL } from "url";

const QUIC_GATEWAY_CONFIG = {
  primaryPort: 8443,    // QUIC HTTP/3
  fallbackPort: 8444,   // HTTP/2
  baseUrl: 'http://localhost:8443',
  fallbackUrl: 'http://localhost:8444',
  timeout: 10000,
  retryAttempts: 2
};

/*
 * GET /api/v1/quic/gateway - Gateway health and status
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    // Check gateway health
    const healthResponse = await fetch(`${QUIC_GATEWAY_CONFIG.baseUrl}/health`, {
      signal: AbortSignal.timeout(QUIC_GATEWAY_CONFIG.timeout)
    });

    let gatewayStatus = 'healthy';
    let responseData: any = {};

    if (healthResponse.ok) {
      responseData = await healthResponse.json();
    } else {
      // Try fallback HTTP/2 
      const fallbackResponse = await fetch(`${QUIC_GATEWAY_CONFIG.fallbackUrl}/health`, {
        signal: AbortSignal.timeout(QUIC_GATEWAY_CONFIG.timeout)
      });

      if (fallbackResponse.ok) {
        responseData = await fallbackResponse.json();
        gatewayStatus = 'fallback';
      } else {
        gatewayStatus = 'unhealthy';
      }
    }

    return json({
      service: 'quic-gateway',
      status: gatewayStatus,
      protocol: gatewayStatus === 'healthy' ? 'HTTP/3' : gatewayStatus === 'fallback' ? 'HTTP/2' : 'N/A',
      ports: {
        quic: QUIC_GATEWAY_CONFIG.primaryPort,
        fallback: QUIC_GATEWAY_CONFIG.fallbackPort
      },
      backend: responseData.backend || 'http://localhost:5173',
      features: [
        'HTTP/3 (QUIC)',
        'HTTP/2 Fallback',
        'TLS Certificate Generation',
        'Proxy Headers',
        'Health Monitoring'
      ],
      metrics: responseData.metrics || null,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('QUIC Gateway health check failed:', err);
    
    return json({
      service: 'quic-gateway',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/*
 * POST /api/v1/quic/gateway - Route request through QUIC gateway
 */
export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const body = await request.json();
    const targetPath = url.searchParams.get('path') || '/';
    const useHttp3 = url.searchParams.get('http3') !== 'false';

    // Determine target URL
    const targetUrl = useHttp3 
      ? `${QUIC_GATEWAY_CONFIG.baseUrl}${targetPath}`
      : `${QUIC_GATEWAY_CONFIG.fallbackUrl}${targetPath}`;

    // Forward request through QUIC gateway with retry logic
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < QUIC_GATEWAY_CONFIG.retryAttempts; attempt++) {
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': request.headers.get('x-forwarded-for') || 'unknown',
            'X-Forwarded-Proto': useHttp3 ? 'https' : 'http',
            'X-QUIC-Request': 'true'
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(QUIC_GATEWAY_CONFIG.timeout)
        });

        if (!response.ok) {
          throw new Error(`Gateway responded with ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();

        return json({
          success: true,
          data: responseData,
          protocol: useHttp3 ? 'HTTP/3' : 'HTTP/2',
          gateway: 'quic-gateway',
          attempt: attempt + 1,
          timestamp: new Date().toISOString()
        });

      } catch (attemptError) {
        lastError = attemptError as Error;
        console.warn(`QUIC Gateway attempt ${attempt + 1} failed:`, attemptError);
        
        // On first attempt failure with HTTP/3, try HTTP/2 fallback
        if (attempt === 0 && useHttp3) {
          useHttp3 = false;
        }
      }
    }

    // All attempts failed
    throw lastError || new Error('All gateway attempts failed');

  } catch (err: any) {
    console.error('QUIC Gateway proxy error:', err);
    error(500, ensureError({
      message: 'Gateway proxy failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }));
  }
};

/*
 * PUT /api/v1/quic/gateway - Update gateway configuration
 */
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const config = await request.json();

    // Validate configuration
    if (config.primaryPort && (config.primaryPort < 1024 || config.primaryPort > 65535)) {
      error(400, ensureError({ message: 'Invalid primary port' }));
    }

    if (config.fallbackPort && (config.fallbackPort < 1024 || config.fallbackPort > 65535)) {
      error(400, ensureError({ message: 'Invalid fallback port' }));
    }

    // Update configuration (in a real implementation, this would be persisted)
    const updatedConfig = {
      ...QUIC_GATEWAY_CONFIG,
      ...config,
      lastUpdated: new Date().toISOString()
    };

    return json({
      success: true,
      message: 'Gateway configuration updated',
      config: updatedConfig
    });

  } catch (err: any) {
    console.error('Gateway configuration update failed:', err);
    error(500, ensureError({
      message: 'Configuration update failed',
      error: err instanceof Error ? err.message : 'Unknown error'
    }));
  }
};