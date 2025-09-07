/**
 * Global AI Assistant Store - Svelte 5 with Multi-Backend Support
 * Implements intelligent backend routing, persistent chat history, and smart client-side optimization
 */

import { writable } from 'svelte/store';
import type { ChatMessage, Backend, AssistantConfig, ChatSession, SearchResult } from '$lib/types/ai-assistant';

// Svelte 5 Runes-based Store State
export class AIAssistantStore {
  // Core state using Svelte 5 runes
  messages = $state<ChatMessage[]>([]);
  currentBackend = $state<Backend>('ollama');
  isProcessing = $state<boolean>(false);
  sessionId = $state<string>('');
  availableBackends = $state<Backend[]>(['vllm', 'ollama', 'webasm', 'go-micro']);
  
  // Performance metrics
  backendLatency = $state<Record<Backend, number>>({
    vllm: 0,
    ollama: 0,
    webasm: 0,
    'go-micro': 0
  });
  
  // Configuration
  config = $state<AssistantConfig>({
    temperature: 0.2,
    maxTokens: 2048,
    model: 'gemma3-legal',
    systemPrompt: 'You are a specialized legal AI assistant focusing on deeds, contracts, and legal analysis.',
    autoSwitchBackend: true,
    persistHistory: true
  });

  // Client-side caching and search (simplified)
  private messagesCache = new Map<string, ChatMessage>();
  private contextCache = new Map<string, ChatMessage[]>();

  constructor() {
    this.loadPersistedSession();
    this.startHealthMonitoring();
  }


  /**
   * Intelligent Backend Selection with Health-based Routing
   */
  async selectOptimalBackend(message: string, context?: string): Promise<Backend> {
    if (!this.config.autoSwitchBackend) return this.currentBackend;

    // Analyze message complexity and requirements
    const complexity = this.analyzeMessageComplexity(message);
    const hasLegalContext = this.hasLegalContext(message, context);
    const requiresSpeed = this.requiresSpeedOptimization(message);

    // Get backend health scores
    const healthScores = await this.getBackendHealthScores();
    
    // Scoring algorithm for backend selection
    const backendScores: Record<Backend, number> = {
      'vllm': this.calculateBackendScore('vllm', complexity, hasLegalContext, requiresSpeed, healthScores.vllm),
      'ollama': this.calculateBackendScore('ollama', complexity, hasLegalContext, requiresSpeed, healthScores.ollama),
      'webasm': this.calculateBackendScore('webasm', complexity, hasLegalContext, requiresSpeed, healthScores.webasm),
      'go-micro': this.calculateBackendScore('go-micro', complexity, hasLegalContext, requiresSpeed, healthScores['go-micro'])
    };

    // Select backend with highest score
    const optimalBackend = Object.entries(backendScores).reduce((a, b) => 
      backendScores[a[0] as Backend] > backendScores[b[0] as Backend] ? a : b
    )[0] as Backend;

    console.log(`🧠 Backend selection scores:`, backendScores);
    console.log(`✅ Selected backend: ${optimalBackend}`);

    return optimalBackend;
  }

  /**
   * Send message with intelligent routing and context building
   */
  async sendMessage(content: string, options?: { 
    backend?: Backend; 
    includeHistory?: boolean;
    legalContext?: string;
  }): Promise<ChatMessage> {
    const startTime = performance.now();
    this.isProcessing = true;

    try {
      // Build smart context from conversation history
      const contextMessages = options?.includeHistory !== false 
        ? await this.buildSmartContext(content, options?.legalContext)
        : [];

      // Select optimal backend
      const backend = options?.backend || await this.selectOptimalBackend(content, options?.legalContext);
      this.currentBackend = backend;

      // Create user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        metadata: {
          backend,
          legalContext: options?.legalContext
        }
      };

      // Add to messages and cache
      this.messages.push(userMessage);
      this.cacheMessage(userMessage);

      // Send to backend
      const response = await this.sendToBackend(backend, [...contextMessages, userMessage]);
      
      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant', 
        content: response.text,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        metadata: {
          backend,
          model: response.model,
          tokenCount: response.tokenCount,
          processingTime: performance.now() - startTime,
          confidence: response.confidence
        }
      };

      // Add to messages and cache
      this.messages.push(assistantMessage);
      this.cacheMessage(assistantMessage);

      // Update performance metrics
      this.updateBackendMetrics(backend, performance.now() - startTime);

      return assistantMessage;

    } catch (error) {
      console.error(`❌ Error with backend ${this.currentBackend}:`, error);
      
      // Try fallback backends
      if (options?.backend) throw error; // Don't fallback if specific backend requested
      
      const fallbackBackends = this.availableBackends.filter(b => b !== this.currentBackend);
      for (const fallbackBackend of fallbackBackends) {
        try {
          console.log(`🔄 Trying fallback backend: ${fallbackBackend}`);
          return await this.sendMessage(content, { 
            ...options, 
            backend: fallbackBackend 
          });
        } catch (fallbackError) {
          console.error(`❌ Fallback ${fallbackBackend} failed:`, fallbackError);
        }
      }
      
      throw new Error('All AI backends unavailable');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Build smart context from conversation history using semantic similarity
   */
  private async buildSmartContext(query: string, legalContext?: string): Promise<ChatMessage[]> {
    const cacheKey = `${query}-${legalContext || ''}`;
    
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    // Get recent messages
    const recentMessages = this.messages.slice(-10);
    
    // Semantic search through history for relevant context
    const searchResults = await this.searchConversationHistory(query);
    const relevantMessages = searchResults
      .filter(result => result.score && result.score < 0.5) // Lower score = better match in Fuse.js
      .slice(0, 5)
      .map(result => result.item);

    // Combine and deduplicate
    const contextMessages = [...new Map(
      [...recentMessages, ...relevantMessages]
        .map(msg => [msg.id, msg])
    ).values()].sort((a, b) => a.timestamp - b.timestamp);

    // Cache the result
    this.contextCache.set(cacheKey, contextMessages);
    
    // Cleanup old cache entries
    if (this.contextCache.size > 100) {
      const keys = Array.from(this.contextCache.keys());
      keys.slice(0, 50).forEach(key => this.contextCache.delete(key));
    }

    return contextMessages;
  }

  /**
   * Search conversation history using simple text matching
   */
  async searchConversationHistory(query: string, limit = 20): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];
    
    for (const message of this.messages) {
      if (message.content.toLowerCase().includes(queryLower)) {
        results.push({
          item: message,
          score: 0.5, // Simple scoring
          matches: []
        });
      }
    }
    
    return results.slice(0, limit);
  }

  /**
   * Send request to specific backend with unified API
   */
  private async sendToBackend(backend: Backend, messages: ChatMessage[]) {
    const endpoint = this.getBackendEndpoint(backend);
    const payload = this.formatBackendPayload(backend, messages);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Backend ${backend} responded with ${response.status}`);
    }

    const data = await response.json();
    return this.parseBackendResponse(backend, data);
  }

  /**
   * Get appropriate endpoint for each backend
   */
  private getBackendEndpoint(backend: Backend): string {
    const endpoints = {
      'vllm': '/api/ai/chat',
      'ollama': '/api/ai/chat', 
      'webasm': '/api/ai/webasm-chat',
      'go-micro': '/api/ai/go-micro-chat'
    };
    return endpoints[backend];
  }

  /**
   * Format payload for specific backend requirements
   */
  private formatBackendPayload(backend: Backend, messages: ChatMessage[]) {
    const basePayload = {
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      temperature: this.config.temperature,
      model: this.config.model
    };

    switch (backend) {
      case 'vllm':
        return { ...basePayload, openaiModel: 'mistralai/Mistral-7B-Instruct-v0.3' };
      case 'webasm':
        return { ...basePayload, useWASM: true, enableGPU: true };
      case 'go-micro':
        return { ...basePayload, service: 'legal-analysis', priority: 'high' };
      default:
        return basePayload;
    }
  }

  /**
   * Parse response from different backends into unified format
   */
  private parseBackendResponse(backend: Backend, data: any) {
    const baseResponse = {
      text: data.text || data.response || data.choices?.[0]?.message?.content || '',
      model: data.model || this.config.model,
      backend
    };

    switch (backend) {
      case 'vllm':
        return {
          ...baseResponse,
          tokenCount: data.usage?.total_tokens,
          confidence: data.confidence
        };
      case 'webasm':
        return {
          ...baseResponse,
          tokenCount: data.tokensGenerated,
          confidence: data.confidence,
          processingPath: data.processingPath
        };
      case 'go-micro':
        return {
          ...baseResponse,
          tokenCount: data.tokens,
          confidence: data.confidence,
          processingNodes: data.processingNodes
        };
      default:
        return baseResponse;
    }
  }

  /**
   * Cache message to simple Map-based cache and persist to localStorage
   */
  private cacheMessage(message: ChatMessage) {
    this.messagesCache.set(message.id, message);
    
    // Persist to localStorage
    if (this.config.persistHistory) {
      try {
        localStorage.setItem('ai-assistant-messages', JSON.stringify(this.messages));
      } catch (error) {
        console.error('Error persisting messages:', error);
      }
    }
  }

  /**
   * Load persisted session from localStorage
   */
  private loadPersistedSession() {
    if (!this.config.persistHistory) return;

    // Load session ID
    const savedSessionId = localStorage.getItem('ai-assistant-session-id');
    this.sessionId = savedSessionId || crypto.randomUUID();
    localStorage.setItem('ai-assistant-session-id', this.sessionId);

    // Load messages from localStorage
    try {
      const savedMessages = localStorage.getItem('ai-assistant-messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.filter((msg: ChatMessage) => msg.sessionId === this.sessionId);
      }
    } catch (error) {
      console.error('Error loading persisted messages:', error);
    }
  }

  /**
   * Analyze message complexity for backend selection
   */
  private analyzeMessageComplexity(message: string): 'simple' | 'medium' | 'complex' {
    const length = message.length;
    const hasLegalTerms = /\b(contract|deed|liability|statute|precedent|jurisdiction)\b/i.test(message);
    const hasComplexQuery = /\b(analyze|compare|summarize|explain)\b/i.test(message);

    if (length > 500 || (hasLegalTerms && hasComplexQuery)) return 'complex';
    if (length > 100 || hasLegalTerms || hasComplexQuery) return 'medium';
    return 'simple';
  }

  /**
   * Check if message has legal context
   */
  private hasLegalContext(message: string, context?: string): boolean {
    const legalTerms = /\b(legal|law|contract|deed|court|judge|attorney|liability|statute|regulation|compliance)\b/i;
    return legalTerms.test(message) || legalTerms.test(context || '');
  }

  /**
   * Check if message requires speed optimization
   */
  private requiresSpeedOptimization(message: string): boolean {
    const speedIndicators = /\b(quick|fast|urgent|immediately|asap|now)\b/i;
    return speedIndicators.test(message) || message.length < 50;
  }

  /**
   * Calculate backend score for selection algorithm
   */
  private calculateBackendScore(
    backend: Backend,
    complexity: string,
    hasLegalContext: boolean,
    requiresSpeed: boolean,
    healthScore: number
  ): number {
    let score = healthScore * 0.4; // Base health score (40% weight)

    // Complexity scoring
    const complexityScores = {
      'vllm': { simple: 0.7, medium: 0.9, complex: 1.0 },
      'ollama': { simple: 0.9, medium: 0.8, complex: 0.9 },
      'webasm': { simple: 1.0, medium: 0.6, complex: 0.3 },
      'go-micro': { simple: 0.6, medium: 0.8, complex: 1.0 }
    };
    score += complexityScores[backend][complexity as keyof typeof complexityScores[Backend]] * 0.3;

    // Legal context bonus
    if (hasLegalContext) {
      const legalBonuses = { 'vllm': 0.2, 'ollama': 0.3, 'webasm': 0.1, 'go-micro': 0.3 };
      score += legalBonuses[backend];
    }

    // Speed requirement scoring
    if (requiresSpeed) {
      const speedScores = { 'vllm': 0.6, 'ollama': 0.8, 'webasm': 1.0, 'go-micro': 0.7 };
      score += speedScores[backend] * 0.2;
    }

    // Latency penalty
    const latencyPenalty = Math.min(this.backendLatency[backend] / 5000, 0.3); // Max 30% penalty for 5s+ latency
    score -= latencyPenalty;

    return Math.max(0, Math.min(1, score)); // Normalize to 0-1
  }

  /**
   * Get health scores for all backends
   */
  private async getBackendHealthScores(): Promise<Record<Backend, number>> {
    try {
      const healthResponse = await fetch('/api/ai/health');
      const healthData = await healthResponse.json();
      
      return {
        'vllm': healthData.backends?.vllm?.reachable ? 1.0 : 0.0,
        'ollama': healthData.backends?.ollama?.version ? 1.0 : 0.0,
        'webasm': healthData.backends?.webasm?.loaded ? 1.0 : 0.0,
        'go-micro': healthData.backends?.['go-micro']?.healthy ? 1.0 : 0.0
      };
    } catch {
      // Default scores if health check fails
      return { 'vllm': 0.8, 'ollama': 0.9, 'webasm': 0.7, 'go-micro': 0.6 };
    }
  }

  /**
   * Update backend performance metrics
   */
  private updateBackendMetrics(backend: Backend, latency: number) {
    // Exponential moving average for latency
    this.backendLatency[backend] = this.backendLatency[backend] * 0.7 + latency * 0.3;
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring() {
    setInterval(async () => {
      const healthScores = await this.getBackendHealthScores();
      this.availableBackends = Object.entries(healthScores)
        .filter(([_, score]) => score > 0.1)
        .map(([backend]) => backend as Backend);
    }, 30000); // Check every 30 seconds
  }

  /**
   * Export conversation history
   */
  exportConversation(format: 'json' | 'markdown' | 'pdf' = 'json') {
    const conversation = {
      sessionId: this.sessionId,
      messages: this.messages,
      exportedAt: new Date().toISOString(),
      totalMessages: this.messages.length,
      backends: [...new Set(this.messages.map(m => m.metadata?.backend).filter(Boolean))]
    };

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      case 'markdown':
        return this.convertToMarkdown(conversation);
      case 'pdf':
        return this.generatePDF(conversation);
      default:
        return conversation;
    }
  }

  /**
   * Convert conversation to markdown format
   */
  private convertToMarkdown(conversation: any): string {
    let markdown = `# Legal AI Assistant Conversation\n\n`;
    markdown += `**Session ID**: ${conversation.sessionId}\n`;
    markdown += `**Exported**: ${conversation.exportedAt}\n`;
    markdown += `**Total Messages**: ${conversation.totalMessages}\n\n`;

    conversation.messages.forEach((msg: ChatMessage) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const backend = msg.metadata?.backend ? ` (${msg.metadata.backend})` : '';
      
      markdown += `## ${msg.role.toUpperCase()}${backend} - ${timestamp}\n\n`;
      markdown += `${msg.content}\n\n`;
      
      if (msg.metadata?.processingTime) {
        markdown += `*Processing time: ${Math.round(msg.metadata.processingTime)}ms*\n\n`;
      }
    });

    return markdown;
  }

  /**
   * Generate PDF (placeholder - would need PDF library)
   */
  private generatePDF(conversation: any): string {
    // This would integrate with a PDF generation library like jsPDF
    return `PDF generation would be implemented here using conversation data: ${JSON.stringify(conversation, null, 2)}`;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
    this.messagesCache.clear();
    this.contextCache.clear();
    localStorage.removeItem('ai-assistant-session-id');
    localStorage.removeItem('ai-assistant-messages');
    this.sessionId = crypto.randomUUID();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AssistantConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const aiAssistant = new AIAssistantStore();