
/**
 * Gemma3 API Client for SvelteKit
 * Provides integration with Ollama and llama.cpp servers
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CompletionRequest {
  model?: string;
  prompt: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    text: string;
    index: number;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class Gemma3Client {
  private baseUrl: string;
  private timeout: number;
  private defaultModel: string;

  constructor(
    baseUrl: string = "http://localhost:11434",
    timeout: number = 60000,
    defaultModel: string = "gemma3-legal",
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.timeout = timeout;
    this.defaultModel = defaultModel;
  }

  /**
   * Check if the server is healthy and available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      return response.ok;
    } catch (error: any) {
      console.error("Health check failed:", error);
      return false;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server info request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List available models
   */
  async listModels(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`List models request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a chat completion
   */
  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const payload = {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.1,
      top_p: request.top_p ?? 0.9,
      max_tokens: request.max_tokens ?? 1024,
      stream: request.stream ?? false,
    };

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Chat completion request failed: ${response.status} - ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * Create a text completion
   */
  async createCompletion(
    request: CompletionRequest,
  ): Promise<CompletionResponse> {
    const payload = {
      model: request.model || this.defaultModel,
      prompt: request.prompt,
      temperature: request.temperature ?? 0.1,
      top_p: request.top_p ?? 0.9,
      max_tokens: request.max_tokens ?? 1024,
      stream: request.stream ?? false,
    };

    const response = await fetch(`${this.baseUrl}/v1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Completion request failed: ${response.status} - ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * Helper: Ask a legal question with proper context
   */
  async askLegalQuestion(question: string, context?: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a specialized Legal AI Assistant with expertise in contract analysis, legal document review, case law research, and legal compliance. You provide accurate, professional legal information and analysis. Always maintain professional accuracy and cite relevant legal principles when applicable.${context ? `\n\nAdditional context: ${context}` : ""}`,
      },
      {
        role: "user",
        content: question,
      },
    ];

    const response = await this.createChatCompletion({
      messages,
      temperature: 0.05, // Low temperature for legal accuracy
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Helper: Analyze a legal document
   */
  async analyzeDocument(
    documentText: string,
    analysisType: string = "general",
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a specialized Legal AI Assistant for document analysis. Analyze the provided legal document and provide insights on key terms, potential issues, recommendations, and legal compliance. Focus on ${analysisType} analysis.`,
      },
      {
        role: "user",
        content: `Please analyze this legal document:\n\n${documentText}`,
      },
    ];

    const response = await this.createChatCompletion({
      messages,
      temperature: 0.05,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Helper: Review a contract
   */
  async reviewContract(
    contractText: string,
    reviewFocus?: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a specialized Legal AI Assistant for contract review. Analyze the contract for key terms, potential risks, missing clauses, compliance issues, and provide recommendations for improvement.${reviewFocus ? ` Focus particularly on: ${reviewFocus}` : ""}`,
      },
      {
        role: "user",
        content: `Please review this contract:\n\n${contractText}`,
      },
    ];

    const response = await this.createChatCompletion({
      messages,
      temperature: 0.05,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Helper: Generate legal document template
   */
  async generateDocumentTemplate(
    documentType: string,
    requirements: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a specialized Legal AI Assistant for document generation. Create professional legal document templates with proper structure, standard clauses, and placeholders for customization.`,
      },
      {
        role: "user",
        content: `Generate a ${documentType} template with these requirements:\n\n${requirements}`,
      },
    ];

    const response = await this.createChatCompletion({
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Helper: Summarize content
   */
  async summarizeContent(
    content: string,
    type: string = "general",
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a specialized Legal AI Assistant for content summarization. Provide concise, accurate summaries that capture the key points, legal implications, and important details. Focus on ${type} summarization.`,
      },
      {
        role: "user",
        content: `Please summarize this content:\n\n${content}`,
      },
    ];

    const response = await this.createChatCompletion({
      messages,
      temperature: 0.05,
      max_tokens: 1024,
    });

    return response.choices[0]?.message?.content || "";
  }
}

// Default client instance
export const gemma3Client = new Gemma3Client();
;
// Server detection utility
export async function detectAvailableServer(): Promise<{
  url: string;
  backend: string;
} | null> {
  const servers = [
    { url: "http://localhost:11434", name: "Ollama Server" },
    { url: "http://localhost:8000", name: "llama.cpp Server" },
  ];

  for (const server of servers) {
    try {
      const client = new Gemma3Client(server.url);
      const isHealthy = await client.healthCheck();
      if (isHealthy) {
        const info = await client.getServerInfo();
        return {
          url: server.url,
          backend: info.backend || server.name,
        };
      }
    } catch (error: any) {
      console.debug(`Server ${server.url} not available:`, error);
    }
  }

  return null;
}

// Utility functions for SvelteKit stores
export function createGemma3Store() {
  if (typeof window === "undefined") {
    // Server-side, return a mock
    return {
      subscribe: () => () => {},
      checkHealth: async () => false,
      askQuestion: async () => "",
      analyzeDocument: async () => "",
      reviewContract: async () => "",
      generateTemplate: async () => "",
    };
  }

  let client = new Gemma3Client();
  let serverInfo: any = null;

  return {
    subscribe: (callback: (info: any) => void) => {
      callback(serverInfo);
      return () => {};
    },

    async checkHealth() {
      try {
        const available = await detectAvailableServer();
        if (available) {
          client = new Gemma3Client(available.url);
          serverInfo = await client.getServerInfo();
          return true;
        }
        serverInfo = null;
        return false;
      } catch (error: any) {
        console.error("Health check failed:", error);
        serverInfo = null;
        return false;
      }
    },

    async askQuestion(question: string, context?: string) {
      return client.askLegalQuestion(question, context);
    },

    async analyzeDocument(text: string, type?: string) {
      return client.analyzeDocument(text, type);
    },

    async reviewContract(text: string, focus?: string) {
      return client.reviewContract(text, focus);
    },

    async generateTemplate(type: string, requirements: string) {
      return client.generateDocumentTemplate(type, requirements);
    },
  };
}
