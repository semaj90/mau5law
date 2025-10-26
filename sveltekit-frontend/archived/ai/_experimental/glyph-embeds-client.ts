/**
 * Client-side API wrapper for SIMD Glyph Embeds - FIXED
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
  evidence_id: string;
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
  rag_config?: {
    enable_chunking: boolean;
    chunk_size: number;
    overlap_size: number;
    enable_summarization?: boolean;
    enable_vector_store?: boolean;
  };
  article_urls?: string[];
  content_sources?: Array<any>;
}

export interface SIMDShaderData {
  tiled_data: Float32Array;
  shader_code: string;
  compression_ratio: number;
  tile_map: Array<any>;
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
  rag_results?: {
    chunks_processed: number;
    embeddings_generated: number;
    vector_store_updates: number;
    summary_tokens: number;
    semantic_matches: Array<any>;
  };
  synthesized_glyphs?: Array<any>;
}

export interface GlyphEmbedResponse {
  success: boolean;
  data?: GlyphEmbedResult;
  error?: string;
  metadata?: {
    evidence_id: string;
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

// Default instance
export const glyphEmbedsClient = { generateGlyph: async () => ({ success: false }) };

export function createGlyphRequest(evidenceId: string | number, prompt: string): GlyphEmbedRequest {
  return { evidence_id: String(evidenceId), prompt };
}
