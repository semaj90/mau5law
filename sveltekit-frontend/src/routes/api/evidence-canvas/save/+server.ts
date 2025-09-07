import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock storage - in production, this would use a database
const canvasStorage = new Map<string, any>();

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { canvas_json, metadata, name } = await request.json();
    
    if (!canvas_json) {
      return json(
        { error: 'Missing required field: canvas_json' },
        { status: 400 }
      );
    }

    const canvasId = `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const savedCanvas = {
      id: canvasId,
      canvas_json,
      metadata: metadata || {},
      name: name || `Evidence Canvas ${new Date().toLocaleDateString()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save to mock storage
    canvasStorage.set(canvasId, savedCanvas);

    return json({
      success: true,
      canvas_id: canvasId,
      message: 'Canvas saved successfully',
      saved_at: savedCanvas.created_at
    });

  } catch (error) {
    console.error('Canvas save error:', error);
    return json(
      { 
        error: 'Failed to save canvas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};

export const GET: RequestHandler = async () => {
  // Return list of saved canvases
  const canvases = Array.from(canvasStorage.values()).map(canvas => ({
    id: canvas.id,
    name: canvas.name,
    created_at: canvas.created_at,
    updated_at: canvas.updated_at,
    object_count: canvas.metadata?.object_count || 0
  }));

  return json({
    canvases,
    total: canvases.length
  });
};