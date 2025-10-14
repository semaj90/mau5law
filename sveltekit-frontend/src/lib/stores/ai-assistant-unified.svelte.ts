/**
 * Unified AI Assistant Global Store - SvelteKit 2 + Svelte 5 Runes
 * Replaces both ai-assistant.ts and ai-assistant.svelte.ts with proper Svelte 5 implementation
 */
// Core types
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  evidenceIds?: string[];
  metadata?: {
    confidence?: number;
    source?: string;
    reasoning?: string;
    suggestions?: string[];
    backend?: Backend;
    model?: string;
    tokenCount?: number;
    processingTime?: number;
    legalContext?: string;
  }
}
export interface CaseAIContext {
  caseId: string;
  title?: string;
  messages: AIMessage[];
  evidenceMap: Record<string, {
    id: string;
    title: string;
    annotations: string[];
    connections: string[];
    aiSummary?: string;
  }>;
  currentSession: {
    isActive: boolean;
    lastActivity: number;
    activeEvidenceId?: string;
  }
  insights: Array<{,
    id,: string;
    type: 'pattern' | 'connection' | 'anomaly' | 'recommendation';
    description: string;
    confidence: number;
    evidenceIds: string[];
    timestamp: number;
  }>;
}
export type Backend = 'vllm' | 'ollama' | 'webasm' | 'go-micro';
}
export interface AssistantConfig {
  temperature: number;
  maxTokens: number;
  model: string;
  systemPrompt: string;
  autoSwitchBackend: boolean;
  persistHistory: boolean;
  enableAcceleration: boolean;
}
// Global AI Assistant Store using Svelte 5 Runes
class AIAssistantGlobalStore {
  // Core state using proper Svelte 5 runes
  cases = $state<Record<string, CaseAIContext>({});
  currentCaseId = $state<string | undefined>(undefined);
  isLoading = $state<boolean>(false);
  error = $state<string | undefined>(undefined);
  // Multi-backend support
  currentBackend = $state<Backend>('ollama');
  availableBackends = $state<Backend[]>(['vllm', 'ollama', 'webasm', 'go-micro']);
  backendHealth = $state<Record<Backend, number>({
    vllm: 0.8,
    ollama: 0.9,
    webasm: 0.7,
    'go-micro': 0.6
  });
  // Configuration
  config = $state<AssistantConfig>({
    temperature: 0.2,
    maxTokens: 2048,
    model: 'gemma3-legal',
    systemPrompt: 'You are a specialized legal AI assistant focusing on deeds, contracts, and legal analysis.',
    autoSwitchBackend: true,
    persistHistory: true,
    enableAcceleration: false,
  });
  // Performance metrics
  metrics = $state({
    totalQueries: 0,
    averageResponseTime: 0,
    backendLatency: {
      vllm: 0,
      ollama: 0,
      webasm: 0,
      'go-micro': 0
    } as Record<Backend, number>
  });
  // Global insights
  globalInsights = $state<Array<{
    id: string;
    type: 'trend' | 'pattern' | 'recommendation';
    description: string;
    affectedCases: string[];
    timestamp: number;
  }>([]);
  // Derived states using $derived rune
  currentCase = $derived(this.currentCaseId ? this.cases[this.currentCaseId] : undefined);
  currentMessages = $derived(this.currentCase?.messages || []);
  hasActiveCases = $derived(Object.keys(this.cases).length > 0);
  isProcessing = $derived(this.isLoading);
  // Cache for performance
  private messageCache = new Map<string, AIMessage>();
  private contextCache = new Map<string, AIMessage[]>();
  constructor() {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
      this.startHealthMonitoring();
    }
  }
  // === Core Case Management Methods ===
  initializeCase(caseId: string, title?: string) {
    if (!this.cases[caseId]) {
      this.cases[caseId] = {
        caseId,
        title,
        messages: [],
        evidenceMap: {},
        currentSession: {
          isActive: false,
          lastActivity: Date.now(),
        },
        insights: []
      }
    }
  }
  setCurrentCase(caseId: string) {
    this.initializeCase(caseId);
    this.currentCaseId = caseId;
    if (this.cases[caseId]) {
      this.cases[caseId].currentSession.isActive = true;
      this.cases[caseId].currentSession.lastActivity = Date.now();
    }
  }
  async addMessage(caseId: string, message: Omit<AIMessage, 'id' | 'timestamp'>) {
    this.initializeCase(caseId);
    const newMessage: AIMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }
    this.cases[caseId].messages.push(newMessage);
    this.cases[caseId].currentSession.lastActivity = Date.now();
    // Cache the message
    this.messageCache.set(newMessage.id, newMessage);
    // Persist if enabled
    if (this.config.persistHistory) {
      this.persistState();
    }
  }
  // === Enhanced AI Communication Methods ===
  async sendMessage(
    caseId: string,
    content: string,
    evidenceIds?: string[]
    options?: {
      backend?: Backend;
      includeHistory?: boolean;
      legalContext?: string;
      useAcceleration?: boolean;
    }
  ): Promise<AIMessage> {
    this.isLoading = true;
    this.error = undefined;
    const startTime = performance.now();
    try {
      // Add user message
      await this.addMessage(caseId, {
        role: 'user',
        content,
        evidenceIds,
        metadata: {
          legalContext: options?.legalContext
        }
      });
      // Select optimal backend
      const backend = options?.backend || await this.selectOptimalBackend(content, options?.legalContext);
      this.currentBackend = backend;
      // Build context
      const contextMessages = options?.includeHistory !== false
        ? await this.buildSmartContext(caseId, content, options?.legalContext)
        : [];
      // Send to backend with acceleration if enabled
      let response;
      if (options?.useAcceleration && this.config.enableAcceleration) {
        response = await this.sendWithAcceleration(content, contextMessages, backend);
      } else {
        response = await this.sendToBackend(backend, contextMessages);
      }
      // Create assistant message
      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text || response.response || '',
        timestamp: Date.now(),
        metadata: {
          backend,
          model: response.model || this.config.model,
          tokenCount: response.tokenCount,
          processingTime: performance.now() - startTime,
          confidence: response.confidence
        }
      }
      // Add assistant message
      await this.addMessage(caseId, assistantMessage);
      // Update metrics
      this.updateMetrics(backend, performance.now() - startTime);
      return assistantMessage;
    } catch (error) {
      console.error('❌ AI message failed:', error);
      this.error = error instanceof Error ? error.message: String(error);
      // Try fallback backends
      if (!options?.backend && this.config.autoSwitchBackend) {
        const fallbackBackends = this.availableBackends.filter(b => b !== this.currentBackend);
        for (const fallbackBackend of fallbackBackends) {
          try {
            console.log(`🔄 Trying fallback backend: ${fallbackBackend}`);
            return await this.sendMessage(caseId, content, evidenceIds, {
              ...options,
              backend: fallbackBackend
            });
          } catch (fallbackError) {
            console.error(`❌ Fallback ${fallbackBackend} failed:`, fallbackError);
          }
        }
      }
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  // === Backend Selection and Management ===
  private async selectOptimalBackend(message: string, context?: string): Promise<Backend> {
    if (!this.config.autoSwitchBackend) return this.currentBackend;
    const complexity = this.analyzeMessageComplexity(message);
    const hasLegalContext = this.hasLegalContext(message, context);
    const requiresSpeed = this.requiresSpeedOptimization(message);
    // Calculate scores for each backend
    const scores: Record<Backend, number> = {
      'vllm': this.calculateBackendScore('vllm', complexity, hasLegalContext, requiresSpeed),
      'ollama': this.calculateBackendScore('ollama', complexity, hasLegalContext, requiresSpeed),
      'webasm': this.calculateBackendScore('webasm', complexity, hasLegalContext, requiresSpeed),
      'go-micro': this.calculateBackendScore('go-micro', complexity, hasLegalContext, requiresSpeed)
    }
    // Select highest scoring backend
    const optimal = Object.entries(scores).reduce((a, b) =>
      scores[a[0] as Backend] > scores[b[0] as Backend] ? a : b
    )[0] as Backend;
    console.log(`🧠 Backend selection:`, scores, `Selected: ${optimal}`);
    return optimal;
  }
  private calculateBackendScore(
    backend: Backend;
    complexity: string,
    hasLegalContext: boolean,
    requiresSpeed: boolean;
  ): number {
    let score = this.backendHealth[backend] * 0.4; // Base health (40%)
    // Complexity preferences
    const complexityScores = {
      'vllm': { simple: 0.7, medium: 0.9, complex: 1.0 },
      'ollama': { simple: 0.9, medium: 0.8, complex: 0.9 },
      'webasm': { simple: 1.0, medium: 0.6, complex: 0.3 },
      'go-micro': { simple: 0.6, medium: 0.8, complex: 1.0 }
    }
    score += complexityScores[backend][complexity as keyof typeof complexityScores[Backend]] * 0.3;
    // Legal context bonus
    if (hasLegalContext) {
      const legalBonuses = { 'vllm': 0.2, 'ollama': 0.3, 'webasm': 0.1, 'go-micro': 0.3 }
      score += legalBonuses[backend];
    }
    // Speed optimization
    if (requiresSpeed) {
      const speedScores = { 'vllm': 0.6, 'ollama': 0.8, 'webasm': 1.0, 'go-micro': 0.7 }
      score += speedScores[backend] * 0.2;
    }
    // Latency penalty
    const latencyPenalty = Math.min(this.metrics.backendLatency[backend] / 5000, 0.3);
    score -= latencyPenalty;
    return Math.max(0, Math.min(1, score);
  }
  // === Enhanced Acceleration Integration ===
  private async sendWithAcceleration(content: string, contextMessages: AIMessage[], backend: Backend) {
    // Determine acceleration strategy based on complexity and backend
    const complexity = this.analyzeMessageComplexity(content);
    const useLocalAI = complexity === 'simple' && content.length < 200;
    const useCUDAService = complexity === 'complex' || backend === 'go-micro';
    if (useLocalAI) {
      return await this.sendWithLocalBrowserAI(content, contextMessages);
    } else if (useCUDAService) {
      return await this.sendWithCUDAService(content, contextMessages);
    } else {
      // Use existing SIMD + WebGPU acceleration
      return await this.sendWithSIMDWebGPU(content, contextMessages);
    }
  }
  private async sendWithLocalBrowserAI(content: string, contextMessages: AIMessage[]) {
    // Import browser-local AI dynamically
    const { browserLocalAI } = await import('$lib/ai/browser-local-ai.js');
    // Initialize if needed
    if (!browserLocalAI.isInitialized()) {
      const initialized = await browserLocalAI.initialize();
      if (!initialized) {
        throw new Error('Browser-local AI initialization failed');
      }
    }
    // Build context from messages
    const conversationContext = contextMessages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    const result = await browserLocalAI.generateText({
      prompt: content,
      maxTokens: 512,
      temperature: 0.3,
      systemPrompt: `You are a legal AI assistant. Context:\n${conversationContext}`
    });
    return {
      text: result.text,
      model: 'gemma3-270m-local',
      confidence: result.confidence,
      tokenCount: result.tokensGenerated,
      accelerationMetrics: {
        totalProcessingTime: result.processingTime,
        accelerationUsed: 'browser-local',
        device: result.device,
        fromCache: result.fromCache
      }
    }
  }
  private async sendWithCUDAService(content: string, contextMessages: AIMessage[]) {
    // Import CUDA service dynamically
    const { cudaServiceWorker } = await import('$lib/ai/cuda-service-worker.js');
    // Build system prompt from conversation context
    const recentContext = contextMessages
      .slice(-5)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    const systemPrompt = `You are a specialized legal AI assistant. Recent conversation context:\n${recentContext}`;
    const result = await cudaServiceWorker.generateText({
      model: 'gemma3-legal-latest',
      prompt: content,
      maxTokens: 2048,
      temperature: 0.2,
      systemPrompt,
      priority: 'normal',
      legalContext: {
        jurisdiction: 'general',
        practiceArea: 'legal_assistance',
        documentType: 'conversation',
        confidentiality: 'attorney-client'
      }
    });
    return {
      text: result.text,
      model: result.modelUsed,
      confidence: result.confidence,
      tokenCount: result.tokensGenerated,
      accelerationMetrics: {
        totalProcessingTime: result.processingTime,
        queueTime: result.queueTime,
        accelerationUsed: 'cuda-tensorrt',
        gpuUtilization: result.gpuUtilization,
        precision: result.precision,
        tensorrtVersion: result.metadata.tensorrtVersion
      }
    }
  }
  private async sendWithSIMDWebGPU(content: string, contextMessages: AIMessage[]) {
    // Import existing SIMD + WebGPU acceleration
    const { enhanceAIResponse } = await import('$lib/ai/accelerated-legal-assistant.js');
    // Mock document data for acceleration
    const mockCaseDocuments = Array.from({ length: 5 }, (_, i) => ({
      id: `case_${i}`,
      title: `Case Document ${i + 1}`,
      content: `Mock case content`,
      embedding: new Float32Array(768).map(() => Math.random(),
    });
    const mockEvidenceDocuments = Array.from({ length: 10 }, (_, i) => ({
      id: `evidence_${i}`,
      title: `Evidence Document ${i + 1}`,
      content: `Mock evidence content`,
      embedding: new Float32Array(768).map(() => Math.random(),
    });
    // Use accelerated processing
    const acceleratedResult = await enhanceAIResponse(
      content,
      mockCaseDocuments,
      mockEvidenceDocuments);
      {
        maxResults: 10,
        similarityThreshold,: 0.3,
        enableGPUAcceleration,: true
        enableSIMDPreprocessing: true
      }
    );
    return {
      text: acceleratedResult.enhancedResponse,
      model: 'simd-webgpu-accelerated',
      confidence: 0.9,
      tokenCount: acceleratedResult.enhancedResponse.length / 4, // Rough estimate
      accelerationMetrics: acceleratedResult.acceleratedResults.processingMetrics
    }
  }
  // === Context and History Management ===
  private async buildSmartContext(caseId: string, query: string, legalContext?: string): Promise<AIMessage[]> {
    const cacheKey = `${caseId}-${query}-${legalContext || ''}`;
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }
    const caseMessages = this.cases[caseId]?.messages || [];
    // Get recent messages (last 10)
    const recentMessages = caseMessages.slice(-10);
    // Simple relevance search
    const relevantMessages = caseMessages.filter(msg => {
      const queryLower = query.toLowerCase();
      return msg.content.toLowerCase().includes(queryLower) ||
             (legalContext && msg.content.toLowerCase().includes(legalContext.toLowerCase());
    }).slice(0, 5);
    // Combine and deduplicate
    const contextMessages = [...new Map(
      [...recentMessages, ...relevantMessages]
        .map(msg => [msg.id, msg])
    ).values()].sort((a, b) => a.timestamp - b.timestamp);
    // Cache result
    this.contextCache.set(cacheKey, contextMessages);
    // Cleanup old cache entries
    if (this.contextCache.size > 100) {
      const keys = Array.from(this.contextCache.keys();
      keys.slice(0, 50).forEach(key => this.contextCache.delete(key);
    }
    return contextMessages;
  }
  // === Backend Communication ===
  private async sendToBackend(backend: Backend, messages: AIMessage[]) {
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
  private getBackendEndpoint(backend: Backend): string {
    const endpoints = {
      'vllm': '/api/ai/chat',
      'ollama': '/api/ai/chat',
      'webasm': '/api/ai/webasm-chat',
      'go-micro': '/api/ai/go-micro-chat'
    }
    return endpoints[backend];
  }
  private formatBackendPayload(backend: Backend, messages: AIMessage[]) {
    const basePayload = {
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      temperature: this.config.temperature,
      model: this.config.model
    }
    switch (backend) {
      case 'vllm':
        return { ...basePayload, openaiModel: 'mistralai/Mistral-7B-Instruct-v0.3' }
      case 'webasm':
        return { ...basePayload, useWASM: true, enableGPU: true }
      case 'go-micro':
        return { ...basePayload, service: 'legal-analysis', priority: 'high' }
      default:
        return basePayload;
    }
  }
  private parseBackendResponse(backend: Backend, data: any) {
    return {
      text: data.text || data.response || data.choices?.[0]?.message?.content || '',
      model: data.model || this.config.model,
      tokenCount: data.tokenCount || data.usage?.total_tokens,
      confidence: data.confidence,
      backend
    }
  }
  // === Analysis Methods ===
  private analyzeMessageComplexity(message: string): 'simple' | 'medium' | 'complex' {
    const length = message.length;
    const hasLegalTerms = /\b(contract|deed|liability|statute|precedent|jurisdiction)\b/i.test(message);
    const hasComplexQuery = /\b(analyze|compare|summarize|explain)\b/i.test(message);
    if (length > 500 || (hasLegalTerms && hasComplexQuery)) return 'complex';
    if (length > 100 || hasLegalTerms || hasComplexQuery) return 'medium';
    return 'simple';
  }
  private hasLegalContext(message: string, context?: string): boolean {
    const legalTerms = /\b(legal|law|contract|deed|court|judge|attorney|liability|statute|regulation|compliance)\b/i;
    return legalTerms.test(message) || legalTerms.test(context || '');
  }
  private requiresSpeedOptimization(message: string): boolean {
    const speedIndicators = /\b(quick|fast|urgent|immediately|asap|now)\b/i;
    return speedIndicators.test(message) || message.length < 50;
  }
  // === Performance and Health Monitoring ===
  private updateMetrics(backend: Backend, processingTime: number) {
    this.metrics.totalQueries++;
    // Exponential moving average for latency
    this.metrics.backendLatency[backend] =
      this.metrics.backendLatency[backend] * 0.7 + processingTime * 0.3;
    // Update average response time
    this.metrics.averageResponseTime =
      this.metrics.averageResponseTime * 0.9 + processingTime * 0.1;
  }
  private startHealthMonitoring() {
    if (typeof window === 'undefined') return;
    setInterval(async () => {
      try {
        // removed unused response assignment
        const healthData = await response.json();
        this.backendHealth = {
          'vllm': healthData.backends?.vllm?.reachable ? 1.0 : 0.0,
          'ollama': healthData.backends?.ollama?.version ? 1.0 : 0.0,
          'webasm': healthData.backends?.webasm?.loaded ? 1.0 : 0.0,
          'go-micro': healthData.backends?.['go-micro']?.healthy ? 1.0 : 0.0
        }
        this.availableBackends = Object.entries(this.backendHealth)
          .filter(([_, score]) => score > 0.1)
          .map(([backend]) => backend as Backend);
      } catch (error) {
        console.warn('Health check failed:', error);
      }
    }, 30000); // Every 30 seconds
  }
  // === Persistence ===
  private persistState() {
    if (typeof window === 'undefined') return;
    try {
      const stateToSave = {
        cases: this.cases,
        currentCaseId: this.currentCaseId,
        config: this.config,
        metrics: this.metrics
      }
      localStorage.setItem('ai-assistant-unified-state', JSON.stringify(stateToSave);
    } catch (error) {
      console.error('Failed to persist AI assistant state:', error);
    }
  }
  private loadPersistedState() {
    try {
      const saved = localStorage.getItem('ai-assistant-unified-state');
      if (saved) {
        const state = JSON.parse(saved);
        this.cases = state.cases || {}
        this.currentCaseId = state.currentCaseId;
        this.config = { ...this.config, ...state.config }
        this.metrics = { ...this.metrics, ...state.metrics }
      }
    } catch (error) {
      console.error('Failed to load persisted AI assistant state:', error);
    }
  }
  // === Utility Methods ===
  clearCase(caseId: string) {
    delete this.cases[caseId];
    if (this.currentCaseId === caseId) {
      this.currentCaseId = undefined;
    }
    this.persistState();
  }
  clearAllHistory() {
    this.cases = {}
    this.currentCaseId = undefined;
    this.messageCache.clear();
    this.contextCache.clear();
    this.persistState();
  }
  updateConfig(newConfig: Partial<AssistantConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.persistState();
  }
  exportConversation(caseId: string, format: 'json' | 'markdown' = 'json') {
    const caseData = this.cases[caseId];
    if (!caseData) return null;
    const conversation = {
      caseId,
      title: caseData.title,
      messages: caseData.messages,
      insights: caseData.insights,
      exportedAt: new Date().toISOString(),
      totalMessages: caseData.messages.length
    }
    if (format === 'markdown') {
      return this.convertToMarkdown(conversation);
    }
    return JSON.stringify(conversation, null, 2);
  }
  private convertToMarkdown(conversation: any): string {
    let markdown = `# Legal AI Assistant - ${conversation.title || conversation.caseId}\n\n`;
    markdown += `**Exported**: ${conversation.exportedAt}\n`;
    markdown += `**Total Messages**: ${conversation.totalMessages}\n\n`;
    conversation.messages.forEach((msg: AIMessage) => {
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
}
// Create singleton instance with proper SvelteKit 2 + Svelte 5 pattern
export const aiAssistant = new AIAssistantGlobalStore();
// Export derived stores for compatibility with existing components
export const currentCase = {
  get: () => aiAssistant.currentCase
}
export const currentCaseMessages = {
  get: () => aiAssistant.currentMessages
}
export const isProcessing = {
  get: () => aiAssistant.isProcessing
}
export const currentResponse = {
  get: () => {
    const messages = aiAssistant.currentMessages;
    const lastAssistantMessage = messages.findLast(m => m.role === 'assistant');
    return lastAssistantMessage?.content || '';
  }
}
export const aiError = {
  get: () => aiAssistant.error
}