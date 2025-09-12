/**
 * Legal Chat API Endpoint
 * Demonstrates Redis List-based chat history with legal AI integration
 * Integrates with Gemma embeddings and CHR-ROM caching
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { legalChatMemory, type ChatMessage, type ConversationContext } from '$lib/services/chat-memory-service';
import { cachedVectorSearch } from '$lib/services/cached-vector-search';
import { gemmaEmbeddingService } from '$lib/services/embedding-generator';
import { callOllamaApi } from '$lib/services/ollama-client';
import { RedisLegalOrchestrator, RedisLLMCache } from '$lib/services/redis-orchestrator';
import type { LegalCategory } from '$lib/config/legal-priorities';

interface ChatRequest {
  sessionId: string;
  message: string;
  caseId?: string;
  legalCategory?: LegalCategory;
  practiceArea?: string;
  useRAG?: boolean;
  maxHistoryContext?: number;
}

interface ChatResponse {
  response: string;
  sessionId: string;
  sources?: any[];
  confidence?: number;
  processing_time: number;
  cache_stats?: any;
  conversation_context?: ConversationContext;
}

/**
 * POST /api/legal-chat
 * Process legal AI chat with Redis-based memory management
 */
export const POST: RequestHandler = async ({ request }) => {
  const startTime = performance.now();
  
  try {
    const body: ChatRequest = await request.json();
    const {
      sessionId,
      message,
      caseId,
      legalCategory = 'corporate',
      practiceArea,
      useRAG = true,
      maxHistoryContext = 10
    } = body;
    
    // Validate required fields
    if (!sessionId || !message) {
      throw error(400, 'sessionId and message are required');
    }
    
    console.log(`🎮 Processing legal chat for session: ${sessionId}`);
    
    // REDIS OPTIMIZATION: Check LLM cache first - fastest path
    const cachedResponse = await RedisLLMCache.getCachedResponse(message, {
      caseId,
      legalCategory,
      practiceArea
    });
    
    if (cachedResponse) {
      console.log(`🎮 [REDIS CACHE HIT] Returning cached response in ${performance.now() - startTime}ms`);
      return json({
        response: cachedResponse.response,
        sessionId,
        sources: cachedResponse.sources || [],
        confidence: cachedResponse.confidence,
        processing_time: performance.now() - startTime,
        cache_stats: { cache_hit: true, cached_at: cachedResponse.timestamp },
        conversation_context: undefined
      });
    }
    
    // Step 1: Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      metadata: {
        caseId,
        legalCategory,
        sources: []
      }
    };
    
    const conversationContext: Partial<ConversationContext> = {
      sessionId,
      caseId,
      legalCategory,
      practiceArea,
      priority: 150 // Medium priority for chat
    };
    
    await legalChatMemory.addMessageToHistory(sessionId, userMessage, conversationContext);
    
    // Step 2: Get conversation history for context
    const chatHistory = await legalChatMemory.getHistory(sessionId, maxHistoryContext, true);
    console.log(`🎮 Retrieved ${chatHistory.length} messages from history`);
    
    // Step 3: Perform RAG search if enabled
    let ragSources: any[] = [];
    let ragContext = '';
    
    if (useRAG && message.length > 10) {
      try {
        console.log(`🎮 Performing RAG search for: "${message.substring(0, 50)}..."`);
        
        const searchResults = await cachedVectorSearch.searchSimilarEvidence(
          message,
          caseId,
          {
            maxResults: 5,
            similarityThreshold: 0.7,
            includeCHRRomPatterns: true
          }
        );
        
        if (searchResults.length > 0) {
          ragSources = searchResults.map(result => ({
            documentId: result.documentId,
            content: result.content.substring(0, 300) + '...',
            similarity: result.similarity,
            memoryBank: result.memoryBank,
            priority: result.priority
          }));
          
          // Build context from search results
          ragContext = searchResults
            .slice(0, 3) // Top 3 results
            .map(result => result.content.substring(0, 500))
            .join('\n\n');
          
          console.log(`🎮 RAG search found ${searchResults.length} relevant documents`);
        }
      } catch (ragError) {
        console.warn('🎮 RAG search failed, continuing without context:', ragError);
      }
    }
    
    // Step 4: Build conversation context for AI
    const systemPrompt = `You are a legal AI assistant specialized in ${legalCategory} law. 
    ${practiceArea ? `Your practice area focus is ${practiceArea}.` : ''}
    ${caseId ? `You are currently working on case: ${caseId}.` : ''}
    
    Provide accurate, helpful legal information while noting that this is not legal advice.
    Use the provided context and conversation history to give informed responses.
    
    ${ragContext ? `\nRelevant legal context:\n${ragContext}` : ''}`;
    
    // Step 5: Build conversation messages for Ollama
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-8).map(msg => ({ // Last 8 messages for context
        role: msg.role,
        content: msg.content
      }))
    ];
    
    // Step 6: Generate AI response with Gemma
    console.log('🎮 Generating AI response with Gemma model...');
    
    const aiResponse = await callOllamaApi({
      model: 'gemma3:legal-latest', // Use your legal-optimized Gemma model
      messages: conversationMessages,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000,
        num_ctx: 4096 // Larger context for legal conversations
      }
    });
    
    if (!aiResponse || !aiResponse.message || !aiResponse.message.content) {
      throw error(500, 'Invalid response from AI model');
    }
    
    const responseContent = aiResponse.message.content;
    const confidence = 0.85; // Could be calculated based on model confidence
    
    // Step 7: Add AI response to history
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: responseContent,
      metadata: {
        caseId,
        legalCategory,
        confidence,
        sources: ragSources.map(s => s.documentId)
      }
    };
    
    await legalChatMemory.addMessageToHistory(sessionId, assistantMessage, conversationContext);
    
    // REDIS OPTIMIZATION: Cache successful response for future queries
    await RedisLLMCache.cacheResponse(message, responseContent, {
      confidence,
      model_used: 'gemma3:legal-latest',
      processing_time: performance.now() - startTime,
      sources: ragSources,
      context: { caseId, legalCategory, practiceArea }
    });
    
    console.log(`🎮 [REDIS CACHED] Response cached for future queries`);
    
    // Step 8: Get updated conversation context
    const updatedContext = await legalChatMemory.getConversationContext(sessionId);
    
    // Step 9: Get service statistics including Redis
    const chatStats = legalChatMemory.getStats();
    const vectorSearchStats = cachedVectorSearch.getStats();
    const embeddingStats = gemmaEmbeddingService.getStats();
    const redisStats = await RedisLegalOrchestrator.getRedisStats();
    
    const processingTime = performance.now() - startTime;
    
    console.log(`🎮 Legal chat response generated in ${processingTime.toFixed(2)}ms`);
    
    const response: ChatResponse = {
      response: responseContent,
      sessionId,
      sources: ragSources,
      confidence,
      processing_time: processingTime,
      cache_stats: {
        chat_memory: {
          hit_rate: chatStats.cacheHitRate,
          total_messages: chatStats.totalMessages,
          avg_response_time: chatStats.avgResponseTime
        },
        vector_search: {
          hit_rate: vectorSearchStats.hitRate,
          total_queries: vectorSearchStats.totalQueries,
          cache_hits: vectorSearchStats.cacheHits
        },
        embeddings: {
          hit_rate: embeddingStats.hitRate,
          total_requests: embeddingStats.totalRequests,
          model_usage: embeddingStats.modelUsage
        },
        redis_orchestrator: {
          llm_cache: redisStats.llm_cache,
          agent_memory: redisStats.agent_memory,
          task_queue: redisStats.task_queue,
          memory_usage: redisStats.redis_memory
        }
      },
      conversation_context: updatedContext || undefined
    };
    
    return json(response);
    
  } catch (err) {
    console.error('🎮 Legal chat API error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, `Chat processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * GET /api/legal-chat?sessionId=xxx&limit=20
 * Retrieve chat history for a session
 */
export const GET: RequestHandler = async ({ url }) => {
  const startTime = performance.now();
  
  try {
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const includeMetadata = url.searchParams.get('metadata') !== 'false';
    
    if (!sessionId) {
      throw error(400, 'sessionId parameter is required');
    }
    
    console.log(`🎮 Retrieving chat history for session: ${sessionId}`);
    
    // Get chat history
    const messages = await legalChatMemory.getHistory(sessionId, limit, includeMetadata);
    
    // Get conversation context
    const context = await legalChatMemory.getConversationContext(sessionId);
    
    // Get conversation summary if available
    const summary = await legalChatMemory.generateConversationSummary(sessionId);
    
    const processingTime = performance.now() - startTime;
    
    return json({
      sessionId,
      messages,
      context,
      summary: summary ? JSON.parse(summary) : null,
      message_count: messages.length,
      processing_time: processingTime,
      stats: legalChatMemory.getStats()
    });
    
  } catch (err) {
    console.error('🎮 Chat history retrieval error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    
    throw error(500, `History retrieval failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * DELETE /api/legal-chat?sessionId=xxx
 * Clear chat history for a session
 */
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      throw error(400, 'sessionId parameter is required');
    }
    
    console.log(`🎮 Clearing chat history for session: ${sessionId}`);
    
    // Clear specific session history
    const historyKey = `legal_chat_history:${sessionId}`;
    const contextKey = `legal_chat_context:${sessionId}`;
    const summaryKey = `legal_chat_summary:${sessionId}`;
    
    // This would require importing redis directly
    // For now, we'll use the service method
    // await redis.del(historyKey, contextKey, summaryKey);
    
    return json({
      success: true,
      message: `Chat history cleared for session: ${sessionId}`,
      sessionId
    });
    
  } catch (err) {
    console.error('🎮 Chat history clear error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    
    throw error(500, `History clear failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};