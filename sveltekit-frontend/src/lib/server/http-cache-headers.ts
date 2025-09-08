/**
 * HTTP Cache Headers Utility
 * Provides optimal caching strategies for different endpoint types
 * Maximizes browser cache efficiency while ensuring data freshness
 */

export interface CacheConfig {
  maxAge?: number;          // Cache-Control max-age in seconds
  staleWhileRevalidate?: number;  // stale-while-revalidate in seconds
  staleIfError?: number;    // stale-if-error in seconds
  mustRevalidate?: boolean; // must-revalidate flag
  noCache?: boolean;        // no-cache flag
  private?: boolean;        // private vs public cache
  etag?: string;           // ETag for conditional requests
  lastModified?: Date;     // Last-Modified header
}

export interface ResponseWithCacheHeaders extends Response {
  headers: Headers;
}

/**
 * Cache strategies for different content types
 */
export const CACHE_STRATEGIES = {
  // Static content (embeddings, processed documents) - 1 hour
  STATIC_CONTENT: {
    maxAge: 3600,
    staleWhileRevalidate: 86400, // 1 day
    staleIfError: 604800, // 1 week
    private: false
  },
  
  // Vector search results - 30 minutes with background refresh
  VECTOR_SEARCH: {
    maxAge: 1800,
    staleWhileRevalidate: 3600,
    staleIfError: 7200,
    private: false
  },
  
  // AI responses - 15 minutes, private cache
  AI_RESPONSES: {
    maxAge: 900,
    staleWhileRevalidate: 1800,
    private: true
  },
  
  // Legal document summaries - 1 hour
  DOCUMENT_SUMMARIES: {
    maxAge: 3600,
    staleWhileRevalidate: 7200,
    private: false
  },
  
  // User-specific data - short cache, private
  USER_DATA: {
    maxAge: 300,
    staleWhileRevalidate: 600,
    private: true,
    mustRevalidate: true
  },
  
  // Real-time data - minimal caching
  REALTIME: {
    maxAge: 60,
    mustRevalidate: true,
    private: true
  },
  
  // Immutable content (with versioned URLs)
  IMMUTABLE: {
    maxAge: 31536000, // 1 year
    private: false
  }
} as const;

/**
 * Generate Cache-Control header value
 */
function generateCacheControlHeader(config: CacheConfig): string {
  const parts: string[] = [];
  
  if (config.noCache) {
    parts.push('no-cache');
  } else {
    // Visibility
    parts.push(config.private ? 'private' : 'public');
    
    // Max age
    if (config.maxAge !== undefined) {
      parts.push(`max-age=${config.maxAge}`);
    }
    
    // Stale while revalidate
    if (config.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
    
    // Stale if error
    if (config.staleIfError !== undefined) {
      parts.push(`stale-if-error=${config.staleIfError}`);
    }
    
    // Must revalidate
    if (config.mustRevalidate) {
      parts.push('must-revalidate');
    }
  }
  
  return parts.join(', ');
}

/**
 * Generate ETag from content
 */
function generateETag(content: any): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256')
    .update(typeof content === 'string' ? content : JSON.stringify(content))
    .digest('hex');
  return `"${hash.substring(0, 16)}"`;
}

/**
 * Apply cache headers to a Response object
 */
export function applyCacheHeaders(
  response: Response, 
  strategy: keyof typeof CACHE_STRATEGIES | CacheConfig,
  options: {
    content?: any;
    generateETag?: boolean;
    lastModified?: Date;
  } = {}
): Response {
  const config = typeof strategy === 'string' ? CACHE_STRATEGIES[strategy] : strategy;
  const headers = new Headers(response.headers);
  
  // Cache-Control header
  const cacheControl = generateCacheControlHeader(config);
  headers.set('Cache-Control', cacheControl);
  
  // Vary header for better caching
  headers.set('Vary', 'Accept, Accept-Encoding, Authorization');
  
  // ETag header
  if (options.generateETag && options.content) {
    const etag = generateETag(options.content);
    headers.set('ETag', etag);
  }
  
  // Last-Modified header
  if (options.lastModified) {
    headers.set('Last-Modified', options.lastModified.toUTCString());
  }
  
  // Create new response with cache headers
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * SvelteKit helper to create cached JSON responses
 */
export function cachedJson(
  data: any,
  strategy: keyof typeof CACHE_STRATEGIES | CacheConfig,
  options: {
    status?: number;
    generateETag?: boolean;
    lastModified?: Date;
  } = {}
) {
  const jsonString = JSON.stringify(data);
  const response = new Response(jsonString, {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return applyCacheHeaders(response, strategy, {
    content: data,
    generateETag: options.generateETag ?? true,
    lastModified: options.lastModified
  });
}

/**
 * Check if request has conditional headers (If-None-Match, If-Modified-Since)
 */
export function checkConditionalHeaders(
  request: Request,
  etag?: string,
  lastModified?: Date
): { isNotModified: boolean; shouldSend304: boolean } {
  const ifNoneMatch = request.headers.get('If-None-Match');
  const ifModifiedSince = request.headers.get('If-Modified-Since');
  
  let isNotModified = false;
  
  // Check ETag
  if (ifNoneMatch && etag) {
    // Handle weak ETags and multiple ETags
    const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());
    isNotModified = clientETags.includes(etag) || clientETags.includes('*');
  }
  
  // Check Last-Modified (only if ETag check didn't determine modification)
  if (!isNotModified && ifModifiedSince && lastModified) {
    const clientDate = new Date(ifModifiedSince);
    const resourceDate = new Date(lastModified);
    
    // Resource is not modified if it's older than or equal to client's date
    isNotModified = resourceDate <= clientDate;
  }
  
  return {
    isNotModified,
    shouldSend304: isNotModified
  };
}

/**
 * Create 304 Not Modified response
 */
export function notModifiedResponse(etag?: string, lastModified?: Date): Response {
  const headers = new Headers();
  
  if (etag) {
    headers.set('ETag', etag);
  }
  
  if (lastModified) {
    headers.set('Last-Modified', lastModified.toUTCString());
  }
  
  return new Response(null, {
    status: 304,
    headers
  });
}

/**
 * Middleware wrapper for adding cache headers to endpoint responses
 */
export function withCacheHeaders<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  strategy: keyof typeof CACHE_STRATEGIES | CacheConfig,
  options: {
    generateETag?: boolean;
    getLastModified?: (...args: any[]) => Date | undefined;
    skipConditionalCheck?: boolean;
  } = {}
): T {
  return (async (...args: any[]) => {
    const [event] = args;
    const request = event.request;
    
    // Handle conditional requests if not skipped
    if (!options.skipConditionalCheck) {
      const lastModified = options.getLastModified?.(...args);
      
      if (options.generateETag || lastModified) {
        // For conditional checks, we need to run the handler to get content
        // This is a simplified approach - in production, you'd want more sophisticated caching
        const response = await handler(...args);
        const data = await response.json();
        const etag = options.generateETag ? generateETag(data) : undefined;
        
        const { shouldSend304 } = checkConditionalHeaders(request, etag, lastModified);
        
        if (shouldSend304) {
          return notModifiedResponse(etag, lastModified);
        }
        
        // Return response with cache headers
        return cachedJson(data, strategy, {
          status: response.status,
          generateETag: options.generateETag,
          lastModified
        });
      }
    }
    
    // Normal response with cache headers
    const response = await handler(...args);
    const data = await response.json();
    
    return cachedJson(data, strategy, {
      status: response.status,
      generateETag: options.generateETag,
      lastModified: options.getLastModified?.(...args)
    });
  }) as T;
}

/**
 * Utility to clear cache-related headers (for debugging)
 */
export function clearCacheHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  headers.delete('Cache-Control');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.delete('Expires');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}