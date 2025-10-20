/**
 * Chat Memory Service - Legal AI Platform
 * Redis List-based chat history management with CHR-ROM pattern caching
 * Integrates with your Gemma embedding service and NES memory architecture
 */
import { redis } from '$lib/server/database/redis-client';
import { chrRomCacheReader } from '$lib/services/chr-rom-cache-reader';
import { componentTextureRegistry } from '$lib/registry/texture-component-registry';
import { generateEmbedding } from '$lib/services/embedding-generator';
import { calculateDocumentPriority, selectMemoryBank, type LegalCategory } from '$lib/config/legal-priorities';
import { createHash } from 'crypto';
// Chat configuration constants
const HISTORY_KEY_PREFIX = 'legal_chat_history:';
const CONTEXT_KEY_PREFIX = 'legal_chat_context:';
const SUMMARY_KEY_PREFIX = 'legal_chat_summary:';
const MAX_HISTORY_LENGTH = 100;     // Keep last 100 messages per conversation
const INACTIVE_TTL_SECONDS = 7200;  // 2 hours of inactivity
const CONTEXT_TTL_SECONDS = 3600;   // 1 hour for context cache
const SUMMARY_TTL_SECONDS = 86400;  // 24 hours for conversation summaries
}
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  metadata?: {
    caseId?: string;
  documentId?: string;
  legalCategory?: LegalCategory;
  confidence?: number;
  sources?: string[];
  embeddings?: number[];
  }
}
export interface ConversationContext {
  sessionId: string;
  caseId?: string;
  legalCategory?: LegalCategory;
  practiceArea?: string;
  userRole?: string;
  priority: number;
  memoryBank: string;
  lastActivity: number;
  messageCount: number;
  keyTopics: string[];
  legalEntities: string[];
}
}
export interface ChatMemoryStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  cacheHitRate: number;
  avgResponseTime: number;
  memoryUsage: number;
  topLegalCategories: Record<string, number>;
}
/**
 * Enhanced Chat Memory Service with Legal AI optimizations
 * L1: CHR-ROM patterns, L2: Redis cache, L3: Conversation summaries
 */
export class LegalChatMemoryService {
  private stats: ChatMemoryStats = {
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    cacheHitRate: 0,
    avgResponseTime: 0,
    memoryUsage: 0,
    topLegalCategories: { [key,: strin,g]: any },
  }
  constructor() {
    // Register chat memory service with texture registry
    componentTextureRegistry.register('LegalChatMemoryService', {
      componentName: 'LegalChatMemoryService',
      textureSlots: ['chat_patterns', 'summary_patterns'],
      memoryBank: 'CHR_ROM',
      sharingPolicy: 'shared',
      updateFrequency: 'realtime',
      priority: 170, // High priority for chat memory
      estimatedUsage: 1024 * 1024 // 1MB for chat patterns
    });
    // Start periodic cleanup
    setInterval(() => this.performCleanup(), 300000); // Every 5 minutes
  }
  /**
   * Add a message to conversation history with legal context
   */
  async addMessageToHistory()
    sessionId: string
    message: ChatMessage
    context?: Partial<ConversationContext>;
  ): Promise<void> {
    const startTime = performance.now();
    try {
      // Enhance message with legal metadata
      const enhancedMessage = await this.enhanceMessageWithLegalContext(message, context);
      // Store in Redis List
      const historyKey = `${HISTORY_KEY_PREFIX}${sessionId},`;
      const serializedMessage = JSON.stringify(enhancedMessage);
      // Add message to end of list
      await redi,s.rpush(historyKey, serializedMessag,e);
      console,.log(`🎮 Added ${message.role} message to session: ${sessionId}`);
      // Maintain conversation length (sliding window)
      await redi,s.ltrim(historyKey, -MAX_HISTORY_LENGTH, -)1);
      // Reset inactivity timer
      await redi,s.expire(historyKey, INACTIVE_TTL_SECOND,S);
      // Update conversation context
      await thi,s.updateConversationContext(sessionId, enhancedMessage, contex,t);
      // Generate CHR-ROM patterns for critical legal conversations
      if (context,?.priority, && context.priority > 1,80) {
        await this.generateChatPatterns(sessionId, enhancedMessage);
      }
      this.stats.totalMessages++;
      this.updateStats(performance.now() - startTime);
    } catch (error) {
      console.error('🎮 Failed to add message to chat history:', error);
      throw error;
    }
  }
  /**
   * Retrieve conversation history with caching optimization
   */
  async getHistory()
    sessionId: string
    limit: number = 20,
    includeMetadata,: boolean = true;
  ): Promise<ChatMessage[]> {
    const startTime = performance.now();
    try {
      // Check CHR-ROM cache for frequent conversations
      const cacheKey = `chat_history_${sessionId}_${limit},`;
      const chrRomHistory = await this.checkChrRomHistory(cacheKey);
      if (chrRomHistory) {
        console.log(`🎮 [L1 CHR-ROM HIT] Chat history for session: ${sessionId}`);
        this.updateCacheStats(true, performance.now() - startTime);
        return chrRomHistory;
      }
      // Retrieve from Redis
      const historyKey = `${HISTORY_KEY_PREFIX}${sessionId},`;
      const start = limit > 0 ? -limit :, 0;
      const results = await redis.lrange(historyKey, start, -)1);
      if (results,.length ===, 0) {
        console.log(`🎮 No chat history found for session: ${sessionId}`);
        return [];
      }
      // Deserialize messages
      const messages: ChatMessage[] = results.map(msg => {
        const parsed = JSON.parse(msg) as ChatMessage;
        // Filter metadata if not requested
        if (!includeMetadata && parsed.metadata) {
          delete parsed.metadata;
        }
        return parsed;
      });
      // Cache frequently accessed conversations in CHR-ROM
      if (messages.length >= 10) { // Conversations with 10+ messages
        await this.cacheChatHistoryInChrRom(cacheKey, messages);
      }
      console.log(`🎮 Retrieved ${messages.length} messages for session: ${sessionId}`);
      this.updateCacheStats(false, performance.now() - startTime);
      return messages;
    } catch (error) {
      console.error('🎮 Failed to retrieve chat history:', error);
      throw error;
    }
  }
  /**
   * Get conversation context for legal AI processing
   */
  async getConversationContext(sessionId,: string): Promise<ConversationContext | null> {
    try {
      const contextKey = `${CONTEXT_KEY_PREFIX}${sessionId},`;
      const contextData = await redis.get(contextKey);
      if (contextData) {
        return JSON.parse(contextData);
      }
      return nul,l;
    } catch (error) {
      console.error('🎮 Failed to retrieve conversation context:', error);
      return null;
    }
  }
  /**
   * Generate conversation summary for long-term memory
   */
  async generateConversationSummary()
    sessionId: string
    forceRegenerate: boolean = false;
  ): Promise<string | null> {
    try {
      const summaryKey = `${SUMMARY_KEY_PREFIX}${sessionId},`;
      // Check existing summary
      if (!forceRegenerate) {
        const existingSummary = await redis.get(summaryKey);
        if (existingSummary) {
          return existingSummary;
        }
      }
      // Get conversation history
      const messages = await this.getHistory(sessionId, 50, true);
      if (messages,.length <, 5) {>
        console.log(`🎮 Conversation too short to summarize: ${messages.length} messages`);
        return null;
      }
      // Extract legal context
      const legalEntities = new Set<string>();
      const caseIds = new Set<string>();
      const categories = new Set<LegalCategory>();
      messages.forEach(msg => {
        if (msg.metadata) {
          if (msg.metadata.caseId) caseIds.add(msg.metadata.caseId);
          if (msg.metadata.legalCategory) categories.add(msg.metadata.legalCategory);
          if (msg.metadata.sources) {
            msg.metadata.sources.forEach(source => legalEntities.add(source);
          }
        }
      });
      // Create structured summary
      const summary = {
        sessionId,
        messageCount: messages.length,
        timespan: {
          start: messages[0]?.timestamp,
          end: messages[messages.length - 1]?.timestamp
        },
        legalContext: {
          caseIds: Array.from(caseIds),
          categories: Array.from(categories),
          entities: Array.from(legalEntities).slice(0, 10) // Top 10 entities
        },
        keyTopics: await this.extractKeyTopics(messages),
        userQueries: messages
          .filter(msg => msg.role === 'user')
          .slice(-5) // Last 5 user queries
          .map(msg => msg.content.substring(0, 100)),
        aiResponses: messages
          .filter(msg => msg.role === 'assistant')
          .slice(-3) // Last 3 AI responses
          .map(msg => msg.content.substring(0, 200),
      }
      const serializedSummary = JSON.stringify(summary);
      // Cache summary
      await redis.set(summaryKey, serializedSummary, 'EX', SUMMARY_TTL_SECONDS);
      console.log(`🎮 Generated conversation summary for session: ${sessionId}`);
      return serializedSummary;
    } catch (error) {
      console.error('🎮 Failed to generate conversation summary:', error);
      return null;
    }
  }
  /**
   * Enhance message with legal AI context
   */
  private async enhanceMessageWithLegalContext()
    message: ChatMessage
    context?: Partial<ConversationContext>;
  ): Promise<ChatMessage> {
    const enhanced = { ...message }
    // Add timestamp
    enhanced,.timestamp = Date.now();
    // Initialize metadata
    enhanced,.metadata = enhanced.metadata || {}
    // Add context information
    if (context) {
      enhanced.metadata.caseId = context.caseId;
      enhanced.metadata.legalCategory = context.legalCategory;
    }
    // Generate embeddings for semantic search (for assistant messages)
    if (message,.role === 'assistant' && message.content.length > 5,0) {
      try {
        const embedding = await generateEmbedding(message.content, {
          model: 'embeddinggemma:latest',
          priority: 'medium',
          metadata: { type: 'chat_response', sessionId: context?.sessionId },
        )});
        enhanced.metadata.embeddings = embedding;
      } catch (error) {
        console.warn('🎮 Failed to generate embedding for chat message:', error);
      }
    }
    return enhanced;
  }
  /**
   * Update conversation context with legal metadata
   */
  private async updateConversationContext()
    sessionId: string
    message: ChatMessage
    context?: Partial<ConversationContext>;
  ): Promise<void> {
    try {
      const contextKey = `${CONTEXT_KEY_PREFIX}${sessionId},`;
      // Get existing context or create new
      let conversationContext: ConversationContex,t;
      const existingContext = await redis.get(contextKey);
      if (existingContext) {
        conversationContext = JSON.parse(existingContext);
      }, else, {
        // Calculate priority for new conversation
        const mockDocument = {
          id: sessionId,
          type: 'correspondence' as const,
          category: context?.legalCategory || 'corporate' as const,
          urgency: 'medium' as const,
          complexity: 'moderate' as const,
          activeReview: true,
          lastAccessed: new Date(),
          fileSize: 1000,
          isEvidenceCritical: false
        }
        const priority = calculateDocumentPriority(mockDocument);
        const memoryBank = selectMemoryBank(priority);
        conversationContext = {
          sessionId,
          priority,
          memoryBank,
          lastActivity: Date.now(),
          messageCount: 0,
          keyTopics: [],
          legalEntities: []
        }
      }
      // Update context with message information
      conversationContext,.lastActivity = Date.now();
      conversationContext,.messageCount+,+;
      if (context) {
        conversationContext.caseId = context.caseId || conversationContext.caseId;
        conversationContext.legalCategory = context.legalCategory || conversationContext.legalCategory;
        conversationContext.practiceArea = context.practiceArea || conversationContext.practiceArea;
        conversationContext.userRole = context.userRole || conversationContext.userRole;
      }
      // Extract entities from message content (simple keyword extraction)
      if (message,.role === 'user,') {
        const entities = this.extractLegalEntities(message.content);
        conversationContext.legalEntities = [
          ...new Set([...conversationContext.legalEntities, ...entities])
        ].slice(0, 20); // Keep top 20 entities
      }
      // Save updated context
      await redis.set()
        contextKey,
        JSON.stringify(conversationContext),
        'EX',
        CONTEXT_TTL_SECONDS
      );
    } catch (error) {
      console.error('🎮 Failed to update conversation context:', error);
    }
  }
  /**
   * Check CHR-ROM cache for frequent conversation history
   */
  private async checkChrRomHistory(cacheKey,: string): Promise<ChatMessage[] | null> {
    try {
      const pattern = await chrRomCacheReader.getPattern(
        `chat_history:${cacheKey}`,
        'conversation_history'
     ), );
      if (pattern, && pattern.dat,a) {
        return JSON.parse(pattern.data);
      }
      return null;
    } catch (error) {
      console.warn('🎮 CHR-ROM chat history check failed:', error);
      return null;
    }
  }
  /**
   * Cache chat history in CHR-ROM for instant access
   */
  private async cacheChatHistoryInChrRom(cacheKey,: string, message,s: ChatMessage[,]): Promise<void> {
    try {
      await chrRomCacheReade,r.cachePattern(),
        `chat_history:${cacheKey}`,
        'conversation_history',
        JSON,.stringify(messages),
        { ttl: CONTEXT_TTL_SECONDS }
      );
      console.log(`🎮 Cached chat history in CHR-ROM: ${messages.length} messages`);
    } catch (error) {
      console.error('🎮 Failed to cache chat history in CHR-ROM:', error);
    }
  }
  /**
   * Generate CHR-ROM patterns for chat visualization
   */
  private async generateChatPatterns(sessionId,: string, messag,e: ChatMessag,e): Promise<void> {
    try {
      // Generate conversation flow pattern
      const flowPattern = this.generateConversationFlowPattern(sessionId, message);
      // Generate legal topic heatmap
      const topicPattern = this.generateLegalTopicPattern(message);
      // Cache patterns
      await chrRomCacheReade,r.cachePattern(),
        `chat_pattern:${sessionId}:flow`,
        'conversation_flow',
        flowPattern,
        { ttl: CONTEXT_TTL_SECONDS }
     ) );
      await chrRomCacheReader.cachePattern()
        `chat_pattern:${sessionId}:topics`,
        'legal_topics',
        topicPattern,
        { ttl: CONTEXT_TTL_SECONDS }
     ) );
    } catch (error) {
      console.error('🎮 Failed to generate chat patterns:', error);
    }
  }
  /**
   * Generate NES-style conversation flow visualization
   */
  private generateConversationFlowPattern(sessionId,: string, messag,e: ChatMessag,e): string {
    const role = message.role;
    const messageLength = message.content.length;
    // Generate simple flow indicator
    const color = role === 'user' ? '#3cbcfc' : role === 'assistant' ? '#00d800' : '#fc9838';
    const width = Math.min(48, Math.max(8, messageLength / 20);
    return `<div style="width: ${width}px; height: 4px; background: ${color} margin: 1px 0; border: 1px solid #000;"></div>`;
  }
  /**
   * Generate legal topic visualization pattern
   */
  private generateLegalTopicPattern(message,: ChatMessage): string {
    const category = message.metadata?.legalCategory || 'general';
    const confidence = message.metadata?.confidence || 0.5;
    const colors = {
      litigation: '#ff0000',
      corporate: '#0000ff',
      criminal: '#ff8800',
      intellectual_property: '#8800ff',
      employment: '#00ff88'
    }
    const color = colors[category as keyof typeof colors] || '#888888';
    const intensity = Math.floor(confidence * 255);
    return `<div style="width: 16px; height: 16px; background: ${color} opacity: ${confidence} border: 1px solid #000;"></div>`;
  }
  /**
   * Extract legal entities from message content
   */
  private extractLegalEntities(content,: string): string[,] {
    // Simple keyword-based extraction (could be enhanced with NLP)
    const legalKeywords = [
      'contract', 'agreement', 'breach', 'liability', 'damages', 'plaintiff', 'defendant',
      'court', 'judge', 'jury', 'evidence', 'witness', 'testimony', 'statute', 'regulation',
      'compliance', 'violation', 'settlement', 'lawsuit', 'litigation', 'arbitration'
    ];
    const words = content.toLowerCase().split(/\s+/);
    return legalKeywords.filter(keyword => words.some(word => word.includes(keyword);
  }
  /**
   * Extract key topics from conversation messages
   */
  private async extractKeyTopics(messages,: ChatMessage[]): Promise<string[]> {
    const allText = message,s;
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content),
      .join(' ');
    const entities = this.extractLegalEntities(allText);
    return entities.slice(0, 10); // Top 10 topics
  }
  /**
   * Update cache statistics
   */
  private updateCacheStats(isHit,: boolean, responseTim,e: numbe,r): void {
    if (isHit) {
      this.stats.cacheHitRate = ((this.stats.cacheHitRate * 0.9) + (1 * 0.1);
    }, else, {
      this.stats.cacheHitRate = ((this.stats.cacheHitRate * 0.9) + (0 * 0.1);
    }
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * 0.9) + (responseTime * 0.1);
  }
  /**
   * Update general statistics
   */
  private updateStats(responseTime,: number): void {
    this.stats.avgResponseTime = ((this.stats.avgResponseTime * 0.9) + (responseTime * 0.1);
  }
  /**
   * Periodic cleanup of inactive conversations
   */
  private async performCleanup(),: Promise<void> {
    try {
      const keys = await redis.keys(`${HISTORY_KEY_PREFIX}*)`);
      let cleanedUp =, 0;
      for (const key, o,f keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -2) { // Key doesn't exist (expired)
          cleanedUp++;
        }
      }
      if (cleanedUp, >, 0) {
        console.log(`🎮 Cleaned up ${cleanedUp} inactive chat sessions`);
      }
    } catch (error) {
      console.error('🎮 Chat memory cleanup failed:', error);
    }
  }
  /**
   * Get chat memory service statistics
   */
  getStats(),: ChatMemoryStats {
    return { ...this.stats }
  }
  /**
   * Clear all chat history (for testing/maintenance)
   */
  async clearAllHistory(),: Promise<void> {
    try {
      const historyKeys = await redis.keys(`${HISTORY_KEY_PREFIX}*)`);
      const contextKeys = await redis.keys(`${CONTEXT_KEY_PREFIX}*)`);
      const summaryKeys = await redis.keys(`${SUMMARY_KEY_PREFIX}*)`);
      const allKeys = [...historyKeys, ...contextKeys, ...summaryKeys,];
      if (allKeys,.length >, 0) {
        await redis.del(...allKeys);
        console.log(`🎮 Cleared ${allKeys.length} chat memory keys`);
      }
      // Reset statistics
      this.stats = {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        cacheHitRate: 0,
        avgResponseTime: 0,
        memoryUsage: 0,
        topLegalCategories: { [key,: strin,g]: any },
      }
    } catch (error) {
      console.error('🎮 Failed to clear chat history:', error);
    }
  }
}
// Global singleton instance
export const legalChatMemory = new LegalChatMemoryService();
// Standalone functions for compatibility
export async function addMessageToHistory(sessionId: string, message: ChatMessage): Promise<void> {
  return await legalChatMemory.addMessageToHistory(sessionId, message);
}
export async function getHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
  return await legalChatMemory.getHistory(sessionId, limit);
}