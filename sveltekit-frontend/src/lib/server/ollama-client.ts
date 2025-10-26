import { OLLAMA_BASE_URL } from '$env/static/private';

export const EMBEDDING_MODEL = 'nomic-embed-text'; // As per project instructions

/**
 * Generates a vector embedding for the given text using Ollama.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error('Invalid embedding response from Ollama.');
    }
    return data.embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Summarizes the given text using Ollama.
 * This is a placeholder implementation and might need a specific LLM model for summarization.
 * @param text The text to summarize.
 * @returns A promise that resolves to the summarized text.
 */
export async function summarizeText(text: string): Promise<string> {
  try {
    // This is a basic placeholder. For actual summarization, you'd typically use a specific LLM.
    // For now, we'll use a simple prompt with a general model like 'gemma3' if available,
    // or just return a truncated version if Ollama is not configured for summarization.
    const SUMMARIZATION_MODEL = 'gemma3'; // Or another suitable LLM from your Ollama setup

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: SUMMARIZATION_MODEL,
        prompt: `Summarize the following text concisely:\n\n${text}`,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 150, // Limit response length for summarization
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama summarization failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    if (!data.response) {
      throw new Error('Invalid summarization response from Ollama.');
    }
    return data.response.trim();
  } catch (error) {
    console.warn('Warning: Error summarizing text with Ollama. Returning truncated text instead.', error);
    // Fallback: return a truncated version of the original text
    return text.substring(0, 300) + (text.length > 300 ? '...' : '');
  }
}

import fetch from 'node-fetch';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export const ollamaClient = {
  async embedText(text: string): Promise<number[] | null> {
    try {
      const url = `${OLLAMA_URL}/embed`; // hypothetical embed endpoint
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'gemma3-legal', input: text }),
      });

      if (!res.ok) {
        console.warn('Ollama embed request failed', res.status);
        return null;
      }

      const data = await res.json();
      // Expect { embedding: number[] }
      return Array.isArray(data?.embedding) ? data.embedding : null;
    } catch (err) {
      console.warn('ollamaClient.embedText error', err);
      return null;
    }
  },
};
