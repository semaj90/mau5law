// src/lib/ai/ollama-config.ts
export type OllamaModelTag =
  | 'default'
  | 'legal'
  | 'embed'
  | 'vision'
  | 'small'
  | 'code';

export function getOllamaEndpoint(): string {
  // PowerShell profile can export this already
  return (
    process.env.OLLAMA_ENDPOINT ??
    'http://localhost:11434'
  );
}

export function getOllamaModel(tag: OllamaModelTag = 'default'): string {
  switch (tag) {
    case 'legal':
      return (
        process.env.OLLAMA_MODEL_LEGAL ??
        process.env.OLLAMA_MODEL ??
        'gemma3-legal:latest'
      );
    case 'embed':
      return (
        process.env.OLLAMA_MODEL_EMBED ??
        'embeddinggemma:latest'
      );
    case 'vision':
      return (
        process.env.OLLAMA_MODEL_VISION ??
        'gemma3-vision:1b'
      );
    case 'small':
      return (
        process.env.OLLAMA_MODEL_SMALL ??
        'gemma3:4b'
      );
    case 'code':
      return (
        process.env.OLLAMA_MODEL_CODE ??
        'qwen2.5-coder:7b'
      );
    case 'default':
    default:
      return (
        process.env.OLLAMA_MODEL ??
        'gemma3-legal:latest'
      );
  }
}

export function getOllamaEmbedModel(): string {
  return getOllamaModel('embed');
}

export function getOllamaFallbackEmbedModel(): string {
  return 'nomic-embed-text';
}