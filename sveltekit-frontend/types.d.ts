// WASM module imports (e.g., llama.cpp, Rust, or Go wasm-pack output)
declare module '*.wasm' {
  const value: ArrayBuffer;
  export default value;
}

// Ollama API response format
export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// Ollama API streaming chunk (when using Server-Sent Events or fetch streaming)
export interface OllamaStreamChunk {
  response: string;
  done: boolean;
}

// Extend WebGPU Device interface if needed
// Extend WebGPU types safely (only if present in the environment)
declare global {
  interface GPUDevice {
    // Example: experimental tensor compute extension
    createTensorPipeline?: (_options: unknown) => unknown;
  }
}

// Global typing for our app (Ollama + WASM support)
declare global {
  interface Window {
    ollamaHost?: string; // e.g. "http://localhost:11434"
  }
  interface ImportMetaEnv {
    readonly VITE_OLLAMA_HOST?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  /**
   * Standard API response format for successful or failed operations.
   * Used by client-side helpers to consume SSR API data.
   */
  interface APIResponse<T> {
    success: boolean;
    data: T;
    error?: string;
  }
}

export {};
  /**
   * Standard API response format for successful or failed operations.
   * Used by client-side helpers to consume SSR API data.
   */
  interface APIResponse<T> {
    success: boolean;
    data: T;
    error?: string;
  }

export {};
