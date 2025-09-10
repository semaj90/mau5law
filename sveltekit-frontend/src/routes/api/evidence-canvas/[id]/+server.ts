/**
 * Evidence Canvas State Management API
 * 
 * Handles CRUD operations for legal evidence canvas states with:
 * - Database persistence via PostgreSQL + Drizzle ORM
 * - In-memory caching for performance (Redis alternative)
 * - Canvas annotations management
 * - Version control and state tracking
 * 
 * @module EvidenceCanvasAPI
 * @version 2.1.0
 * @requires drizzle-orm
 * @requires postgresql
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, canvasStates, canvasAnnotations } from '$lib/server/db/client.js';
import { eq, and } from 'drizzle-orm';

// CanvasStateCache - In-memory cache for performance optimization
const CanvasStateCache = new Map<string, { 
  data: any; 
  timestamp: number; 
  ttl: number; 
  version: number; 
}>();
const CANVAS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
const CACHE_VERSION = 1;

/**
 * CanvasCacheManager - Retrieves cached canvas state
 * @param id Canvas state ID
 * @returns Cached canvas data or null if expired/missing
 */
function getCanvasFromCache(id: string) {
  const cached = CanvasStateCache.get(id);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  CanvasStateCache.delete(id);
  return null;
}

/**
 * CanvasCacheManager - Stores canvas state in cache
 * @param id Canvas state ID
 * @param data Canvas data to cache
 * @param ttl Cache time-to-live (optional)
 */
function setCanvasInCache(id: string, data: any, ttl: number = CANVAS_CACHE_TTL) {
  CanvasStateCache.set(id, {
    data,
    timestamp: Date.now(),
    ttl,
    version: CACHE_VERSION
  });
}

/**
 * CanvasCacheManager - Invalidates cached canvas state
 * @param id Canvas state ID to invalidate
 */
function invalidateCanvasCache(id: string) {
  CanvasStateCache.delete(id);
  console.log(`🗑️  Canvas cache invalidated for ID: ${id}`);
}

export const GET: RequestHandler = async ({ params, url }) => {
  try {
    const { id } = params;
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    // CanvasCacheManager - Check cache first for performance
    const cached = getCanvasFromCache(id);
    if (cached) {
      console.log(`📋 Canvas cache hit for ID: ${id}`);
      return json({
        success: true,
        canvas: cached,
        cached: true,
        source: 'cache'
      });
    }

    // Query database for canvas state
    const canvasState = await db
      .select()
      .from(canvasStates)
      .where(eq(canvasStates.id, id))
      .limit(1);
    
    if (!canvasState.length) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    // Get annotations for this canvas
    const annotations = await db
      .select()
      .from(canvasAnnotations)
      .where(eq(canvasAnnotations.evidenceId, id));

    // Combine canvas state with annotations
    const canvas = {
      ...canvasState[0],
      annotations: annotations,
      canvas_json: canvasState[0].canvasData, // Map to expected field name
      metadata: {
        version: canvasState[0].version,
        isDefault: canvasState[0].isDefault,
        annotationCount: annotations.length
      }
    };

    // CanvasCacheManager - Cache the result for future requests
    setCanvasInCache(id, canvas);
    console.log(`💾 Canvas cached for ID: ${id}`);

    return json({
      success: true,
      canvas,
      cached: false,
      source: 'database'
    });

  } catch (err) {
    console.error('Canvas load error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to load canvas from database');
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const { canvas_json, metadata, name, annotations } = await request.json();
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    if (!canvas_json) {
      return json(
        { error: 'Missing required field: canvas_json' },
        { status: 400 }
      );
    }

    // Check if canvas exists
    const existingCanvas = await db
      .select()
      .from(canvasStates)
      .where(eq(canvasStates.id, id))
      .limit(1);
    
    if (!existingCanvas.length) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    // Update canvas state in database
    const updatedCanvas = await db
      .update(canvasStates)
      .set({
        canvasData: canvas_json,
        name: name || existingCanvas[0].name,
        version: existingCanvas[0].version + 1,
        updatedAt: new Date().toISOString()
      })
      .where(eq(canvasStates.id, id))
      .returning();

    // Update annotations if provided
    if (annotations && Array.isArray(annotations)) {
      // Delete existing annotations for this canvas
      await db
        .delete(canvasAnnotations)
        .where(eq(canvasAnnotations.evidenceId, id));

      // Insert new annotations
      if (annotations.length > 0) {
        await db
          .insert(canvasAnnotations)
          .values(annotations.map(ann => ({
            evidenceId: id,
            fabricData: ann.fabricData || ann,
            annotationType: ann.annotationType || 'annotation',
            coordinates: ann.coordinates || {},
            boundingBox: ann.boundingBox || {},
            text: ann.text || null,
            color: ann.color || '#ffffff',
            layerOrder: ann.layerOrder || 0,
            isVisible: ann.isVisible !== false,
            metadata: ann.metadata || {},
            createdBy: null, // TODO: Get from session
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })));
      }
    }

    // CanvasCacheManager - Invalidate and update cache
    invalidateCanvasCache(id);

    // CanvasResponseBuilder - Create response with updated data
    const responseData = {
      ...updatedCanvas[0],
      canvas_json,
      annotations: annotations || [],
      metadata: {
        ...metadata,
        version: updatedCanvas[0].version,
        annotationCount: annotations?.length || 0,
        lastModified: updatedCanvas[0].updatedAt
      }
    };

    // CanvasCacheManager - Update cache with new data
    setCanvasInCache(id, responseData);
    console.log(`🔄 Canvas updated and cached for ID: ${id}`);

    return json({
      success: true,
      message: 'Canvas updated successfully',
      canvas_id: id,
      canvas: responseData,
      updated_at: updatedCanvas[0].updatedAt
    });

  } catch (err) {
    console.error('Canvas update error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to update canvas in database');
  }
};

/**
 * CanvasDeleteHandler - Deletes canvas state and annotations
 * @description Removes canvas from database and invalidates cache
 */
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    if (!id) {
      throw error(400, 'Canvas ID is required');
    }

    // CanvasStateValidator - Check if canvas exists before deletion
    const existingCanvas = await db
      .select({ id: canvasStates.id, name: canvasStates.name })
      .from(canvasStates)
      .where(eq(canvasStates.id, id))
      .limit(1);
    
    if (!existingCanvas.length) {
      throw error(404, `Canvas with ID ${id} not found`);
    }

    // CanvasAnnotationManager - Delete all related annotations first
    const deletedAnnotations = await db
      .delete(canvasAnnotations)
      .where(eq(canvasAnnotations.evidenceId, id))
      .returning({ id: canvasAnnotations.id });

    // CanvasStateManager - Delete canvas state
    const deletedCanvas = await db
      .delete(canvasStates)
      .where(eq(canvasStates.id, id))
      .returning({ id: canvasStates.id, name: canvasStates.name });

    // CanvasCacheManager - Invalidate cache
    invalidateCanvasCache(id);

    console.log(`🗑️  Canvas deleted: ${deletedCanvas[0].name} (${id}) with ${deletedAnnotations.length} annotations`);

    return json({
      success: true,
      message: 'Canvas deleted successfully',
      canvas_id: id,
      canvas_name: deletedCanvas[0].name,
      deleted_annotations: deletedAnnotations.length,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('CanvasDeleteHandler error:', err);
    
    if (err && typeof err === 'object' && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, 'Failed to delete canvas from database');
  }
};