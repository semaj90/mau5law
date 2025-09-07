// Web Worker for parallel WebAssembly llama.cpp processing
// Note: Keep this file minimal and browser-safe; no Node APIs.

let wasmModule: WebAssembly.WebAssemblyInstantiatedSource | null = null;
let modelData: ArrayBuffer | null = null;
// Prevent unused variable warnings in dev placeholder
void wasmModule; void modelData;

self.onmessage = async (e: MessageEvent) => {
  const payload = (e.data || {}) as { type: string; data?: Record<string, unknown> };
  const type = payload.type;
  const data = payload.data || {};
  try {
    switch (type) {
      case 'init': {
        try {
          const res = await fetch(String((data as Record<string, unknown>).wasmUrl || ''));
          const bytes = await res.arrayBuffer();
          wasmModule = await WebAssembly.instantiate(bytes, {});
          (self as unknown as Worker).postMessage({ type: 'init_complete', success: true });
        } catch (err) {
          const msg = (err && (err as Error).message) || String(err);
          (self as unknown as Worker).postMessage({ type: 'init_complete', success: false, error: msg });
        }
        break;
      }
      case 'load_model': {
        try {
          const res = await fetch(String((data as Record<string, unknown>).modelUrl || ''));
          modelData = await res.arrayBuffer();
          (self as unknown as Worker).postMessage({ type: 'model_loaded', success: true });
        } catch (err) {
          const msg = (err && (err as Error).message) || String(err);
          (self as unknown as Worker).postMessage({ type: 'model_loaded', success: false, error: msg });
        }
        break;
      }
      case 'generate': {
        try {
          // Placeholder inference; real implementation should call into WASM exports
          const prompt = String((data as Record<string, unknown>).prompt || '');
          const result = await performInference(prompt);
          (self as unknown as Worker).postMessage({ type: 'generation_complete', result });
        } catch (err) {
          const msg = (err && (err as Error).message) || String(err);
          (self as unknown as Worker).postMessage({ type: 'generation_error', error: msg });
        }
        break;
      }
      default: {
        // no-op
        break;
      }
    }
  } catch (err) {
    const msg = (err && (err as Error).message) || String(err);
    (self as unknown as Worker).postMessage({ type: 'worker_error', error: msg });
  }
};

async function performInference(prompt: string) {
  // Simulated processing delay
  await new Promise((r) => setTimeout(r, 5));
  return {
    text: `Generated response for: ${prompt.slice(0, 60)}...`,
    tokensGenerated: Math.max(10, Math.floor(prompt.length / 6)),
    processingTime: 10
  };
}
