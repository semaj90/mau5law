/**
 * Redis Get Recent Endpoint  
 * Retrieve recent cache entries for sync operations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Memory cache with timestamps for development
const memoryCache = new Map<string, { value: any; expires: number; timestamp: number }>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { prefix, since } = await request.json();
    
    if (!prefix || !since) {
      return json({
        success: false,
        error: 'Prefix and since timestamp are required'
      }, { status: 400 });
    }
    
    const now = Date.now();
    const entries: Array<{ key: string; value: any; timestamp: number }> = [];
    
    // Get recent entries matching prefix
    for (const [key, cached] of memoryCache.entries()) {
      // Check if key matches prefix
      if (!key.startsWith(prefix)) continue;
      
      // Check if not expired
      if (cached.expires < now) {
        memoryCache.delete(key);
        continue;
      }
      
      // Check if recent enough
      const entryTimestamp = cached.timestamp || cached.expires - (3600 * 1000); // Fallback
      if (entryTimestamp >= since) {
        entries.push({
          key,
          value: cached.value,
          timestamp: entryTimestamp
        });
      }
    }
    
    // Sort by timestamp (most recent first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    return json({
      success: true,
      prefix,
      since,
      count: entries.length,
      entries: entries.slice(0, 100) // Limit to 100 entries
    });
    
  } catch (error: any) {
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
};