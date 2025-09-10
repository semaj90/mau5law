import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ollamaService } from '$lib/server/ai/ollama-service';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { text, options = {} } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return json({ error: 'Text field is required and must be a string' }, { status: 400 });
    }
    
    const startTime = Date.now();
    
    // Use the ONNX-enhanced embedding generation from ollama service
    const embeddings = await ollamaService.generateLegalEmbeddings(text);
    
    return json({
      success: true,
      embeddings,
      dimensions: embeddings.length,
      processingTime: Date.now() - startTime,
      modelUsed: 'legal-bert-onnx'
    });
    
  } catch (error: any) {
    console.error('Embedding generation error:', error);
    return json(
      { 
        success: false, 
        error: 'Embedding generation failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
};