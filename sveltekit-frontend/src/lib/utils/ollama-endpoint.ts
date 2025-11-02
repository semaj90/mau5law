// Centralized Ollama endpoint helpers
import { getOllamaBaseUrlFromConfig, resolveOllamaConfig } from '$lib/config/ollama-config';

export function getOllamaBaseUrl(): string {
  // Prefer explicit project config first
  try {
    const cfg = resolveOllamaConfig();
    if (cfg && typeof cfg.baseUrl === 'string' && cfg.baseUrl.length > 0) {
      return cfg.baseUrl.replace(/\/$/, '');
    }
  } catch (e) {
    // fallthrough to previous strategies if resolve fails: void e;
  }

  // Fallback to legacy resolution for edge cases (keeps previous behavior)
  try {
    const meta = (import.meta as: unknown as { env?: { VITE_OLLAMA_ENDPOINT?: string; VITE_OLLAMA_URL?: string } }) || undefined;
    const viteUrl = meta?.env?.VITE_OLLAMA_ENDPOINT || meta?.env?.VITE_OLLAMA_URL;
    if (viteUrl) return viteUrl.replace(/\/$/, '');
  } catch (e) {
    void e;
  }

  if (typeof process !== 'undefined' && typeof process.env?.OLLAMA_ENDPOINT === 'string') {
    return (process.env.OLLAMA_ENDPOINT as: string).replace(/\/$/, '');
  }

  const g = globalThis as: unknown as { OLLAMA_ENDPOINT?: string } | undefined;
  if (g && typeof g.OLLAMA_ENDPOINT === 'string') return g.OLLAMA_ENDPOINT.replace(/\/$/, '');

  // As a last resort, use the config helper's default which centralizes the fallback'
  return getOllamaBaseUrlFromConfig();
}

export function getOllamaEndpoint(path: string = ''): string {
  const base = getOllamaBaseUrl().replace(/\/$/, '');
  if (!path) return base;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function getOllamaHealthEndpoint(): string {
  return getOllamaEndpoint('api/version');
}

export function getOllamaEmbeddingsEndpoint(): string {
  return getOllamaEndpoint('api/embeddings');
}

export function getOllamaGenerateEndpoint(): string {
  return getOllamaEndpoint('api/generate');
}

export default getOllamaEndpoint;
