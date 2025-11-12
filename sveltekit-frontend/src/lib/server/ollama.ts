import { OLLAMA_URL } from '$env/static/private';
const GEMMA3_MODEL_NAME = 'gemma3-legal:latest';

/**
 * Ollama Service for AI model interactions
 * Handles text analysis, embeddings, and chat with Ollama models
 */
export class OllamaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = OLLAMA_URL || 'http://localhost:11434';
  }

  async analyzeText(text: string, analysisType: string = 'general'): Promise<any> {
    const prompt = this.buildAnalysisPrompt(text, analysisType);

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA3_MODEL_NAME,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const result = await response.json();
    return this.parseAnalysisResponse(result.response, analysisType);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA3_MODEL_NAME,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding;
  }

  async chat(message: string, context?: string[]): Promise<string> {
    const prompt = context ? `Context: ${context.join('\n')}\n\nQuestion: ${message}` : message;

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA3_MODEL_NAME,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama chat error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.response;
  }

  private buildAnalysisPrompt(text: string, analysisType: string): string {
    const prompts = {
      general: `Analyze the following legal text and provide insights:\n\n${text}`,
      contract: `Review this contract and identify key terms, obligations, and potential issues:\n\n${text}`,
      evidence: `Analyze this evidence and summarize its relevance and credibility:\n\n${text}`,
      case_law: `Summarize this case law and its legal implications:\n\n${text}`,
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.general;
  }

  private parseAnalysisResponse(response: string, analysisType: string): any {
    return {
      analysis: response,
      type: analysisType,
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    };
  }
}

// Legacy exports for backward compatibility
function getOllamaEndpoint(): string {
  if (!OLLAMA_URL) {
    throw new Error('OLLAMA_URL environment variable is not set.');
  }
  return OLLAMA_URL;
}

async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${getOllamaEndpoint()}/api/version`);
    return response.ok;
  } catch (error) {
    console.error('Ollama health check failed: ', error);
    return false;
  }
}

async function generate(prompt: string, _options: any = {}): Promise<string> {
  const service = new OllamaService();
  return await service.chat(prompt);
}

export default {
  getOllamaEndpoint,
  healthCheck,
  generate,
};
