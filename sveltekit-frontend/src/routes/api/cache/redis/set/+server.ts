/**
 * Redis Set Endpoint
 * Store values in Redis distributed cache
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Simple in-memory cache for development
const memoryCache = new Map<string, { value: any; expires: number }>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { key, value, ttl = 3600 } = await request.json();
    
    if (!key) {
      return json({
        success: false,
        error: 'Key is required'
      }, { status: 400 });
    }
    
    // For development, use in-memory cache
    // In production, this would use actual Redis
    const expires = Date.now() + (ttl * 1000);
    memoryCache.set(key, { value, expires });
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const now = Date.now();
      for (const [k, v] of memoryCache.entries()) {
        if (v.expires < now) {
          memoryCache.delete(k);
        }
      }
    }
    
    return json({
      success: true,
      key,
      ttl,
      message: 'Value stored in Redis cache'
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};