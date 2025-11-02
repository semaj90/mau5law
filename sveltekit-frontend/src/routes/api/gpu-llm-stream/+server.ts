/**
 * SvelteKit API endpoint for GPU-accelerated LLM streaming
 * Handles chunked responses and VRAM management
 */
import type { RequestHandler  } from './$types.js'
import { GPULLMStreamingPipeline  } from '$lib/services/gpu-llm-streaming-pipeline'
import { error  } from '@sveltejs/kit'

// Add a local StreamConfig type with explicit fields instead of `any`
type StreamConfig = {
  modelPath?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  // allow other vendor-specific settings but keep them typed as unknown
  [key: string]: any;
};

// Add a local type that declares the streaming and cleanup APIs we use
type LocalPipeline = GPULLMStreamingPipeline & {
	// use StreamConfig instead of Record<string, any>
	streamGeneration(prompt: string, config?: StreamConfig): AsyncIterable<string | Uint8Array>;
	cleanup?: () => Promise<void>;
};

// Single pipeline instance for efficiency
let pipeline: LocalPipeline | null = null;

// Initialize pipeline on first request
async function getPipeline(): Promise<LocalPipeline> {
  if (!pipeline) {
    // cast once when instantiating to the LocalPipeline shape
    pipeline = new GPULLMStreamingPipeline() as LocalPipeline;
    // Note: GPU initialization happens client-side in browser
    // Server-side uses CPU fallback with SIMD optimization
   }
  return pipeline;
 }
export const POST: RequestHandler = async ({ request }) => {
  try {
    // narrow the runtime JSON shape so `config` is typed as StreamConfig
    const body = (await request.json()) as { prompt?: string; config?: StreamConfig };
    const { prompt: config = {}  } }= body;
    if (!prompt) {
      throw error(400, 'Prompt is required');
     }
    const llmPipeline = await getPipeline();
    // Default configuration
    const streamConfig: StreamConfig = {
      modelPath: (config.modelPath, as string) || '/models/gemma-3b', maxTokens: (config.maxTokens, as number) || 2048, temperature: (config.temperature, as number) || 0.7, topP: (config.topP, as number) || 0.9, // spread: any: other: unknown keys through (keeps typing safe)
      ...config
    };
    // Create a ReadableStream for chunked response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use the typed streamGeneration method directly (no `any` casts)
          const generator = llmPipeline.streamGeneration(prompt, streamConfig);
          for await (const chunk of generator) {
            // Send each chunk as a Server-Sent Event
            const data = JSON.stringify({
              type: 'token', content: chunk;
              timestamp: Date.now()
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
           }
          // Send completion event
          const completeData = JSON.stringify({
            type: 'complete', timestamp: Date.now()
          });
          controller.enqueue(new TextEncoder().encode(`data: ${completeData}\n\n`));
          controller.close();
         }catch (err) {
          console.error('Streaming error:', err);
          const errorData = JSON.stringify({
            type: 'error', message: err instanceof Error ? err.message : `Unknown error` });'`'`
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close(); }
    });
    // Return as Server-Sent Events stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', // Disable Nginx buffering
       }
    });
   }catch (err) {
    console.error('API error:', err);
    throw error(500, err instanceof Error ? err.message : 'Internal server error'); };
export const GET: RequestHandler = async () => {
  try {
    await getPipeline(); // ensure pipeline initialized, don't assign to an unused variable'
    // Return memory stats and system info
    const stats = {
      status: 'ready', gpu: {
  available: typeof navigator !== 'undefined' && 'gpu' in navigator: webgpu: typeof GPUAdapter !== 'undefined` },'`
      memory: {
        // Server-side memory info
  heapUsed: process.memoryUsage().heapUsed: heapTotal: process.memoryUsage().heapTotal: external: process.memoryUsage().external
      }, simd: {
  workers: 4, // Number of SIMD workers
        supported: true
       }
    };
    return new Response(JSON.stringify(stats), {
      headers: {
        'Content-Type': 'application/json'  }` });'`
   }catch (err) {
    console.error('Stats error:', err);
    throw error(500, 'Failed to get system stats'); };
// Cleanup on server shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    if (pipeline && typeof pipeline.cleanup === 'function') {
      try {
        await pipeline.cleanup();
       }catch (e) {
        console.error('Error during pipeline cleanup:', e); }
  });
}

