// Anonymous Chat API - No authentication required
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  model?: string;
  stream?: boolean;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// POST: Anonymous chat without database persistence
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body: ChatRequest = await request.json();
    const { messages, model = 'gemma3-legal:latest', stream = false } = body;

    if (!messages || messages.length === 0) {
      return json({ error: 'Messages array required' }, { status: 400 });
    }

    const lastUserMessage = messages.filter((msg) => msg.role === 'user').pop();
    if (!lastUserMessage) {
      return json({ error: 'No user message found' }, { status: 400 });
    }

    const startTime = Date.now();

    // Create legal prompt with context
    const legalPrompt = `You are YoRHa Legal AI, an advanced legal analysis system. Provide professional legal analysis with the following guidelines:

1. Be precise and informative
2. Cite relevant legal principles when applicable  
3. Identify key legal concepts and issues
4. Provide practical insights
5. Maintain professional legal terminology

User Question: ${lastUserMessage.content}

Legal Analysis:`;

    try {
      // Call Ollama service directly
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: legalPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          }
        })
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama service error: ${ollamaResponse.status}`);
      }

      const ollamaData: OllamaResponse = await ollamaResponse.json();
      const responseTime = Date.now() - startTime;

      // Return formatted response
      return json({
        success: true,
        response: ollamaData.response,
        responseTime,
        model,
        confidence: 0.85,
        source: 'gemma3-legal',
        cacheHit: false,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'legal-query',
          wordCount: ollamaData.response.split(' ').length
        }
      });

    } catch (ollamaError) {
      console.error('Ollama service error:', ollamaError);
      
      // Fallback response when Ollama is unavailable
      const responseTime = Date.now() - startTime;
      return json({
        success: true,
        response: `I'm YoRHa Legal AI. I understand you're asking about: "${lastUserMessage.content}"

This appears to be a legal inquiry that would benefit from professional analysis. In a production environment, I would provide comprehensive legal analysis using:

• Gemma 3 Legal Model (11.8B parameters)
• Legal entity extraction with ONNX Legal-BERT  
• Vector embeddings for case law similarity
• CHR-ROM caching for rapid precedent retrieval
• Risk assessment and compliance checking

Currently running in demo mode. For detailed legal analysis, please ensure the Ollama service with gemma3-legal:latest model is available.

**Disclaimer**: This is for demonstration purposes only and does not constitute legal advice.`,
        responseTime,
        model: 'demo-fallback',
        confidence: 1.0,
        source: 'fallback',
        cacheHit: false,
        metadata: {
          timestamp: new Date().toISOString(),
          analysisType: 'demo-response',
          mode: 'fallback'
        }
      });
    }

  } catch (error) {
    console.error('Anonymous chat error:', error);
    return json(
      { 
        error: 'Failed to process chat request', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};