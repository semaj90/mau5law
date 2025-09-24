/**
 * YoRHa AI Chat Store - Persistent Chat Management (Svelte 5)
 * Handles conversation history, user preferences, and Enhanced RAG integration
 */
import { browser } from "$app/environment";
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'user' | 'assistant' | 'system' | 'error' | 'command';
  metadata?: {
    confidence?: number;
    sources?: unknown[];
    processing_time?: number;
    model?: string;
    tokens_used?: number;
  };
}
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
  tags: string[];
  case_id?: string;
  evidence_id?: string;
}
export interface UserPreferences {
  theme: 'yorha-dark' | 'yorha-light';
  auto_save: boolean;
  max_history: number;
  enable_rag: boolean;
  default_model: string;
  notification_sound: boolean;
  export_format: 'json' | 'markdown' | 'txt';
}
export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  preferences: UserPreferences;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  ragServiceUrl: string;
  lastError: string | null;
}
// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'yorha-dark',
  auto_save: true
  max_history: 100,
  enable_rag: true
  default_model: 'enhanced-rag',
  notification_sound: false
  export_format: 'markdown'
};
// Initialize chat state
const initialState: ChatState = {
  currentSession: null
  sessions: [],
  preferences: defaultPreferences
  isLoading: false
  connectionStatus: 'disconnected',
  ragServiceUrl: 'http://localhost:8093',
  lastError: null
};
// Storage keys
const STORAGE_KEYS = {
  SESSIONS: 'yorha-ai-chat-sessions',
  PREFERENCES: 'yorha-ai-chat-preferences',
  CURRENT_SESSION: 'yorha-ai-current-session'
};
// Create reactive chat store using Svelte 5 runes
const createChatStore = () => {
  // Initialize with initial state using $state
  let chatState = $state<ChatState>(initialState);
  return {
    // Getter for reactive access
    get state() {
      return chatState;
    },
    // Initialize with storage data
    init: () => {
      if (browser) {
        loadFromStorage();
        checkRAGConnection();
      }
    },
    // Session Management
    createNewSession: (title?: string): ChatSession => {
      const session: ChatSession = {
        id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title || `YoRHa Session ${new Date().toLocaleString()}`,
        messages: [],
        created_at: new Date(),
        updated_at: new Date(),
        tags: ['yorha', 'legal-ai']
      };
      chatState.currentSession = session;
      chatState.sessions.unshift(session);
      // Limit sessions based on preferences
      if (chatState.sessions.length > chatState.preferences.max_history) {
        chatState.sessions = chatState.sessions.slice(0, chatState.preferences.max_history);
      }
      saveToStorage();
      return session;
    },
    switchToSession: (sessionId: string): void => {
      const session = chatState.sessions.find(s => s.id === sessionId);
      if (session) {
        chatState.currentSession = session;
        saveToStorage();
      }
    },
    deleteSession: (sessionId: string): void => {
      chatState.sessions = chatState.sessions.filter(s => s.id !== sessionId);
      // If current session was deleted, switch to most recent
      if (chatState.currentSession?.id === sessionId) {
        chatState.currentSession = chatState.sessions[0] || null;
      }
      saveToStorage();
    },
    // Message Management
    addMessage: (message: Omit<ChatMessage, 'id'>): ChatMessage => {
      const fullMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: message.timestamp || new Date()
      };
      if (!chatState.currentSession) {
        const createAction = aiChatStore.createNewSession();
        chatState.currentSession = createAction;
      }
      chatState.currentSession.messages.push(fullMessage);
      chatState.currentSession.updated_at = new Date();
      // Update session in sessions array
      const sessionIndex = chatState.sessions.findIndex(s => s.id === chatState.currentSession!.id);
      if (sessionIndex >= 0) {
        chatState.sessions[sessionIndex] = chatState.currentSession;
      }
      if (chatState.preferences.auto_save) {
        saveToStorage();
      }
      return fullMessage;
    },
    updateMessage: (messageId: string, updates: Partial<ChatMessage>): void => {
      if (chatState.currentSession) {
        const messageIndex = chatState.currentSession.messages.findIndex(m => m.id === messageId);
        if (messageIndex >= 0) {
          chatState.currentSession.messages[messageIndex] = {
            ...chatState.currentSession.messages[messageIndex],
            ...updates
          };
          chatState.currentSession.updated_at = new Date();
        }
      }
      saveToStorage();
    },
    deleteMessage: (messageId: string): void => {
      if (chatState.currentSession) {
        chatState.currentSession.messages = chatState.currentSession.messages.filter(m => m.id !== messageId);
        chatState.currentSession.updated_at = new Date();
      }
      saveToStorage();
    },
    clearCurrentSession: (): void => {
      if (chatState.currentSession) {
        chatState.currentSession.messages = [];
        chatState.currentSession.updated_at = new Date();
      }
      saveToStorage();
    },
    // Enhanced RAG Integration
    sendToRAG: async (message: string, context?: unknown): Promise<any> => {
      chatState.isLoading = true;
      chatState.lastError = null;
      try {
        const response = await fetch(`${RAG_SERVICE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message,
            context: context || 'legal-ai',
            user_id: 'yorha-user',
            session_id: chatState.currentSession?.id || 'default',
            include_vector_search: true
            max_tokens: 1000,
            temperature: 0.7
          })
        });
        if (!response.ok) {
          throw new Error(`RAG service error: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        chatState.connectionStatus = 'connected';
        chatState.isLoading = false;
        return result;
      } catch (error: any) {
        console.error('RAG service error:', error);
        chatState.connectionStatus = 'disconnected';
        chatState.isLoading = false;
        chatState.lastError = error instanceof Error ? error.message: 'Unknown error';
        throw error;
      }
    },
    checkRAGConnection: async (): Promise<boolean> => {
      chatState.connectionStatus = 'connecting';
      try {
        let response: Response;
        try {
          response = await fetch(`${RAG_SERVICE_URL}/health`, {
            method: 'GET',
            timeout: 5000
          } as any);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (error: any) {
          console.error('Fetch failed:', error);
          throw error;
        }
        const isHealthy = response.ok;
        chatState.connectionStatus = isHealthy ? 'connected' : 'disconnected';
        return isHealthy;
      } catch (error: any) {
        chatState.connectionStatus = 'disconnected';
        chatState.lastError = 'RAG service unavailable';
        return false;
      }
    },
    // Utility methods
    exportSession: (sessionId: string, format: 'json' | 'markdown' | 'txt' = 'markdown'): string => {
      const session = chatState.sessions.find(s => s.id === sessionId);
      if (!session) return '';
      switch (format) {
        case 'json':
          return JSON.stringify(session, null, 2);
        case 'markdown':
          let md = `# ${session.title}\n\n`;
          md += `**Created:** ${session.created_at.toLocaleString()}\n`;
          md += `**Updated:** ${session.updated_at.toLocaleString()}\n`;
          md += `**Tags:** ${session.tags.join(', ')}\n\n`;
          session.messages.forEach(msg => {
            md += `## ${msg.role === 'user' ? 'User' : 'YoRHa AI'} (${msg.timestamp.toLocaleTimeString()})\n\n`;
            md += `${msg.content}\n\n`;
          });
          return md;
        case 'txt':
          let txt = `${session.title}\n${'='.repeat(session.title.length)}\n\n`;
          txt += `Created: ${session.created_at.toLocaleString()}\n`;
          txt += `Updated: ${session.updated_at.toLocaleString()}\n\n`;
          session.messages.forEach(msg => {
            txt += `[${msg.timestamp.toLocaleTimeString()}] ${msg.role.toUpperCase()}: ${msg.content}\n\n`;
          });
          return txt;
        default:
          return '';
      }
    },
    loadChatHistory: (): ChatMessage[] => {
      return chatState.currentSession?.messages || [];
    },
    clearHistory: (): void => {
      if (chatState.currentSession) {
        chatState.currentSession.messages = [];
        chatState.currentSession.updated_at = new Date();
      }
      saveToStorage();
    },
    updatePreferences: (updates: Partial<UserPreferences>): void => {
      chatState.preferences = { ...chatState.preferences, ...updates };
      saveToStorage();
    }
  };
  // Constants
  const RAG_SERVICE_URL = 'http://localhost:8093'
  // Storage Management
  function saveToStorage(): void {
    if (!browser) return;
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(chatState.sessions.map(s => ({
          ...s,
          created_at: s.created_at.toISOString(),
          updated_at: s.updated_at.toISOString(),
          messages: s.messages.map(m => ({
            ...m,
            timestamp: m.timestamp.toISOString()
          }))
        }))));
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(chatState.preferences));
      if (chatState.currentSession) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, chatState.currentSession.id);
      }
    } catch (error: any) {
      console.error('Failed to save chat data:', error);
    }
  }
  function loadFromStorage(): void {
    if (!browser) return;
    try {
      // Load preferences
      const savedPreferences = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (savedPreferences) {
        const preferences = JSON.parse(savedPreferences);
        chatState.preferences = { ...defaultPreferences, ...preferences };
      }
      // Load sessions
      const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions).map((s: any) => ({
          ...s,
          created_at: new Date(s.created_at),
          updated_at: new Date(s.updated_at),
          messages: s.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
        const currentSession = sessions.find((s: ChatSession) => s.id === currentSessionId) || sessions[0] || null;
        chatState.sessions = sessions;
        chatState.currentSession = currentSession;
      }
    } catch (error: any) {
      console.error('Failed to load chat data:', error);
    }
  }
  function checkRAGConnection(): Promise<boolean> {
    return aiChatStore.checkRAGConnection();
  }
};
// Export singleton instance
export const aiChatStore = createChatStore();
// Helper functions for accessing reactive state
export const getCurrentSession = () => aiChatStore.state.currentSession;
export const getAllSessions = () => aiChatStore.state.sessions;
export const getUserPreferences = () => aiChatStore.state.preferences;
export const getIsLoading = () => aiChatStore.state.isLoading;
export const getConnectionStatus = () => aiChatStore.state.connectionStatus;
// Export convenience functions
export const chatActions = {
  createNewSession: aiChatStore.createNewSession,
  switchToSession: aiChatStore.switchToSession,
  deleteSession: aiChatStore.deleteSession,
  addMessage: aiChatStore.addMessage,
  updateMessage: aiChatStore.updateMessage,
  deleteMessage: aiChatStore.deleteMessage,
  clearCurrentSession: aiChatStore.clearCurrentSession,
  sendToRAG: aiChatStore.sendToRAG,
  checkRAGConnection: aiChatStore.checkRAGConnection,
  exportSession: aiChatStore.exportSession,
  loadChatHistory: aiChatStore.loadChatHistory,
  clearHistory: aiChatStore.clearHistory,
  updatePreferences: aiChatStore.updatePreferences,
  init: aiChatStore.init
};