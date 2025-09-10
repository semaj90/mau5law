/**
 * Client-side API wrapper for SIMD Glyph Embeds
 * Provides typed interface to /api/glyph/simd-embeds endpoint
 */

export interface SIMDGlyphConfig {
  enable_tiling: boolean;
  tile_size: number;
  compression_target: number;
  shader_format: 'webgl' | 'webgpu' | 'css' | 'svg';
  adaptive_quality: boolean;
  performance_tier: 'nes' | 'snes' | 'n64';
}

export interface GlyphEmbedRequest {
  evidence_id: string | number;
  prompt: string;
  style?: string;
  dimensions?: [number, number];
  seed?: number;
  conditioning_tensors?: string[];
  neural_sprite_config?: {
    enable_compression: boolean;
    target_ratio: number;
    predictive_frames: number;
  };
  simd_config?: Partial<SIMDGlyphConfig>;
}

export interface SIMDShaderData {
  tiled_data: Float32Array;
  shader_code: string;
  compression_ratio: number;
  tile_map: Array<{
    index: number;
    pattern_id: string;
    frequency: number;
    compressed_size: number;
  }>;
  performance_stats: {
    tiling_time_ms: number;
    compression_time_ms: number;
    shader_generation_time_ms: number;
    total_optimization_time_ms: number;
  };
}

export interface GlyphEmbedResult {
  glyph_url: string;
  simd_shader_data: SIMDShaderData | null;
  tensor_ids: string[];
  generation_time_ms: number;
  cache_hits: number;
  enhanced_artifact_url?: string;
}

export interface GlyphEmbedResponse {
  success: boolean;
  data?: GlyphEmbedResult;
  error?: string;
  metadata?: {
    evidence_id: string | number;
    prompt: string;
    style: string;
    dimensions: [number, number];
    simd_optimized: boolean;
    compression_ratio: number;
    shader_format?: string;
    performance_tier?: string;
    generated_at: string;
  };
}

export interface GlyphHealthStatus {
  service: string;
  status: string;
  timestamp: string;
  features: {
    simd_gpu_tiling: boolean;
    adaptive_quality_scaling: boolean;
    shader_generation: boolean;
    chr_rom_compression: boolean;
    tensor_caching: boolean;
    png_embedding: boolean;
    neural_sprite_integration: boolean;
    portable_artifacts: boolean;
  };
  supported_formats: string[];
  performance_tiers: string[];
  compression_targets: number[];
  integration_status: {
    glyph_diffusion_service: string;
    simd_gpu_tiling_engine: string;
    png_embed_extractor: string;
  };
}

/**
 * SIMD Glyph Embeds API Client
 */
export class GlyphEmbedsClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate SIMD-optimized glyph with shader embeds
   */
  async generateGlyph(request: GlyphEmbedRequest): Promise<GlyphEmbedResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/glyph/simd-embeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evidence_id: request.evidence_id,
          prompt: request.prompt,
          style: request.style || 'detective',
          dimensions: request.dimensions || [512, 512],
          seed: request.seed,
          conditioning_tensors: request.conditioning_tensors,
          neural_sprite_config: request.neural_sprite_config,
          simd_config: {
            enable_tiling: true,
            tile_size: 16,
            compression_target: 50,
            shader_format: 'webgpu',
            adaptive_quality: true,
            performance_tier: 'n64',
            ...request.simd_config
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: GlyphEmbedResponse = await response.json();
      
      // Convert tiled_data back to Float32Array if it exists
      if (result.data?.simd_shader_data?.tiled_data) {
        const tiledDataArray = result.data.simd_shader_data.tiled_data;
        if (Array.isArray(tiledDataArray)) {
          result.data.simd_shader_data.tiled_data = new Float32Array(tiledDataArray);
        }
      }

      return result;

    } catch (error) {
      console.error('SIMD glyph generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get health status of SIMD glyph service
   */
  async getHealthStatus(): Promise<{ success: boolean; data?: GlyphHealthStatus; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/glyph/simd-embeds`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Generate multiple glyphs with different configurations
   */
  async generateGlyphVariations(
    baseRequest: GlyphEmbedRequest,
    variations: Partial<GlyphEmbedRequest>[]
  ): Promise<GlyphEmbedResponse[]> {
    const requests = variations.map(variation => ({
      ...baseRequest,
      ...variation
    }));

    const results = await Promise.allSettled(
      requests.map(request => this.generateGlyph(request))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { success: false, error: result.reason?.message || 'Generation failed' }
    );
  }

  /**
   * Create shader code for WebGL/WebGPU rendering
   */
  async createShaderForCanvas(
    glyphResult: GlyphEmbedResult,
    targetFormat: 'webgl' | 'webgpu' = 'webgpu'
  ): Promise<{ success: boolean; shaderCode?: string; error?: string }> {
    try {
      if (!glyphResult.simd_shader_data) {
        throw new Error('No SIMD shader data available');
      }

      const shaderData = glyphResult.simd_shader_data;
      
      // Check if shader format matches target
      if (shaderData.shader_code.includes('@compute') && targetFormat === 'webgpu') {
        return {
          success: true,
          shaderCode: shaderData.shader_code
        };
      }

      if (shaderData.shader_code.includes('precision mediump') && targetFormat === 'webgl') {
        return {
          success: true,
          shaderCode: shaderData.shader_code
        };
      }

      // Need to regenerate shader for different format
      console.warn(`Shader format mismatch. Generated for different target. Using as-is.`);
      return {
        success: true,
        shaderCode: shaderData.shader_code
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shader creation failed'
      };
    }
  }

  /**
   * Download enhanced PNG artifact with embedded metadata
   */
  async downloadEnhancedArtifact(
    glyphResult: GlyphEmbedResult,
    filename?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!glyphResult.enhanced_artifact_url) {
        throw new Error('No enhanced artifact available');
      }

      const link = document.createElement('a');
      link.href = glyphResult.enhanced_artifact_url;
      link.download = filename || `glyph_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }
}

// Default instance
export const glyphEmbedsClient = new GlyphEmbedsClient();

// Utility functions
export const GLYPH_PRESETS = {
  detective: {
    style: 'detective',
    simd_config: {
      performance_tier: 'n64' as const,
      shader_format: 'webgpu' as const,
      compression_target: 50
    }
  },
  legal: {
    style: 'legal',
    simd_config: {
      performance_tier: 'snes' as const,
      shader_format: 'webgl' as const,
      compression_target: 25
    }
  },
  retro: {
    style: 'retro',
    simd_config: {
      performance_tier: 'nes' as const,
      shader_format: 'css' as const,
      compression_target: 100
    }
  },
  modern: {
    style: 'modern',
    simd_config: {
      performance_tier: 'n64' as const,
      shader_format: 'webgpu' as const,
      compression_target: 10
    }
  }
} as const;

export function createGlyphRequest(
  evidenceId: string | number,
  prompt: string,
  preset: keyof typeof GLYPH_PRESETS = 'detective'
): GlyphEmbedRequest {
  return {
    evidence_id: evidenceId,
    prompt,
    ...GLYPH_PRESETS[preset]
  };
}