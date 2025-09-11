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
  // RAG enhancement fields
  rag_config?: {
    enable_chunking: boolean;
    chunk_size: number;
    overlap_size: number;
    enable_summarization: boolean;
    enable_vector_store: boolean;
  };
  article_urls?: string[];
  content_sources?: Array<{
    type: 'article' | 'document' | 'text';
    url?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  }>;
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
  // RAG enhancement results
  rag_results?: {
    chunks_processed: number;
    embeddings_generated: number;
    vector_store_updates: number;
    summary_tokens: number;
    semantic_matches: Array<{
      content: string;
      score: number;
      chunk_id: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  synthesized_glyphs?: Array<{
    base_glyph_id: string;
    combined_glyph_id: string;
    synthesis_confidence: number;
    did_you_mean_suggestions: string[];
  }>;
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
   * Fetch articles and process with RAG chunking for glyph synthesis
   */
  async processArticlesWithRAG(
    articles: Array<{url?: string, content?: string, metadata?: Record<string, unknown>}>,
    options: {
      chunk_size?: number;
      overlap_size?: number;
      enable_summarization?: boolean;
      enable_vector_store?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    chunks?: Array<{
      id: string;
      content: string;
      embedding?: number[];
      summary?: string;
      metadata?: Record<string, unknown>;
    }>;
    error?: string;
  }> {
    try {
      const {
        chunk_size = 512,
        overlap_size = 50,
        enable_summarization = true,
        enable_vector_store = true
      } = options;

      const processedChunks = [];

      for (const article of articles) {
        let content = article.content;
        
        // Fetch article if URL provided
        if (article.url && !content) {
          try {
            const response = await fetch(article.url);
            content = await response.text();
          } catch (error) {
            console.warn(`Failed to fetch article: ${article.url}`, error);
            continue;
          }
        }

        if (!content) continue;

        // Chunk the content
        const chunks = this.chunkText(content, chunk_size, overlap_size);
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkId = `${article.url || 'text'}_chunk_${i}_${Date.now()}`;
          
          let summary = '';
          let embedding: number[] | undefined;

          // Generate summary using gemma3:legal-latest
          if (enable_summarization) {
            try {
              const summaryResponse = await fetch(`${this.baseUrl}/api/llm/gemma3-legal/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content: chunk,
                  max_tokens: 150,
                  legal_context: true
                })
              });
              
              if (summaryResponse.ok) {
                const summaryResult = await summaryResponse.json();
                summary = summaryResult.summary || '';
              }
            } catch (error) {
              console.warn('Summarization failed:', error);
            }
          }

          // Generate embeddings using gemma embeds
          try {
            const embedResponse = await fetch(`${this.baseUrl}/api/embeddings/gemma`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: summary || chunk,
                model: 'embeddinggemma:latest'
              })
            });
            
            if (embedResponse.ok) {
              const embedResult = await embedResponse.json();
              embedding = embedResult.embedding;
            }
          } catch (error) {
            console.warn('Embedding generation failed:', error);
          }

          // Update pgvector store
          if (enable_vector_store && embedding) {
            try {
              await fetch(`${this.baseUrl}/api/vector/pgvector/store`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: chunkId,
                  content: chunk,
                  summary: summary,
                  embedding: embedding,
                  metadata: {
                    ...article.metadata,
                    source_url: article.url,
                    chunk_index: i,
                    processed_at: new Date().toISOString(),
                    content_type: 'article_chunk'
                  }
                })
              });
            } catch (error) {
              console.warn('Vector store update failed:', error);
            }
          }

          processedChunks.push({
            id: chunkId,
            content: chunk,
            embedding,
            summary,
            metadata: {
              ...article.metadata,
              source_url: article.url,
              chunk_index: i
            }
          });
        }
      }

      return {
        success: true,
        chunks: processedChunks
      };

    } catch (error) {
      console.error('RAG processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'RAG processing failed'
      };
    }
  }

  /**
   * Synthesize glyphs from multiple base glyphs with 'did you mean' suggestions
   */
  async synthesizeGlyphs(
    baseGlyphIds: string[],
    prompt: string,
    options: {
      enable_did_you_mean?: boolean;
      max_suggestions?: number;
      cache_synthesized?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    synthesized_glyph?: {
      id: string;
      glyph_url: string;
      base_glyph_ids: string[];
      confidence: number;
      generation_time_ms: number;
    };
    did_you_mean_suggestions?: string[];
    error?: string;
  }> {
    try {
      const {
        enable_did_you_mean = true,
        max_suggestions = 5,
        cache_synthesized = true
      } = options;

      // Generate synthesis request
      const synthesisResponse = await fetch(`${this.baseUrl}/api/glyph/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_glyph_ids: baseGlyphIds,
          prompt: prompt,
          synthesis_config: {
            enable_neural_blending: true,
            preserve_legal_semantics: true,
            target_format: 'webgpu'
          }
        })
      });

      if (!synthesisResponse.ok) {
        throw new Error(`Synthesis failed: ${synthesisResponse.statusText}`);
      }

      const synthesisResult = await synthesisResponse.json();
      let didYouMeanSuggestions: string[] = [];

      // Generate 'did you mean' suggestions using gemma3:legal-latest
      if (enable_did_you_mean) {
        try {
          const suggestionsResponse = await fetch(`${this.baseUrl}/api/llm/gemma3-legal/suggest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              original_prompt: prompt,
              base_glyphs: baseGlyphIds,
              max_suggestions: max_suggestions,
              context_type: 'legal_synthesis'
            })
          });
          
          if (suggestionsResponse.ok) {
            const suggestionsResult = await suggestionsResponse.json();
            didYouMeanSuggestions = suggestionsResult.suggestions || [];
          }
        } catch (error) {
          console.warn('Did you mean suggestions failed:', error);
        }
      }

      // Cache synthesized glyph if enabled
      if (cache_synthesized && synthesisResult.success) {
        try {
          await fetch(`${this.baseUrl}/api/glyph/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              glyph_id: synthesisResult.synthesized_glyph.id,
              glyph_data: synthesisResult.synthesized_glyph,
              synthesis_metadata: {
                base_glyphs: baseGlyphIds,
                prompt: prompt,
                suggestions: didYouMeanSuggestions,
                cached_at: new Date().toISOString()
              }
            })
          });
        } catch (error) {
          console.warn('Glyph caching failed:', error);
        }
      }

      return {
        success: true,
        synthesized_glyph: synthesisResult.synthesized_glyph,
        did_you_mean_suggestions: didYouMeanSuggestions
      };

    } catch (error) {
      console.error('Glyph synthesis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Synthesis failed'
      };
    }
  }

  /**
   * Search cached glyphs using semantic similarity
   */
  async searchGlyphsSemanticly(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      include_synthesized?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    matches?: Array<{
      glyph_id: string;
      score: number;
      metadata?: Record<string, unknown>;
    }>;
    error?: string;
  }> {
    try {
      const { limit = 10, threshold = 0.7, include_synthesized = true } = options;

      // Generate query embedding
      const embedResponse = await fetch(`${this.baseUrl}/api/embeddings/gemma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: query,
          model: 'embeddinggemma:latest'
        })
      });

      if (!embedResponse.ok) {
        throw new Error('Failed to generate query embedding');
      }

      const { embedding } = await embedResponse.json();

      // Search pgvector store
      const searchResponse = await fetch(`${this.baseUrl}/api/vector/pgvector/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embedding: embedding,
          limit: limit,
          threshold: threshold,
          filter: {
            content_type: include_synthesized ? ['glyph', 'synthesized_glyph'] : ['glyph']
          }
        })
      });

      if (!searchResponse.ok) {
        throw new Error('Vector search failed');
      }

      const searchResults = await searchResponse.json();

      return {
        success: true,
        matches: searchResults.matches || []
      };

    } catch (error) {
      console.error('Semantic glyph search failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Chunk text content for RAG processing
   */
  private chunkText(text: string, chunkSize: number, overlapSize: number): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - overlapSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
      
      if (i + chunkSize >= words.length) break;
    }
    
    return chunks;
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