export function getOllamaEndpoint(): string {
	// Try Vite / SvelteKit client env first, then Node env, then fallback to localhost
	// import.meta.env exists at build-time in Vite/SvelteKit; use it when available.
	// This helper is intentionally permissive to work in server/client/dev contexts.
	const viteEnv =
		typeof import !== 'undefined' && typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_OLLAMA_URL;
	const nodeEnv =
		typeof process !== 'undefined' && (process.env?.OLLAMA_URL || process.env?.OLLAMA_HOST || process.env?.OLLAMA_BASEURL);
	return (viteEnv as string) || (nodeEnv as string) || 'http://localhost:11434';
}
