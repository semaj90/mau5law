export const ollamaChatStream = {};

export async function getOllamaEndpoint(): Promise<string | null> {
  // Prefer explicit environment override
  const env = process.env.OLLAMA_URL;
  if (env && env.trim()) return env.trim();

  // Optional flag to prefer the docker bind port
  if (process.env.OLLAMA_DOCKER === 'true' || process.env.OLLAMA_DOCKER === '1') {
    return 'http://localhost:11435';
  }

  // Default to host binding
  return 'http://localhost:11434';
}

export default { getOllamaEndpoint };
