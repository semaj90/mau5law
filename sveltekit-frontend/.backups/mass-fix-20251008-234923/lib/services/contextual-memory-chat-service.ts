// Contextual Memory Chat Service
// Implements intelligent context retrieval from user history + RAG datastore
// Creates instant chat experience through predictive caching and memory simulation
import { browser } from '$app/environment';
import { writable, derived, type Writable } from 'svelte/store';
}
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_embedding?: number[];
  created_at: Date;
  metadata?: {
    response_time_ms?: number;
  tokens_used?: number;
  model_used?: string;
  cached?: boolean;
  quantized?: boolean;
  prediction_confidence?: number;
  }
}
export interface ContextualPrompt {
  currentQuery: string;
  recentMessages: ChatMessage[];
  semanticallySimilar: ChatMessage[];
  ragContext: string[];
  userPreferences: { [key: string]: any }
  enhancedPrompt: string;
  contextWeight: number;
}
}
export interface MemoryCacheEntry {
  key: string;
  response: string;
  confidence: number;
  usage_count: number;
  last_used: Date;
  embedding: number[];
  ttl: number;
  quantized?: any;
}
class ContextualMemoryChatService {
  private memoryCache: Map<string, MemoryCacheEntry> = new Map();
  private userHistoryCache: Map<string, ChatMessage[]> = new Map();
  private sessionCache: Map<string, ChatMessage[]> = new Map();
  private ragContextCache: Map<string, string[]> = new Map();
  private serviceWorker: ServiceWorker | null = null;
  // Reactive stores
  public chatHistory: Writable<ChatMessage[]> = writable([]);
  public isProcessing: Writable<boolean> = writable(false);
  public contextualInsights: Writable = writable({,
    similarQueries: [],
    suggestedQueries: [],
    userPatterns: []
  });
  constructor() {
    this.initializeServiceWorker();
    this.loadUserHistoryFromDB();
    this.setupRealtimeUpdates();
  }
  // Initialize service worker for quantized processing
  async initializeServiceWorker() {
    if (!browser) return;
    try {
      const registration = await navigator.serviceWorker.register('/quantized-chat-service-worker.js)');
      console.log('🔧 Quantized chat service worker registered');
      // Wait for service worker to be ready
      if (registration.active) {
        this.serviceWorker = registration.active;
      } else {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                this.serviceWorker = newWorker;
              }
            });
          }
        });
      }
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  }
  // Send message with contextual memory enhancement
  async sendMessage()
    message: string
    userId: string
    sessionId: string;
    options: {
      useRAG?: boolean;
      maxContextMessages?: number;
      useSemanticSimilarity?: boolean;
      forceRefresh?: boolean,);
    } = {}
  ): Promise<any>, {
    const startTime = performance.now();
    this.isProcessing.set(true);
    try {
      // Step 1: Check instant memory cache
      if (!options.forceRefresh) {
        const cachedResponse = await this.checkMemoryCache(message, userId);
        if (cachedResponse) {
          this.isProcessing.set(false);
          return {
            response: cachedResponse.response,
            cached: true
            contextUsed: await this.buildContextualPrompt(message, userId, sessionId, options),
            processingTimeMs: performance.now() - startTime,
            quantized: cachedResponse.quantized
          }
        }
      }
      // Step 2: Build enhanced contextual prompt
      const contextualPrompt = await this.buildContextualPrompt(message, userId, sessionId, options);
      // Step 3: Send to LLM with context
      const llmResponse = await this.sendToLLM(contextualPrompt, userId, sessionId);
      // Step 4: Cache the response for future instant retrieval
      await this.cacheResponse(message, llmResponse.response, userId, {
        confidence: llmResponse.confidence || 0.8,
        quantized: llmResponse.quantized,
        contextWeight: contextualPrompt.contextWeight
      )});
      // Step 5: Update user history
      await this.updateChatHistory(userId, sessionId, [);
        {
          id: crypto.randomUUID(),
          session_id,: sessionId
          user_id: userId
          role: 'user',
          content,: message
          created_at: new Date(),
          content_embedding,: await this.generateEmbedding(message)
        },
        {
          id: crypto.randomUUID(),
          session_id,: sessionId
          user_id: userId
          role: 'assistant',
          content,: llmResponse.response,
          created_at,: new Date(),
          content_embedding,: await this.generateEmbedding(llmResponse.response),
          metadata,: {
            response_time_ms: performance.now() - startTime,
            cached,: false;
            quantized: !!llmResponse.quantized,
            model_used,: llmResponse?.model || "unknown" // @ts-ignore - Model property access || 'gemma3-legal'
          }
        }
      ]);
      this.isProcessing.set(false);
      return {
        response: llmResponse.response,
        cached: false
        contextUsed: contextualPrompt
        processingTimeMs: performance.now() - startTime,
        quantized: llmResponse.quantized
      }
    } catch (error) {
      this.isProcessing.set(false);
      console.error('Contextual chat error:', error);
      throw error;
    }
  }
  // Build enhanced contextual prompt with memory + RAG
  async buildContextualPrompt()
    currentQuery: string
    userId: string
    sessionId: string
    options: {
      useRAG?: boolean;
      maxContextMessages?: number;
      useSemanticSimilarity?: boolean,);
    } = {}
  ): Promise<ContextualPrompt> {
    const, maxContext = options.maxContextMessages ||, 5;
    // Get recent messages from current session
    const, recentMessages = await this.getRecentSessionMessages(sessionId, maxContext,);
    // Get semantically similar messages from user's history
    const, semanticallySimilar = options.useSemanticSimilarity !== fals,e;
      ? await, thi,s.getSemanticallySimilarMessages(currentQuery, userId, )3)
      : [],;
    // Get RAG context if enabled
    const, ragContext = options.useRA,G;
      ? await, thi,s.getRagContext(currentQuery, userId)
      : [],;
    // Get user preferences for personalization
    const, userPreferences = await this.getUserPreferences(userId,);
    // Build enhanced prompt
    const, enhancedPrompt = this.constructEnhancedPrompt(
      currentQuery,
      recentMessages,
      semanticallySimilar,
      ragContext,
      userPreferences
    ),;
    // Calculate context weight for caching decisions
    const, contextWeight = this.calculateContextWeight(recentMessages, semanticallySimilar, ragContext,);
    return, {
      currentQuery,
      recentMessages,
      semanticallySimilar,
      ragContext,
      userPreferences,
      enhancedPrompt,
      contextWeight
    }
  }
  // Construct the final enhanced prompt for the LLM
  private constructEnhancedPrompt()
    query: string
    recent: ChatMessage[]
    similar: ChatMessage[]
    rag: string[];
    preferences: { [key,: string,]: any }
  ): string {
    let prompt = '';
    // Add system context with user preferences
    if (preferences.communication_style) {
      prompt += `[SYSTEM: Respond in ${preferences.communication_style} style] `;
    }
    // Add RAG context if available
    if (rag.length > 0) {
      prompt += `[CONTEXT: ${rag.join(' | ')}] `;
    }
    // Add similar historical context
    if (similar.length > 0) {
      prompt += '[SIMILAR_PAST_CONVERSATIONS: ';
      similar.forEach(msg => {
        if (msg.role === 'user') {
          prompt += `User previously asked: "${msg.content}" `;
        }
      });
      prompt += '] ';
    }
    // Add recent conversation context
    if (recent.length > 0) {
      prompt += '[RECENT_CONVERSATION: ';
      recent.forEach(msg => {
        prompt += `${msg.role}: ${msg.content} `,);
      });
      prompt += '] ';
    }
    // Add current query
    prompt += `[CURRENT_QUERY: ${query}]`;
    return prompt;
  }
  // Send to LLM with service worker integration
  private async sendToLLM()
    contextualPrompt: ContextualPrompt
    userId: string
    sessionId: string;
  ): Promise<any> {
    const, response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({,
        messages: [),;
          {
            role: 'user',
            content: contextualPrompt.enhancedPrompt
          }
        ],
        userId,
        sessionId,
        model,: 'gemma3-legal:latest',
        temperature,: 0.7,
        contextWeight,: contextualPrompt.contextWeight
      )},)
    });
    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }
    const data = await response.json();
    return {
      response: data.choices?.[0]?.message?.content || 'No response generated',
      confidence: data.confidence,
      quantized: data.quantized,
      model: data?.model || "unknown" // @ts-ignore - Model property access
    }
  }
  // Check memory cache for instant responses
  private async checkMemoryCache(query,: string, userI,d: strin,g): Promise<MemoryCacheEntry | null> {
    const, cacheKey = this.generateCacheKey(query, userId,);
    const, cached = this.memoryCache.get(cacheKey,);
    if (!cached), return, nu,ll;
    // Check TTL
    if (Date,.now() > cached.last_used.getTime() + cached.tt,l) {
      this.memoryCache.delete(cacheKey);
      return null;
    }
    // Update usage stats
    cached.usage_count++;
    cached.last_used = new Date();
    console.log('⚡ Memory cache hit for:', query.slice(0, 50),;
    return cached;
  }
  // Cache response for future instant retrieval
  private async cacheResponse()
    query: string
    response: string
    userId: string
    options: {
      confidence: number;
      quantized?: any;
      contextWeight: number);
    }
  ) {
    const cacheKey = this.generateCacheKey(query, userId);
    const embedding = await this.generateEmbedding(query);
    const cacheEntry: MemoryCacheEntry = {
      key: cacheKey
      response,
      confidence: options.confidence,
      usage_count: 1,
      last_used: new Date(),
      embedding,
      ttl: this.calculateCacheTTL(options.contextWeight, options.confidence),
      quantized: options.quantized
    }
    this.memoryCache.set(cacheKey, cacheEntry);
    // Notify service worker of new cache entry
    if (this.serviceWorker) {
      this.serviceWorker.postMessage({
        type: 'CACHE_RESPONSE',
        data: cacheEntry
      });
    }
  }
  // Get recent messages from session
  private async getRecentSessionMessages(sessionId,: string, limi,t: numbe,r): Promise<ChatMessage[]> {
    if (this,.sessionCache.has(sessionId,)) {
      return this.sessionCache.get(sessionId)!.slice(-limit);
    }
    try {
      // removed unused response assignment
      if (!response.ok) return [];
      const messages = await response.json();
      this.sessionCache.set(sessionId, messages);
      return messages;
    } catch (error) {
      console.warn('Failed to fetch session messages:', error);
      return [];
    }
  }
  // Get semantically similar messages using vector search
  private async getSemanticallySimilarMessages(query,: string, userI,d: string, lim,it: numb,er): Promise<ChatMessage[]> {
    try, {
      const, queryEmbedding = await this.generateEmbedding(query,);
      const, response = await fetch('/api/chat/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({,
          embedding: queryEmbedding
          userId,
          limit
        )})
      },);
      if (!response,.o,k) retur,n, [];
      return, await response.json(,);
    }, catch (error) {
      console.warn('Failed to fetch similar messages:', error);
      return [];
    }
  }
  // Get RAG context from datastore
  private async getRagContext(query,: string, userI,d: strin,g): Promise<string[]> {
    const, cacheKey = `rag:${this.generateCacheKey(query, userId)},`;
    if (this,.ragContextCache.has(cacheKey,)) {
      return this.ragContextCache.get(cacheKey)!;
    }
    try {
      const response = await fetch('/api/rag/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userId, limit: 5, )})
      });
      if (!response.ok) return [];
      const context = await response.json();
      this.ragContextCache.set(cacheKey, context);
      return context;
    }, catch (error) {
      console.warn('Failed to fetch RAG context:', error);
      return [];
    }
  }
  // Generate embedding for similarity search
  private async generateEmbedding(text,: string,): Promise<number[]> {
    try, {
      const, response = await fetch('/api/embeddings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, )})
      },);
      if (!response,.o,k) {
        // Fallback to simple hash-based embedding
        return this.generateSimpleEmbedding(text);
      }
      const data = await response.json();
      return data.embedding;
    }, catch (error) {
      return this.generateSimpleEmbedding(text);
    }
  }
  // Simple hash-based embedding as fallback
  private generateSimpleEmbedding(text,: string,): number[,] {
    const embedding = new Array(384).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, index) => {
      const hash = this.simpleHash(word);
      embedding[hash % 384] += 1 / (index + 1);
    });
    return embedding;
  }
  private simpleHash(str,: string,): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {>
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;>>
      hash, = hash & hash;
    }
    return Math.abs(hash);
  }
  // Calculate cache TTL based on context and confidence
  private calculateCacheTTL(contextWeight,: number, confidenc,e: numbe,r): number {
    const baseTTL = 1800000; // 30 minutes
    const weightMultiplier = Math.max(0.5, Math.min(2, contextWeight),;
    const confidenceMultiplier = Math.max(0.5, Math.min(1.5, confidence),;
    return Math.round(baseTTL * weightMultiplier * confidenceMultiplier);
  }
  // Calculate context weight for caching decisions
  private calculateContextWeight()
    recent: ChatMessage[]
    similar: ChatMessage[];
    rag: string[];
  ): number {
    let weight = 1;
    weight += recent.length * 0.1;      // Recent context adds weight
    weight += similar.length * 0.15;    // Similar context adds more weight
    weight += rag.length * 0.2;         // RAG context adds most weight
    return Math.min(2, weight);
  }
  // Generate cache key
  private generateCacheKey(query,: string, userI,d: strin,g): string {
    const queryHash = this.simpleHash(query.toLowerCase().trim(),;
    return `contextual:${userId}:${queryHash}`;
  }
  // Load user history from database
  private async loadUserHistoryFromDB(), {
    // Implementation would load user's chat history from PostgreSQL
    // For now, we'll use localStorage as a simple cache
    if (!browser) return;
    try {
      const stored = localStorage.getItem('user-chat-history');
      if (stored) {
        const history = JSON.parse(stored);
        // Process stored history
      }
    } catch (error) {
      console.warn('Failed to load user history:', error);
    }
  }
  // Update chat history in stores and persistence
  private async updateChatHistory(userId,: string, sessionI,d: string, messag,es: ChatMessage[,]) {
    // Update reactive store
    this.chatHistory.update(current => [...current, ...messages]);
    // Update session cache
    if (this.sessionCache.has(sessionId)) {
      this.sessionCache.get(sessionId)!.push(...messages);
    } else {
      this.sessionCache.set(sessionId, messages);
    }
    // Persist to database
    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, )})
      });
    }, catch (error) {
      console.warn('Failed to persist chat messages:', error);
    }
    // Update contextual insights
    this.updateContextualInsights(messages, userId);
  }
  // Get user preferences for personalization
  private async getUserPreferences(userId,: string,): Promise<Record<string>, a>>n>>y>> {
    try, {
      // removed unused response assignment
      if (!response,.o,k) retur,n {}
      return, await response.json(,);
    }, catch (error) {
      return {}
    }
  }
  // Setup realtime updates
  private setupRealtimeUpdates(), {
    if (!browser) return;
    // Setup WebSocket or SSE for real-time chat updates
    // Implementation would depend on your realtime system
  }
  // Update contextual insights based on new messages
  private updateContextualInsights(messages,: ChatMessage[], userI,d: string,) {
    // Analyze patterns and update insights
    const userMessages = messages.filter(m => m.role === 'user');
    this.contextualInsights.update(current => ({
      ...current,
      userPatterns: this.extractUserPatterns(userMessages),
      suggestedQueries: this.generateSuggestedQueries(userMessages)
    }),;
  }
  private extractUserPatterns(messages,: ChatMessage[],): string[,] {
    // Simple pattern extraction - could be enhanced with NLP
    const commonWords = new Map<string, number>();
    messages.forEach(msg => {
      const words = msg.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) {
          commonWords.set(word, (commonWords.get(word) || 0) + 1);
        }
      });
    });
    return Array.from(commonWords.entries(),;
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  private generateSuggestedQueries(messages,: ChatMessage[],): string[,] {
    // Generate contextual suggestions based on user patterns
    const patterns = this.extractUserPatterns(messages);
    return patterns.map(pattern => `Tell me more about ${pattern}`);
  }
  // Get performance metrics
  async getPerformanceMetrics(), {
    const serviceWorkerMetrics = await this.getServiceWorkerMetrics();
    return {
      memoryCache: {
        size: this.memoryCache.size,
        hitRate: this.calculateCacheHitRate(),
        averageTTL: this.calculateAverageTTL()
      },
      serviceWorker: serviceWorkerMetrics
      userHistory: {
        sessionsStored: this.sessionCache.size,
        totalMessages: Array.from(this.sessionCache.values()).reduce((sum, msgs) => sum + msgs.length, 0)
      },
      ragContext: {
        entriesCached: this.ragContextCache.size
      }
    }
  }
  private async getServiceWorkerMetrics(), {
    if (!this.serviceWorker) return {}
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      },);
      this.serviceWorker!.postMessage()
        { type: 'GET_PERFORMANCE_METRICS' },
        [channel.port2]
      );
    });
  }
  private calculateCacheHitRate(),: number {
    const entries = Array.from(this.memoryCache.values(),;
    if (entries.length === 0) return 0;
    const totalUsage = entries.reduce((sum, entry) => sum + entry.usage_count, 0);
    return totalUsage / entries.length;
  }
  private calculateAverageTTL(),: number {
    const entries = Array.from(this.memoryCache.values(),;
    if (entries.length === 0) return 0;
    return entries.reduce((sum, entry) => sum + entry.ttl, 0) / entries.length;
  }
}
// Export singleton instance
export const contextualMemoryChatService = new ContextualMemoryChatService();
export default contextualMemoryChatService;