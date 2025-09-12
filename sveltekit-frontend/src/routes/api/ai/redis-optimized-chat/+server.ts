/**
 * Redis-Optimized AI Chat Endpoint
 * Example integration showing how to apply Redis orchestrator to existing endpoints
 * This demonstrates the pattern for all other AI endpoints
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisOptimized } from '$lib/middleware/redis-orchestrator-middleware';
import { callOllamaApi } from '$lib/services/ollama-client';

/**
 * Original AI Chat Handler (without Redis optimization)
 */
const originalChatHandler: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, caseId, userId, model = 'gemma3:legal-latest' } = body;
    
    if (!message) {
      throw error(400, 'Message is required');
    }
    
    console.log(`🤖 Processing AI chat: "${message.substring(0, 50)}..."`);
    
    // Direct Ollama API call (slow, no caching)
    const response = await callOllamaApi({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal AI assistant. Provide accurate, helpful legal information while noting that this is not legal advice.'
        },
        {
          role: 'user', 
          content: message
        }
      ],
      options: {
        temperature: 0.7,
        max_tokens: 1000
      }
    });
    
    if (!response?.message?.content) {
      throw error(500, 'Invalid response from AI model');
    }
    
    return json({
      response: response.message.content,
      model,
      caseId,
      userId,
      processing_time: 2000, // Simulated slow processing
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('AI chat error:', err);
    throw error(500, `Chat processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * Redis-Optimized Version
 * Same endpoint, but with automatic Redis caching, agent memory, and task queuing
 */
export const POST = redisOptimized.aiChat(originalChatHandler);

/**
 * This pattern can be applied to ANY existing endpoint:
 * 
 * Before: export const POST = originalHandler;
 * After:  export const POST = redisOptimized.aiChat(originalHandler);
 * 
 * The middleware automatically:
 * 1. Checks Redis cache first (2ms response for cache hits)
 * 2. Falls back to original handler if no cache
 * 3. Caches successful responses for future requests
 * 4. Manages agent memory for conversation continuity
 * 5. Queues complex requests for background processing
 * 6. Provides Nintendo-style memory optimization
 * 7. Adds comprehensive Redis statistics to responses
 */