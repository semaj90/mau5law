/**
 * Minimal Vector Evidence API - Simplified for error reduction
 */

import { json, type RequestHandler } from '@sveltejs/kit'
import { z } from 'zod'

// Simple request schema
const VectorRequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(100).default(10)
})

// Simple response type
interface VectorResponse {
  success: boolean
  data?: any[]
  error?: string
  endpoint?: string
}

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const endpoint = params.endpoint
    const limit = parseInt(url.searchParams.get('limit') || '10')

    const response: VectorResponse = {
      success: true,
      data: [],
      endpoint
    }

    switch (endpoint) {
      case 'search':
        response.data = [
          { id: '1', similarity: 0.95, title: 'Sample Evidence 1' },
          { id: '2', similarity: 0.87, title: 'Sample Evidence 2' }
        ]
        break

      case 'similarity':
        response.data = [
          { source: '1', target: '2', score: 0.85 }
        ]
        break

      case 'cluster':
        response.data = [
          { cluster: 1, documents: ['1', '2'] },
          { cluster: 2, documents: ['3', '4'] }
        ]
        break

      case 'health':
        response.data = [{ status: 'ok', timestamp: new Date().toISOString() }]
        break

      default:
        return json({ success: false, error: 'Unknown endpoint' }, { status: 404 })
    }

    return json(response)
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const endpoint = params.endpoint
    const body = await request.json()

    // Basic validation
    const validatedData = VectorRequestSchema.safeParse(body)
    if (!validatedData.success) {
      return json({
        success: false,
        error: 'Invalid request data'
      }, { status: 400 })
    }

    const response: VectorResponse = {
      success: true,
      data: [],
      endpoint
    }

    // Simple mock responses based on endpoint
    switch (endpoint) {
      case 'search':
        response.data = [
          {
            id: 'evidence-1',
            similarity: 0.92,
            title: `Evidence matching: ${validatedData.data.query}`,
            type: 'document'
          }
        ]
        break

      case 'embed':
        response.data = [
          {
            id: 'embed-1',
            vector: Array(384).fill(0).map(() => Math.random()),
            dimensions: 384
          }
        ]
        break

      default:
        response.data = [{ message: `Processed ${endpoint} request`, query: validatedData.data.query }]
    }

    return json(response)
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing error'
    }, { status: 500 })
  }
}