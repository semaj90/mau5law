/**
 * Simple Redis Connection Test
 * Direct test of Redis connectivity without complex caching logic
 */

import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'
import { getRedisService } from '$lib/server/redis/redis-service'

export const GET: RequestHandler = async () => {
  try {
    const start = performance.now()

    // Get Redis service instance
    const redisService = getRedisService()

    // Test Redis service health
    const isHealthy = redisService.isHealthy()
    const stats = redisService.getStats()

    // Test basic operations
    const testKey = 'test:simple-connection'
    const testValue = `test-${Date.now()}`

    // Set value using cache method
    await redisService.setCache(testKey, testValue, 60)

    // Get value using cache method
    const getValue = await redisService.getCache(testKey)

    // Delete value using cache method (if available)
    try {
      await redisService.deleteCache?.(testKey)
    } catch (e) {
      console.log('Delete method not available:', e)
    }

    const end = performance.now()

    return json({
      success: true,
      redis: {
        healthy: isHealthy,
        connected: stats.connected,
        status: stats.status
      },
      test: {
        setResult,
        getValue,
        deleteResult,
        valueMatches: getValue === testValue
      },
      timing: {
        totalTime: `${(end - start).toFixed(2)}ms`
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return json()
      {
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}