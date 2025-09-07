/**
 * Ollama Health Check API
 * 
 * Checks connectivity and status of Ollama service
 * Used by chat components to determine if WebAssembly fallback should be used
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async () => {
  try {
    const ollamaBaseUrl = import.meta.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    // Check if Ollama is responding
    const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      
      return json({
        success: true,
        status: 'connected',
        baseUrl: ollamaBaseUrl,
        models: data.models || [],
        timestamp: new Date().toISOString()
      });
    } else {
      return json({
        success: false,
        status: 'unavailable',
        error: `HTTP ${response.status}: ${response.statusText}`,
        baseUrl: ollamaBaseUrl,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Ollama health check failed:', error);
    
    return json({
      success: false,
      status: 'error',
      error: error.message || 'Connection failed',
      baseUrl: import.meta.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
};