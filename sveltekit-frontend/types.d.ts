// Global WebAssembly types
declare namespace WebAssembly {
  interface Module {}
  interface Instance {}
  interface Memory {}
  interface Table {}
  interface CompileError extends Error {}
  interface LinkError extends Error {}
  interface RuntimeError extends Error {}
}

// WASM module imports (e.g., llama.cpp, Rust, or Go wasm-pack output)
declare module "*.wasm" {
  const value: ArrayBuffer;
  export default value;
}

// Ollama API response format
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// Ollama API streaming chunk (when using Server-Sent Events or fetch streaming)
interface OllamaStreamChunk {
  response: string;
  done: boolean;
}

// Extend WebGPU Device interface if needed
// Extend WebGPU types safely (only if present in the environment)
declare global {
  interface GPUDevice {
    // Example: experimental tensor compute extension
    createTensorPipeline?: (options: unknown) => unknown;
  }
}

// Global typing for our app (Ollama + WASM support)
declare global {
  interface Window {
    ollamaHost?: string; // e.g. "http://localhost:11434"
    WebAssembly: typeof WebAssembly;
  }
  interface ImportMetaEnv {
    readonly VITE_OLLAMA_HOST?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
