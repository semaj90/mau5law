export class OllamaService {
  private get baseUrl() {
    return process.env.OLLAMA_URL || 'http://localhost:11434';
  }

  private get embeddingModel() {
    return process.env.EMBEDDING_MODEL || 'embeddinggemma:latest';
  }

  private get llmModel() {
    return process.env.LLM_MODEL || 'gemma3-legal:latest';
  }

  async generateEmbedding(text: string) {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embeddingModel, input: text }),
    });
    const data = await res.json();
    return data.data[0].embedding;
  }

  async summarize(text: string) {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmModel,
        prompt: `Summarize legal text:\n${text}`,
      }),
    });
    const result = await res.json();
    return result.response;
  }

  async chat(message: string, _caseId?: string) {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.llmModel,
        messages: [{ role: 'user', content: message }],
      }),
    });
    const result = await res.json();
    return result.message.content;
  }
}
