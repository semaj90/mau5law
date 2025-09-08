/**
 * Redis Get Endpoint
 * Retrieve values from Redis distributed cache
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Import the same memory cache from set endpoint
// In production, this would be actual Redis
const memoryCache = new Map<string, { value: any; expires: number }>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { key } = await request.json();
    
    if (!key) {
      return json({
        success: false,
        error: 'Key is required'
      }, { status: 400 });
    }
    
    // Get from memory cache (Redis simulation)
    const cached = memoryCache.get(key);
    
    if (!cached) {
      return json({
        success: true,
        key,
        value: null,
        message: 'Key not found in cache'
      });
    }
    
    // Check if expired
    if (cached.expires < Date.now()) {
      memoryCache.delete(key);
      return json({
        success: true,
        key,
        value: null,
        message: 'Key expired and removed from cache'
      });
    }
    
    return json({
      success: true,
      key,
      value: cached.value,
      message: 'Value retrieved from Redis cache'
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};