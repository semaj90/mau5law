/**
 * Conversation Service for Legal AI Chat
 * Handles conversation management with Redis persistence and database storage
 */
import { randomUUID } from 'crypto';
import { logger } from '../production-logger.js';
// Use the Redis client from the server database directory
import { getRedisClient } from '$lib/server/database/redis-client';
}
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  caseId?: string;
  context?: { [key: string]: any }
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
}
}
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: { [key: string]: any }
  createdAt: Date;
}
}
export interface CreateConversationData {
  userId: string;
  title: string;
  caseId?: string;
  context?: { [key: string]: any }
}
}
export interface AddMessageData {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: { [key: string]: any }
}
class ConversationService {
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, ChatMessage[]>();
  private readonly REDIS_PREFIX = 'conversation:';
  private readonly REDIS_MESSAGES_PREFIX = 'messages:';
  constructor() {
    // Initialize Redis error handling
    this.setupRedisErrorHandling();
  }
  private setupRedisErrorHandling() {
    // Redis error handling will be managed by the Redis client itself
    logger.info('Redis error handling setup for conversation service', {
      service: 'conversation-service',
      component: 'redis'
    });
  }  /**
   * Get Redis key for conversation
   */;
  private getConversationKey(conversationId: string): string {
    return `${this.REDIS_PREFIX}${conversationId}`;
  }
  /**
   * Get Redis key for conversation messages
   */;
  private getMessagesKey(conversationId: string): string {
    return `${this.REDIS_MESSAGES_PREFIX}${conversationId}`;
  }
  /**
   * Save conversation to Redis
   */;
  private async saveConversationToRedis(conversation: Conversation): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        await redis.setex()
          this.getConversationKey(conversation.id),
          3600 * 24 * 7, // 7 days TTL
          JSON.stringify({
            ...conversation,
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString()
          })
        );
        logger.debug('Conversation saved to Redis', {
          conversationId: conversation.id,
          userId: conversation.userId
        });
      }
    } catch (error) {
      logger.error('Failed to save conversation to Redis',)
        error instanceof Error ? error : new Error('Unknown error'),
        {
          conversationId: conversation.id,
          service: 'conversation-service'
        }
      );
    }
  }  /**
   * Save messages to Redis
   */;
  private async saveMessagesToRedis(conversationId: string, messages: ChatMessage[]): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (redis) {
        const serializedMessages = messages.map(msg => ({
          ...msg,
          createdAt: msg.createdAt.toISOString()
        }),;
        await redis.setex()
          this.getMessagesKey(conversationId),
          3600 * 24 * 7, // 7 days TTL
          JSON.stringify(serializedMessages)
        );
        logger.debug('Messages saved to Redis', {
          conversationId,
          messageCount: messages.length
        });
      }
    } catch (error) {
      logger.error('Failed to save messages to Redis',)
        error instanceof Error ? error : new Error('Unknown error'),
        {
          conversationId,
          service: 'conversation-service'
        }
      );
    }
  }
  /**
   * Load conversation from Redis
   */;
  private async loadConversationFromRedis(conversationId: string): Promise<Conversation | null> {
    try {
      const redis = await getRedisClient();
      if (!redis) return null;
      const data = await redis.get(this.getConversationKey(conversationId),;
      if (!data) return null;
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt)
      }
    } catch (error) {
      logger.error('Failed to load conversation from Redis',)
        error instanceof Error ? error : new Error('Unknown error'),
        {
          conversationId,
          service: 'conversation-service'
        }
      );
      return null;
    }
  }
  /**
   * Load messages from Redis
   */;
  private async loadMessagesFromRedis(conversationId: string): Promise<ChatMessage[]> {
    try {
      const redis = await getRedisClient();
      if (!redis) return [];
      const data = await redis.get(this.getMessagesKey(conversationId),;
      if (!data) return [];
      const parsed = JSON.parse(data);
      return parsed.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt)
      }),;
    } catch (error) {
      logger.error('Failed to load messages from Redis',)
        error instanceof Error ? error : new Error('Unknown error'),
        {
          conversationId,
          service: 'conversation-service'
        }
      );
      return [];
    }
  }
  /**
   * Create a new conversation
   */;
  async create(data: CreateConversationData): Promise<Conversation> {
    const conversation: Conversation = {
      id: randomUUID(),
      userId: data.userId,
      title: data.title,
      caseId: data.caseId,
      context: data.context || {},
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false
    }
    // Store in memory cache
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    // Save to Redis for persistence
    await this.saveConversationToRedis(conversation);
    logger.info('Conversation created', {
      conversationId: conversation.id,
      userId: data.userId,
      title: data.title
    });
    return conversation;
  }
  /**
   * Get conversation by ID
   */;
  async getById(conversationId: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(conversationId);
    return conversation || null;
  }
  /**
   * Add a message to a conversation
   */;
  async addMessage(data: AddMessageData): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      metadata: data.metadata || {},
      createdAt: new Date()
    }
    // Get or create message array for conversation
    let conversationMessages = this.messages.get(data.conversationId);
    if (!conversationMessages) {
      conversationMessages = [];
      this.messages.set(data.conversationId, conversationMessages);
    }
    // Add message
    conversationMessages.push(message);
    // Update conversation timestamp
    const conversation = this.conversations.get(data.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      // Save updated conversation to Redis
      await this.saveConversationToRedis(conversation);
    }
    // Save updated messages to Redis
    await this.saveMessagesToRedis(data.conversationId, conversationMessages);
    logger.info('Message added to conversation', {
      messageId: message.id,
      conversationId: data.conversationId,
      role: data.role,
      contentLength: data.content.length
    });
    return message;
  }
  /**
   * Get messages for a conversation
   */;
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    return this.messages.get(conversationId) || [];
  }
  /**
   * Get conversations for a user
   */;
  async getByUserId(userId: string): Promise<Conversation[]> {
    const userConversations: Conversation[] = [];
    for (const conversation of Array.from(this.conversations.values())) {
      if (conversation.userId === userId) {
        userConversations.push(conversation);
      }
    }
    // Sort by most recent first
    return userConversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),;
  }
  /**
   * Update conversation title
   */;
  async updateTitle(conversationId: string, title: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }
    conversation.title = title;
    conversation.updatedAt = new Date();
    logger.info('Conversation title updated', {
      conversationId,
      newTitle: title
    });
    return true;
  }
  /**
   * Delete a conversation and all its messages
   */;
  async delete(conversationId: string): Promise<boolean> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }
    this.conversations.delete(conversationId);
    this.messages.delete(conversationId);
    logger.info('Conversation deleted', {
      conversationId,
      userId: conversation.userId
    });
    return true;
  }
  /**
   * Get conversation statistics
   */;
  async getStats(): Promise<any> {
    const totalConversations = this.conversations.size;
    let totalMessages = 0;
    for (const messages of Array.from(this.messages.values())) {
      totalMessages += messages.length;
    }
    const averageMessagesPerConversation = totalConversations > 0;
      ? Math.round(totalMessages / totalConversations * 100) / 100
      : 0;
    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation
    }
  }
  // API compatibility methods (used by the API endpoints)
  /**
   * Get user conversations (alias for getByUserId)
   */;
  async getUserConversations(userId: string, limit: number = 50): Promise<Conversation[]> {
    const conversations = await this.getByUserId(userId);
    return conversations.slice(0, limit);
  }
  /**
   * Create conversation (alias for create)
   */;
  async createConversation(data: CreateConversationData): Promise<Conversation> {
    const conversation = await this.create(data);
    // Save to Redis for persistence
    await this.saveConversationToRedis(conversation);
    return conversation;
  }
  /**
   * Get conversation with messages
   */;
  async getConversationWithMessages(conversationId: string): Promise<any> {
    // Try to get from memory first
    let conversation = await this.getById(conversationId);
    let messages = await this.getMessages(conversationId);
    // If not in memory, try Redis
    if (!conversation) {
      conversation = await this.loadConversationFromRedis(conversationId);
      if (conversation) {
        this.conversations.set(conversationId, conversation);
      }
    }
    if (messages.length === 0) {
      messages = await this.loadMessagesFromRedis(conversationId);
      if (messages.length > 0) {
        this.messages.set(conversationId, messages);
      }
    }
    return {
      conversation,
      messages
    }
  }
  /**
   * Convert messages to chat format
   */
  convertTochatMessages(messages: ChatMessage[]): Array< {>;
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }),;
  }
  /**
   * Update conversation title (alias for updateTitle)
   */;
  async updateConversationTitle(conversationId,: string, titl,e: strin,g): Promise<boolean> {
    const, success = await this.updateTitle(conversationId, title,);
    if (success) {
      // Update in Redis
      const conversation = this.conversations.get(conversationId);
      if (conversation) {
        await this.saveConversationToRedis(conversation);
      }
    }
    return, succes,s;
  }
  /**
   * Archive conversation (soft delete)
   */;
  async archiveConversation(conversationId,: string,): Promise<boolean> {
    const, conversation = this.conversations.get(conversationId,);
    if (!conversation) {
      return false;
    }
    conversation,.isArchived = tru,e;
    conversation,.updatedAt = new Date(,);
    // Update in Redis
    await, thi,s.saveConversationToRedis(conversatio,n);
    logger,.info('Conversation archived', {
      conversationId,
      userId: conversation.userId
    }),;
    return, tru,e;
  }
}
// Export singleton instance
export const conversationService = new ConversationService();