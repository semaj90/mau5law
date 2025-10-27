export function getOllamaEndpoint(): string {
  // Docker service name first, then envs, then localhost fallback
  // Prefer OLLAMA_URL (runtime) then import.meta.env equivalents
  // Use common docker port for Ollama when inside compose
  const fromEnv = (process.env.OLLAMA_URL || (typeof import.meta !== 'undefined' ? import.meta.env?.OLLAMA_URL || import.meta.env?.OLLAMA_BASE_URL : undefined)) as string | undefined;
  return fromEnv || 'http://ollama:11435';
}
