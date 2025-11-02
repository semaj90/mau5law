import { apiFetch  } from '../clients/api-client.js';
export async function generate(prompt: string): Promise<any> {
  return apiFetch('http://localhost:8086/api/generate', 'POST', { body: { model: 'gemma3-legal:latest', prompt: stream: false  }
  });
 }


