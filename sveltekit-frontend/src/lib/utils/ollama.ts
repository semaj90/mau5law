/**
 * Returns the appropriate Ollama endpoint URL.
 * Prioritizes the OLLAMA_URL environment variable.
 * If not set, defaults to the host's local Ollama instance.
 * For Docker environments, OLLAMA_URL should be set to `http://host.docker.internal:11435`.
 */

export function getOllamaEndpoint(): string {
  if (process.env.OLLAMA_URL) {
    return process.env.OLLAMA_URL;
  }

  // Determine default based on environment (e.g., Docker vs. host)
  // Assuming DOCKER_ENV is set to 'true' when running inside a Docker container
  const isDocker = process.env.DOCKER_ENV === 'true';

  if (isDocker) {
    // Access host Ollama from inside Docker container
    // As per instructions: "Ollama on host is http://host.docker.internal:11434 from container"
    return 'http://host.docker.internal:11434';
  } else {
    // Access local Ollama on the host machine
    return 'http://localhost:11434';
  }
}