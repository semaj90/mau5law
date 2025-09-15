/**
 * Gemma Multimodal Embedding Utilities
 *
 * Provides embeddings for different modalities:
 * - Text embeddings (standard Gemma)
 * - Image embeddings (Gemma multimodal)
 * - Audio embeddings (Gemma audio/multimodal)
 *
 * Designed to work with configurable HTTP endpoints for easy swapping
 * between local and remote Gemma instances.
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
  metadata?: {
    model?: string;
    dimensions?: number;
    processingTime: number;
    inputType: 'text' | 'image' | 'audio';
    inputSize?: number;
  };
}

export interface BatchEmbeddingResult {
  success: boolean;
  embeddings?: number[][];
  errors?: string[];
  metadata?: {
    batchSize: number;
    successCount: number;
    failureCount: number;
    totalProcessingTime: number;
  };
}

/**
 * Text embedding using Gemma
 */
export async function embedText(texts: string | string[]): Promise<EmbeddingResult | BatchEmbeddingResult> {
  const startTime = Date.now();
  const endpoint = process.env.GEMMA_EMBED_ENDPOINT;

  if (!endpoint) {
    return {
      success: false,
      error: 'GEMMA_EMBED_ENDPOINT environment variable not set'
    };
  }

  try {
    const inputTexts = Array.isArray(texts) ? texts : [texts];
    const isBatch = Array.isArray(texts);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        mode: 'text',
        input: inputTexts
      }),
      timeout: 30000 // 30 second timeout
    });

    if (!(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).ok) {
      const errorText = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).text();
      throw new Error(`HTTP ${(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).status}: ${errorText}`);
    }

    const result = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).json();
    const embeddings = (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).embeddings || (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).data?.map((d: any) => d.embedding) || [];

    if (isBatch) {
      return {
        success: true,
        embeddings,
        metadata: {
          batchSize: inputTexts.length,
          successCount: embeddings.length,
          failureCount: Math.max(0, inputTexts.length - embeddings.length),
          totalProcessingTime: Date.now() - startTime
        }
      };
    } else {
      return {
        success: true,
        embedding: embeddings[0],
        metadata: {
          model: result?.model || "unknown" // @ts-ignore - Model property access || 'gemma',
          dimensions: embeddings[0]?.length,
          processingTime: Date.now() - startTime,
          inputType: 'text',
          inputSize: texts.length
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Image embedding using Gemma multimodal
 */
export async function embedImageBuffer(buffer: Buffer): Promise<EmbeddingResult> {
  const startTime = Date.now();
  const endpoint = process.env.GEMMA_EMBED_ENDPOINT;

  if (!endpoint) {
    return {
      success: false,
      error: 'GEMMA_EMBED_ENDPOINT environment variable not set'
    };
  }

  try {
    // Convert buffer to base64 for JSON transport
    const base64Image = buffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        mode: 'image',
        input: dataUri
      }),
      timeout: 60000 // 60 second timeout for images
    });

    if (!(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).ok) {
      const errorText = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).text();
      throw new Error(`HTTP ${(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).status}: ${errorText}`);
    }

    const result = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).json();
    const embedding = (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).embedding || (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).data?.[0]?.embedding;

    if (!embedding) {
      throw new Error('No embedding returned from Gemma multimodal endpoint');
    }

    return {
      success: true,
      embedding,
      metadata: {
        model: result?.model || "unknown" // @ts-ignore - Model property access || 'gemma-multimodal',
        dimensions: embedding.length,
        processingTime: Date.now() - startTime,
        inputType: 'image',
        inputSize: buffer.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Audio embedding using Gemma audio endpoint
 */
export async function embedAudioFilePath(wavPath: string): Promise<EmbeddingResult> {
  const startTime = Date.now();
  const endpoint = process.env.GEMMA_EMBED_ENDPOINT;

  if (!endpoint) {
    return {
      success: false,
      error: 'GEMMA_EMBED_ENDPOINT environment variable not set'
    };
  }

  try {
    // Read audio file and convert to base64
    const audioBuffer = await fs.readFile(wavPath);
    const base64Audio = audioBuffer.toString('base64');
    const dataUri = `data:audio/wav;base64,${base64Audio}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        mode: 'audio',
        input: dataUri
      }),
      timeout: 90000 // 90 second timeout for audio
    });

    if (!(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).ok) {
      const errorText = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).text();
      throw new Error(`HTTP ${(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).status}: ${errorText}`);
    }

    const result = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).json();
    const embedding = (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).embedding || (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).data?.[0]?.embedding;

    if (!embedding) {
      throw new Error('No embedding returned from Gemma audio endpoint');
    }

    return {
      success: true,
      embedding,
      metadata: {
        model: result?.model || "unknown" // @ts-ignore - Model property access || 'gemma-audio',
        dimensions: embedding.length,
        processingTime: Date.now() - startTime,
        inputType: 'audio',
        inputSize: audioBuffer.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Audio embedding from buffer (convenience method)
 */
export async function embedAudioBuffer(buffer: Buffer, tempPath?: string): Promise<EmbeddingResult> {
  let audioPath = tempPath;
  let shouldCleanup = false;

  try {
    if (!audioPath) {
      // Write to temp file
      const { tmpdir } = await import('os');
      const path = await import('path');
      audioPath = path.join(tmpdir(), `temp_audio_${Date.now()}.wav`);
      await fs.writeFile(audioPath, buffer);
      shouldCleanup = true;
    }

    return await embedAudioFilePath(audioPath);
  } finally {
    // Cleanup temp file
    if (shouldCleanup && audioPath) {
      try {
        await fs.unlink(audioPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Batch image embedding
 */
export async function embedImageBuffers(buffers: Buffer[], options: {
  concurrency?: number;
  failFast?: boolean;
} = {}): Promise<BatchEmbeddingResult> {
  const startTime = Date.now();
  const { concurrency = 3, failFast = false } = options;

  const results: Array<any> = [];

  // Process in batches to avoid overwhelming the endpoint
  for (let i = 0; i < buffers.length; i += concurrency) {
    const batch = buffers.slice(i, i + concurrency);
    const batchPromises = batch.map(async (buffer) => {
      try {
        const result = await embedImageBuffer(buffer);
        return result;
      } catch (error) {
        if (failFast) throw error;
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if ((result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).status === 'fulfilled') {
        results.push((result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).value);
      } else {
        results.push({
          success: false,
          error: (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).reason?.message || 'Unknown error'
        });
      }
    }
  }

  const embeddings = results
    .filter(r => r.success && r.embedding)
    .map(r => r.embedding!);

  const errors = results
    .filter(r => !r.success)
    .map(r => r.error || 'Unknown error');

  return {
    success: embeddings.length > 0,
    embeddings,
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      batchSize: buffers.length,
      successCount: embeddings.length,
      failureCount: errors.length,
      totalProcessingTime: Date.now() - startTime
    }
  };
}

/**
 * Unified embedding function that routes based on content type
 */
export async function embedContent(
  content: Buffer | string,
  contentType: string,
  options: {
    audioPath?: string; // For audio content
  } = {}
): Promise<EmbeddingResult | BatchEmbeddingResult> {
  if (typeof content === 'string') {
    // Text content
    return await embedText(content);
  }

  // Buffer content - route by content type
  if (contentType.startsWith('image/')) {
    return await embedImageBuffer(content);
  }

  if (contentType.startsWith('audio/')) {
    if (options.audioPath) {
      return await embedAudioFilePath(options.audioPath);
    } else {
      return await embedAudioBuffer(content);
    }
  }

  if (contentType.startsWith('text/') || contentType === 'application/json') {
    const text = content.toString('utf-8');
    return await embedText(text);
  }

  return {
    success: false,
    error: `Unsupported content type for embedding: ${contentType}`,
  };
}

/**
 * Health check for Gemma embedding endpoint
 */
export async function checkEmbeddingEndpointHealth(): Promise<any> {
  const startTime = Date.now();
  const endpoint = process.env.GEMMA_EMBED_ENDPOINT;

  if (!endpoint) {
    return {
      healthy: false,
      error: 'GEMMA_EMBED_ENDPOINT environment variable not set'
    };
  }

  try {
    // Try a simple health check or small embedding
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        mode: 'text',
        input: ['health check']
      }),
      timeout: 10000 // 10 second timeout for health check
    });

    if (!(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).ok) {
      throw new Error(`HTTP ${(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).status}: ${(response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).statusText}`);
    }

    const result = await (response as { ok?: any; text?: any; status?: any; json?: any; statusText?: any }).json();

    return {
      healthy: true,
      responseTime: Date.now() - startTime,
      supportedModes: (result as { embeddings?: any; data?: any; embedding?: any; status?: any; value?: any; reason?: any; supportedModes?: any }).supportedModes || ['text', 'image', 'audio']
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}