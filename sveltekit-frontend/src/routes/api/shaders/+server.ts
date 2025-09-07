import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { shaderCacheManager } from '$lib/webgpu/shader-cache-manager';
import { cache } from '$lib/server/cache/redis';
import type { CompiledShader } from '$lib/webgpu/shader-cache-manager';

// GET endpoint - List all cached shaders with pagination
export const GET: RequestHandler = async ({ url }) => {
  try {
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));

    // Get shader index
    const shaderIndex = await cache.get<string[]>('webgpu_shader_index') || [];
    const total = shaderIndex.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, total);

    const shaders = [];
    for (let i = startIndex; i < endIndex; i++) {
      const shaderId = shaderIndex[i];
      const shader = await cache.get<CompiledShader>(`webgpu_shader:${shaderId}`);
      
      if (shader) {
        shaders.push({
          id: shader.id,
          config: shader.config,
          metadata: {
            ...shader.metadata,
            compiledAt: new Date(shader.metadata.compiledAt).toISOString(),
            lastUsed: new Date(shader.metadata.lastUsed).toISOString(),
          },
          // Include preview of WGSL for list view
          wgslPreview: shader.wgsl.length > 200 ? 
            shader.wgsl.substring(0, 200) + '...' : shader.wgsl,
          hasEmbedding: !!shader.embedding
        });
      }
    }

    return json({
      shaders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    return json({ error: 'Failed to list shaders' }, { status: 500 });
  }
};

// POST endpoint - Cache a new shader with embedding
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    const { 
      id, 
      wgsl, 
      config, 
      description, 
      operation, 
      tags = [] 
    } = body;

    // Validate required fields
    if (!id || !wgsl || !config) {
      return json({
        error: 'Missing required fields: id, wgsl, config'
      }, { status: 400 });
    }

    // Create shader object
    const shader: CompiledShader = {
      id,
      wgsl,
      config,
      metadata: {
        compiledAt: Date.now(),
        lastUsed: Date.now(),
        compileTime: 0,
        cacheHit: false,
        usageCount: 0,
        averageExecutionTime: 0,
        description: description || `WebGPU ${config.type} shader`,
        operation: operation || config.type,
        tags: tags || [config.type, 'webgpu']
      }
    };

    // Cache with embedding generation
    await shaderCacheManager.cacheShaderWithEmbedding(
      shader, 
      shader.metadata.description, 
      shader.metadata.operation, 
      shader.metadata.tags
    );

    return json({
      success: true,
      message: 'Shader cached with embedding',
      shader: {
        id: shader.id,
        metadata: {
          ...shader.metadata,
          compiledAt: new Date(shader.metadata.compiledAt).toISOString(),
          lastUsed: new Date(shader.metadata.lastUsed).toISOString(),
        }
      }
    });

  } catch (error: any) {
    console.error('Failed to cache shader:', error);
    return json({
      error: 'Failed to cache shader: ' + error.message
    }, { status: 500 });
  }
};

// DELETE endpoint - Clear shader cache
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const shaderId = url.searchParams.get('id');
    
    if (shaderId) {
      // Delete specific shader
      const shader = await cache.get<CompiledShader>(`webgpu_shader:${shaderId}`);
      if (!shader) {
        return json({ error: 'Shader not found' }, { status: 404 });
      }

      // Remove from cache
      await cache.delete(`webgpu_shader:${shaderId}`);
      
      // Update index
      const index = await cache.get<string[]>('webgpu_shader_index') || [];
      const newIndex = index.filter(id => id !== shaderId);
      await cache.set('webgpu_shader_index', newIndex, 24 * 60 * 60 * 1000);

      return json({
        success: true,
        message: `Shader ${shaderId} deleted`
      });

    } else {
      // Clear all shaders
      const index = await cache.get<string[]>('webgpu_shader_index') || [];
      
      // Delete all shader entries
      for (const id of index) {
        await cache.delete(`webgpu_shader:${id}`);
      }
      
      // Clear index
      await cache.delete('webgpu_shader_index');

      return json({
        success: true,
        message: `Cleared ${index.length} shaders from cache`
      });
    }

  } catch (error: any) {
    return json({ error: 'Failed to delete shaders' }, { status: 500 });
  }
};