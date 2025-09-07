import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Mock storage reference - same as save endpoint
const canvasStorage = new Map<string, any>();

export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    const canvas = canvasStorage.get(id);
    
    if (!canvas) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    return json({
      success: true,
      canvas
    });

  } catch (err) {
    console.error('Canvas load error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to load canvas');
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const { canvas_json, metadata, name } = await request.json();
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    if (!canvas_json) {
      return json(
        { error: 'Missing required field: canvas_json' },
        { status: 400 }
      );
    }

    const existingCanvas = canvasStorage.get(id);
    
    if (!existingCanvas) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    const updatedCanvas = {
      ...existingCanvas,
      canvas_json,
      metadata: metadata || existingCanvas.metadata,
      name: name || existingCanvas.name,
      updated_at: new Date().toISOString()
    };

    canvasStorage.set(id, updatedCanvas);

    return json({
      success: true,
      message: 'Canvas updated successfully',
      canvas_id: id,
      updated_at: updatedCanvas.updated_at
    });

  } catch (err) {
    console.error('Canvas update error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to update canvas');
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    const canvas = canvasStorage.get(id);
    
    if (!canvas) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    canvasStorage.delete(id);

    return json({
      success: true,
      message: 'Canvas deleted successfully',
      canvas_id: id
    });

  } catch (err) {
    console.error('Canvas delete error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to delete canvas');
  }
};