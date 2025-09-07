import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { ollamaChatStream } from '$lib/services/ollamaChatStream';
import {
  initializeChatEmbeddingsTable,
  searchSimilarChats,
  type VectorSearchResult
} from '$lib/server/services/vectorDBService';

// Initialize database on startup
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized) {
    await initializeChatEmbeddingsTable();
    dbInitialized = true;
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface EnhancedChatRequest {
  message: string;
  messages?: ChatMessage[];
  conversationId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  useVectorSearch?: boolean;
  searchThreshold?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  conversationId?: string;
  sources?: VectorSearchResult[];
  metadata?: {
    model: string;
    temperature: number;
    processingTimeMs: number;
    vectorSearchUsed: boolean;
    timestamp: string;
  };
  error?: string;
}

// GET method for health check and service info
export const GET: RequestHandler = async ({ url }) => {
  try {
    await ensureDbInitialized();

    const action = url.searchParams.get('action') || 'health';

    if (action === 'health') {
      // Check Ollama service
      const ollamaHealth = await fetch('http://localhost:11434/api/version', {
        signal: AbortSignal.timeout(3000)
      });

      if (!ollamaHealth.ok) {
        throw new Error('Ollama service unavailable');
      }

      const version = await ollamaHealth.json();

      return json({
        success: true,
        status: 'healthy',
        service: 'enhanced-chat-v2',
        features: {
          pgvectorEmbeddings: true,
          keywordFallback: true,
          streamingSupport: true,
          vectorCache: true
        },
        ollama: {
          version: version.version || 'unknown',
          model: 'legal:latest'
        },
        database: {
          pgvector: true,
          embeddingsTable: 'chat_embeddings'
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'search') {
      const query = url.searchParams.get('q');
      const limit = parseInt(url.searchParams.get('limit') || '5');

      if (!query) {
        return json({ error: 'Query parameter "q" is required' }, { status: 400 });
      }

      const results = await searchSimilarChats(query, limit, 0.6);

      return json({
        success: true,
        query,
        results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    }

    return json({
      success: false,
      error: 'Invalid action. Use ?action=health or ?action=search'
    }, { status: 400 });

  } catch (error: any) {
    console.error('Enhanced chat GET error:', error);
    return json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
};

// POST method for enhanced chat with vector embeddings
export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();

  try {
    await ensureDbInitialized();

    const body = await request.json() as EnhancedChatRequest;
    const {
      message,
      messages,
      conversationId = `conv_${Date.now()}`,
      model = 'legal:latest',
      temperature = 0.1,
      maxTokens = 2048,
      stream = false,
      useVectorSearch = true,
      searchThreshold = 0.7,
      systemPrompt
    } = body;

    if (!message && (!messages || messages.length === 0)) {
      return json({
        success: false,
        error: 'Message or messages array is required'
      }, { status: 400 });
    }

    // Use the message directly or get the last user message from messages array
    const userMessage = message || messages?.filter(m => m.role === 'user').pop()?.content || '';

    if (!userMessage) {
      return json({
        success: false,
        error: 'No user message found'
      }, { status: 400 });
    }

    // For streaming responses
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            const streamGenerator = ollamaChatStream({
              message: userMessage,
              model,
              temperature,
              maxTokens,
              systemPrompt,
              conversationId,
              useVectorSearch,
              searchThreshold,
              context: messages || []
            });

            let sources: VectorSearchResult[] = [];

            for await (const chunk of streamGenerator) {
              if (chunk.metadata?.type === 'sources') {
                sources = (chunk.metadata.sources as any as VectorSearchResult[]) || [];
                const sourcesChunk = {
                  type: 'sources',
                  sources,
                  timestamp: new Date().toISOString()
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(sourcesChunk)}\n\n`));
              } else if (chunk.metadata?.type === 'text') {
                const textChunk = {
                  type: 'text',
                  text: chunk.text,
                  confidence: chunk.metadata.confidence || 0.9
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`));
              } else if (chunk.metadata?.type === 'final') {
                const finalChunk = {
                  type: 'final',
                  conversationId,
                  processingTimeMs: Date.now() - startTime,
                  vectorSearchUsed: useVectorSearch,
                  sources
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
              }
            }

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error: any) {
            console.error('Streaming error:', error);
            const errorChunk = {
              type: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // For non-streaming responses
    let fullResponse = '';
    let sources: VectorSearchResult[] = [];
    let vectorSearchUsed = false;

    const streamGenerator = ollamaChatStream({
      message: userMessage,
      model,
      temperature,
      maxTokens,
      systemPrompt,
      conversationId,
      useVectorSearch,
      searchThreshold,
      context: messages || []
    });

    for await (const chunk of streamGenerator) {
      if (chunk.metadata?.type === 'sources') {
        sources = (chunk.metadata.sources as any as VectorSearchResult[]) || [];
        vectorSearchUsed = sources.length > 0;
      } else if (chunk.metadata?.type === 'text') {
        fullResponse += chunk.text;
      }
    }

    const response: ChatResponse = {
      success: true,
      response: fullResponse,
      conversationId,
      sources: sources.length > 0 ? sources : undefined,
      metadata: {
        model,
        temperature,
        processingTimeMs: Date.now() - startTime,
        vectorSearchUsed,
        timestamp: new Date().toISOString()
      }
    };

    return json(response);

  } catch (error: any) {
    console.error('Enhanced chat API error:', error);
    return json({
      success: false,
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : String(error),
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};