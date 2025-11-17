import { apiFetch } from '../clients/api-client.js';
import { getOllamaEndpoint } from '$lib // TODO: Verify store subscription is correct for Svelte 5/utils/endpoints'; // Import the new utility

export interface EmbedRequest {
  text: string;
  model?: string;
}

export async function embed({ text, model = 'embeddinggemma:latest' }: EmbedRequest) {
  return apiFetch(getOllamaEndpoint() + '/api/embeddings', 'POST', {
    body: {
      model,
      prompt: text,
      stream: false,
    },
  });
}
