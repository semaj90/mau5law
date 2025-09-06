/**
 * Chat Store - Central state management for AI chat system
 * 
 * Features:
 * - Real-time message state management
 * - WebSocket connection state
 * - Typing indicators and user presence
 * - Message persistence and history
 * - Analysis results and RAG context
 * - Session management
 */

import { writable, derived, readable, get } from "svelte/store";
import { browser } from "$app/environment";
import type { 
  ChatMessage, 
  ChatSession, 
  MessageAnalysis, 
  RAGContext, 
  Recommendation,
  StreamingResponse,
  UserActivity,
  AttentionData,
  ConnectionStatus 
} from "$lib/types";

// Core chat state
export const chatMessages = writable<ChatMessage[]>([]);
export const currentSession = writable<ChatSession | null>(null);
export const activeSessions = writable<ChatSession[]>([]);
;
// Connection state
export const isConnected = writable(false);
export const connectionStatus = writable<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
export const lastConnectionTime = writable<Date | null>(null);
;
// Real-time communication
export const isTyping = writable(false);
export const typingUsers = writable<Set<string>>(new Set());
export const streamingResponse = writable('');
export const streamingMessageId = writable<string | null>(null);
;
// Analysis and AI state
export const currentAnalysis = writable<MessageAnalysis | null>(null);
export const ragContext = writable<RAGContext | null>(null);
export const recommendations = writable<Recommendation[]>([]);
export const didYouMean = writable<string[]>([]);
;
// Processing state
export const isProcessing = writable(false);
export const processingStage = writable<'analyzing' | 'embedding' | 'searching' | 'generating' | 'complete'>('complete');
export const processingMetrics = writable({
  responseTime: 0,
  tokenCount: 0,
  confidenceScore: 0,
  somCluster: -1,
  embeddingTime: 0,
  searchTime: 0,
  generationTime: 0
});

// Error handling
export const lastError = writable<string | null>(null);
export const errorHistory = writable<Array<{ timestamp: Date; error: string; context?: unknown }>>([]);
;
// User interaction
export const userAttention = writable<AttentionData>({
  messageId: '',
  attentionWeights: [],
  focusPoints: []
});

export const userActivities = writable<UserActivity[]>([]);
;
// Chat configuration
export const chatConfig = writable({
  maxMessages: 100,
  enableAttentionTracking: true,
  enableWebGPU: true,
  enableAnalysisPanel: true,
  autoScroll: true,
  showTypingIndicators: true,
  enableRecommendations: true,
  streamingEnabled: true
});

// Derived stores for computed values
export const messageCount = derived(chatMessages, ($messages) => $messages.length);

export const lastUserMessage = derived(chatMessages, ($messages) => 
  $messages.filter(m => m.role === 'user').slice(-1)[0] || null
);

export const lastAIResponse = derived(chatMessages, ($messages) => 
  $messages.filter(m => m.role === 'assistant').slice(-1)[0] || null
);

export const conversationSummary = derived(chatMessages, ($messages) => {
  const userMessages = $messages.filter(m => m.role === 'user').length;
  const aiMessages = $messages.filter(m => m.role === 'assistant').length;
  const totalTokens = $messages.reduce((sum, m) => sum + (m.token_count || 0), 0);
  
  return {
    totalMessages: $messages.length,
    userMessages,
    aiMessages,
    totalTokens,
    avgTokensPerMessage: $messages.length > 0 ? Math.round(totalTokens / $messages.length) : 0
  };
});

export const isSessionActive = derived(currentSession, ($session) => 
  $session?.is_active || false
);

export const sessionMetrics = derived([currentSession, chatMessages], ([$session, $messages]) => {
  if (!$session) return null;
  
  const sessionMessages = $messages.filter(m => m.session_id === $session.id);
  return {
    messageCount: sessionMessages.length,
    tokensUsed: sessionMessages.reduce((sum, m) => sum + (m.token_count || 0), 0),
    duration: Date.now() - new Date($session.start_time).getTime(),
    lastActivity: $session.last_activity
  };
});

export const hasRecommendations = derived(recommendations, ($recs) => $recs.length > 0);
;
export const hasAnalysis = derived(currentAnalysis, ($analysis) => $analysis !== null);
;
export const attentionScore = derived(userAttention, ($attention) => {
  const timeSinceActivity = Date.now() - $attention.lastActivity;
  const maxInactiveTime = 60000; // 1 minute
  
  if (!$attention.focused) return 0;
  if (timeSinceActivity > maxInactiveTime) return 0.1;
  
  return Math.max(0.1, 1 - (timeSinceActivity / maxInactiveTime));
});

// Store actions
export const chatActions = {
  // Session management
  createSession: async (userId: string, caseId?: string): Promise<ChatSession> => {
    try {
      const response = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, case_id: caseId })
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const session: ChatSession = await response.json();
      currentSession.set(session);
      
      // Update active sessions
      activeSessions.update(sessions => {
        const filtered = sessions.filter(s => s.id !== session.id);
        return [...filtered, session];
      });

      return session;
    } catch (error: any) {
      chatActions.addError('Failed to create chat session', { error });
      throw error;
    }
  },

  loadSession: async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/chat/session/${sessionId}`);
      if (!response.ok) {
        throw new Error('Session not found');
      }

      const session: ChatSession = await response.json();
      currentSession.set(session);

      // Load chat history
      await chatActions.loadHistory(sessionId);
    } catch (error: any) {
      chatActions.addError('Failed to load session', { sessionId, error });
      throw error;
    }
  },

  // Message management
  addMessage: (message: ChatMessage): void => {
    chatMessages.update(messages => {
      const filtered = messages.filter(m => m.id !== message.id);
      const updated = [...filtered, message].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Limit message history
      const config = get(chatConfig);
      if (updated.length > config.maxMessages) {
        return updated.slice(-config.maxMessages);
      }

      return updated;
    });
  },

  updateMessage: (messageId: string, updates: Partial<ChatMessage>): void => {
    chatMessages.update(messages => 
      messages.map(m => m.id === messageId ? { ...m, ...updates } : m)
    );
  },

  loadHistory: async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load history');
      }

      const history = await response.json();
      chatMessages.set(history.messages || []);
    } catch (error: any) {
      chatActions.addError('Failed to load chat history', { sessionId, error });
    }
  },

  clearMessages: (): void => {
    chatMessages.set([]);
    currentAnalysis.set(null);
    ragContext.set(null);
    recommendations.set([]);
    didYouMean.set([]);
  },

  // Streaming management
  startStreaming: (messageId: string): void => {
    streamingMessageId.set(messageId);
    streamingResponse.set('');
    isProcessing.set(true);
  },

  appendStreamingToken: (token: string): void => {
    streamingResponse.update(current => current + token);
  },

  completeStreaming: (): void => {
    const response = get(streamingResponse);
    const messageId = get(streamingMessageId);

    if (messageId && response) {
      // Create final AI message
      const session = get(currentSession);
      const aiMessage: ChatMessage = {
        id: messageId,
        session_id: session?.id || '',
        sessionId: session?.id || '',
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        token_count: Math.ceil(response.length / 4) // Rough estimate
      };

      chatActions.addMessage(aiMessage);
    }

    streamingResponse.set('');
    streamingMessageId.set(null);
    isProcessing.set(false);
    processingStage.set('complete');
  },

  // Analysis and context
  setAnalysis: (analysis: MessageAnalysis): void => {
    currentAnalysis.set(analysis);
    
    // Update processing metrics
    processingMetrics.update(metrics => ({
      ...metrics,
      confidenceScore: analysis.confidence,
      somCluster: typeof analysis.som_cluster === 'string' ? parseInt(analysis.som_cluster) : -1
    }));
  },

  setRAGContext: (context: RAGContext): void => {
    ragContext.set(context);
    recommendations.set(context.recommendations || []);
    didYouMean.set(Array.isArray(context.did_you_mean) ? context.did_you_mean : []);
  },

  // User interaction tracking
  trackActivity: (userId: string, sessionId: string, isTyping: boolean = false): void => {
    const activity: UserActivity = {
      userId,
      sessionId,
      isTyping,
      lastSeen: Date.now(),
      status: 'online'
    };

    userActivities.update(activities => {
      const updated = [...activities, activity];
      // Keep only last 100 activities
      return updated.slice(-100);
    });

    // Update attention data
    userAttention.update(attention => ({
      ...attention,
      lastActivity: Date.now(),
      interactionCount: attention.interactionCount + 1
    }));
  },

  updateAttention: (updates: Partial<AttentionData>): void => {
    userAttention.update(current => ({
      ...current,
      ...updates,
      lastActivity: Date.now()
    }));
  },

  // Error handling
  addError: (message: string, context?: unknown): void => {
    const error = {
      timestamp: new Date(),
      error: message,
      context
    };

    lastError.set(message);
    errorHistory.update(history => [...history, error].slice(-50)); // Keep last 50 errors
  },

  clearError: (): void => {
    lastError.set(null);
  },

  // Connection management
  setConnectionStatus: (status: ConnectionStatus): void => {
    connectionStatus.set(status);
    isConnected.set(status === 'connected');
    
    if (status === 'connected') {
      lastConnectionTime.set(new Date());
    }
  },

  // Typing indicators
  setTyping: (typing: boolean): void => {
    isTyping.set(typing);
  },

  addTypingUser: (userId: string): void => {
    typingUsers.update(users => new Set([...users, userId]));
  },

  removeTypingUser: (userId: string): void => {
    typingUsers.update(users => {
      const newUsers = new Set(users);
      newUsers.delete(userId);
      return newUsers;
    });
  },

  // Configuration
  updateConfig: (updates: Partial<{
    maxMessages: number;
    autoSave: boolean;
    streamingEnabled: boolean;
    ragEnabled: boolean;
  }>): void => {
    chatConfig.update(current => ({ ...current, ...updates }));
    
    // Save to localStorage if available
    if (browser) {
      localStorage.setItem('chat-config', JSON.stringify(get(chatConfig)));
    }
  },

  // Utility
  exportSession: (): string => {
    const session = get(currentSession);
    const messages = get(chatMessages);
    const analysis = get(currentAnalysis);
    const context = get(ragContext);

    return JSON.stringify({
      session,
      messages,
      analysis,
      context,
      exportedAt: new Date().toISOString()
    }, null, 2);
  },

  reset: (): void => {
    chatMessages.set([]);
    currentSession.set(null);
    currentAnalysis.set(null);
    ragContext.set(null);
    recommendations.set([]);
    didYouMean.set([]);
    streamingResponse.set('');
    streamingMessageId.set(null);
    isProcessing.set(false);
    processingStage.set('complete');
    lastError.set(null);
    userActivities.set([]);
    typingUsers.set(new Set());
  }
};

// Initialize from localStorage if available
if (browser) {
  const savedConfig = localStorage.getItem('chat-config');
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig);
      chatConfig.set(config);
    } catch (error: any) {
      console.warn('Failed to load saved chat config:', error);
    }
  }
}

// Export store collections for convenience
export const chatStores = {
  // Core state
  messages: chatMessages,
  session: currentSession,
  sessions: activeSessions,
  
  // Connection
  connected: isConnected,
  status: connectionStatus,
  
  // Real-time
  typing: isTyping,
  typingUsers,
  streaming: streamingResponse,
  
  // Analysis
  analysis: currentAnalysis,
  context: ragContext,
  recommendations,
  
  // User state
  attention: userAttention,
  activities: userActivities,
  
  // Configuration
  config: chatConfig,
  
  // Derived
  derived: {
    messageCount,
    lastUserMessage,
    lastAIResponse,
    conversationSummary,
    sessionMetrics,
    attentionScore,
    hasRecommendations,
    hasAnalysis,
    isSessionActive
  }
};

export default chatStores;