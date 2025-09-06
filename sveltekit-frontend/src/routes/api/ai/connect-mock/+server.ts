import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


/**
 * Production AI Connection Endpoint
 * Connects to actual Ollama service running on port 11434
 * Validates model availability and establishes connection
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { model } = await request.json();
    const targetModel = model || 'gemma3-legal';
    
    // Check Ollama service availability
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (ollamaResponse.ok) {
        const { models } = await ollamaResponse.json();
        const availableModels = models.map((m: any) => m.name);
        
        // Test connection with specified model
        if (availableModels.includes(targetModel)) {
          const testResponse = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: targetModel,
              prompt: 'Connection test',
              stream: false,
              options: { num_predict: 1 }
            }),
            signal: AbortSignal.timeout(10000)
          });
          
          if (testResponse.ok) {
            return json({
              success: true,
              model: targetModel,
              availableModels,
              status: 'connected',
              timestamp: new Date().toISOString(),
              production: true,
              service: 'ollama',
              endpoint: 'http://localhost:11434',
              message: `Successfully connected to ${targetModel} model`
            });
          }
        }
        
        return json({
          success: false,
          error: 'Model not available',
          availableModels,
          requestedModel: targetModel,
          message: 'Requested model not found in Ollama service'
        }, { status: 400 });
      }
    } catch (ollamaError) {
      // Fallback to production Enhanced RAG service
      try {
        const ragResponse = await fetch('http://localhost:8094/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        
        if (ragResponse.ok) {
          return json({
            success: true,
            model: 'enhanced-rag-service',
            availableModels: ['enhanced-rag-legal', 'vector-search', 'semantic-analysis'],
            status: 'connected',
            timestamp: new Date().toISOString(),
            production: true,
            service: 'enhanced-rag',
            endpoint: 'http://localhost:8094',
            message: 'Connected to Enhanced RAG service (Go microservice)'
          });
        }
      } catch (ragError) {
        // Final fallback - development mode
        return json({
          success: true,
          model: 'development-mode',
          availableModels: ['development-legal-ai'],
          status: 'development',
          timestamp: new Date().toISOString(),
          production: false,
          fallback: true,
          message: 'AI services unavailable - using development mode',
          details: {
            ollama: (ollamaError as Error).message,
            enhancedRAG: (ragError as Error).message
          }
        });
      }
    }
  } catch (error: any) {
    return json({
      success: false,
      error: 'AI connection failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};