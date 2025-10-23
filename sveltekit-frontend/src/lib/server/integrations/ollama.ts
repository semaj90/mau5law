import type { OllamaClient } from '$lib/types/external-services';

export const ollamaClient: OllamaClient = {
		async embed(text: string, opts?: { model?: string }): Promise<number[]> {
				const model = opts?.model ?? 'embeddinggemma:latest';
				const res = await fetch('http://localhost:11434/api/embeddings', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ model, input: text })
				});
				if (!res.ok) {
						throw new Error(`Ollama embeddings failed: ${res.status} ${res.statusText}`);
				}
				const payload = await res.json();
				return payload.embedding ?? (payload.data?.[0]?.embedding ?? []);
		}
};
