import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Individual cache key API endpoint for headless UI cache sync
 * GET /api/cache/[key] - Get specific cache entry
 */

// Mock cache implementation - would integrate with actual Redis in production
const mockCache = new Map<string, {
  value: any;
  timestamp: number;
  ttl: number;
  version: string;
}>();

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { key } = params;
    const decodedKey = decodeURIComponent(key);
    
    const entry = mockCache.get(decodedKey);
    
    if (!entry) {
      return json(
        { success: false, error: 'Cache key not found' },
        { status: 404 }
      );
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      mockCache.delete(decodedKey);
      return json(
        { success: false, error: 'Cache key expired' },
        { status: 404 }
      );
    }
    
    return json({
      success: true,
      key: decodedKey,
      value: entry.value,
      version: entry.version,
      timestamp: entry.timestamp,
      ttl: entry.ttl
    });
    
  } catch (error: any) {
    console.error('[Cache API] Individual key fetch failed:', error);
    return json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};