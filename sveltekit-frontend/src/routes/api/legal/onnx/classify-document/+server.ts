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
    
    // Use the ONNX-enhanced classification from ollama service
    const result = await ollamaService.classifyLegalDocument(text);
    
    return json({
      success: true,
      predictions: result.predictions,
      topPrediction: result.topPrediction,
      processingTime: result.processingTime,
      modelUsed: result.modelUsed,
      totalTime: Date.now() - startTime
    });
    
  } catch (error: any) {
    console.error('Document classification error:', error);
    return json(
      { 
        success: false, 
        error: 'Document classification failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
};