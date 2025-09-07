import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    name: 'Evidence Canvas API',
    version: '1.0.0',
    description: 'API endpoints for evidence canvas analysis and management',
    endpoints: {
      'GET /api/evidence-canvas': 'Get API information',
      'POST /api/evidence-canvas/analyze': 'Analyze canvas content with AI',
      'POST /api/evidence-canvas/save': 'Save canvas state',
      'GET /api/evidence-canvas/{id}': 'Load saved canvas'
    },
    features: [
      'Canvas content analysis',
      'Object detection and classification',
      'Text extraction from annotations',
      'AI-powered evidence summarization',
      'Layout analysis and optimization suggestions'
    ]
  });
};