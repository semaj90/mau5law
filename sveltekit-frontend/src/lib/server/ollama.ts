/**
 * Ollama Integration Service
 * Handles communication with local Ollama instance for Gemma model
 */

export function getOllamaEndpoint(): string {
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  return endpoint;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export async function queryGemma(prompt: string, systemPrompt?: string): Promise<string> {
  const endpoint = getOllamaEndpoint();
  const messages: OllamaMessage[] = [];

  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: prompt,
  });

  try {
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma:7b',
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data: OllamaResponse = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Gemma query error:', error);
    throw error;
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  const endpoint = getOllamaEndpoint();

  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.error('Ollama health check failed:', error);
    return false;
  }
}

export async function listAvailableModels(): Promise<string[]> {
  const endpoint = getOllamaEndpoint();

  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.models?.map((m: any) => m.name) || [];
  } catch (error) {
    console.error('Failed to list models:', error);
    return [];
  }
}
