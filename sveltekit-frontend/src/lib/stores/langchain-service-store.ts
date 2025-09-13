/**
 * LangChain Service Logic Layer with Database Sync
 * Decoupled reactive store that handles complex LangChain/Ollama operations
 * with full database synchronization via REST API
 */

import { writable, derived, type Readable } from 'svelte/store';
import { langExtractService } from '$lib/services/langextract-ollama-service.js';
import { browser } from '$app/environment';

// Simple state interfaces for UI consumption
export interface LangChainState {
  isProcessing: boolean;
  isAvailable: boolean;
  error: string | null;
  models: string[];
}

export interface DocumentProcessingState {
  isProcessing: boolean;
  progress: number;
  result: ProcessedDocument | null;
  error: string | null;
  sessionId: string | null;
  documentId: string | null;
}

export interface ProcessedDocument {
  id: string;
  summary: string;
  keyTerms: string[];
  entities: any[];
  contractTerms: any[];
  processingTime: number;
  cacheHit: boolean;
  sessionId: string;
}

export interface ChatState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isTyping: boolean;
  error: string | null;
}

// Internal reactive stores
const langchainState = writable<LangChainState>({
  isProcessing: false,
  isAvailable: false,
  error: null,
  models: []
});

const documentProcessingState = writable<DocumentProcessingState>({
  isProcessing: false,
  progress: 0,
  result: null,
  error: null,
  sessionId: null,
  documentId: null
});

const chatState = writable<ChatState>({
  messages: [],
  isTyping: false,
  error: null
});

/**
 * Logic Layer: LangChain Service Operations
 * Handles complex async operations and callback management
 */
class LangChainServiceLogic {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    langchainState.update(state => ({ ...state, isProcessing: true }));

    try {
      // Simple availability check - no complex callbacks
      const isAvailable = await langExtractService.isOllamaAvailable();
      
      let models: string[] = [];
      if (isAvailable) {
        try {
          models = await langExtractService.listAvailableModels();
        } catch (error) {
          console.warn('Could not fetch models:', error);
          // Continue with empty models array
        }
      }

      langchainState.set({
        isProcessing: false,
        isAvailable,
        error: null,
        models
      });

      this.initialized = true;
    } catch (error) {
      langchainState.set({
        isProcessing: false,
        isAvailable: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
        models: []
      });
    }
  }

  async processDocument(
    text: string, 
    documentType: 'contract' | 'case' | 'statute' | 'brief' = 'case',
    practiceArea?: string,
    sessionId?: string
  ): Promise<void> {
    if (!browser) return; // Only run in browser

    documentProcessingState.update(state => ({ 
      ...state, 
      isProcessing: true, 
      progress: 0, 
      error: null 
    }));

    try {
      // Step 1: Send request to API endpoint
      documentProcessingState.update(state => ({ ...state, progress: 25 }));

      const response = await fetch('/api/legal-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          documentType,
          practiceArea,
          sessionId
        })
      });

      documentProcessingState.update(state => ({ ...state, progress: 75 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ProcessedDocument = await response.json();
      
      documentProcessingState.update(state => ({ ...state, progress: 100 }));

      // Update state with successful result
      documentProcessingState.set({
        isProcessing: false,
        progress: 100,
        result,
        error: null,
        sessionId: result.sessionId,
        documentId: result.id
      });

    } catch (error) {
      documentProcessingState.set({
        isProcessing: false,
        progress: 0,
        result: null,
        error: error instanceof Error ? error.message : 'Document processing failed',
        sessionId: null,
        documentId: null
      });
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    if (!browser) return;

    documentProcessingState.update(state => ({ 
      ...state, 
      isProcessing: true, 
      error: null 
    }));

    try {
      const response = await fetch(`/api/legal-processing?sessionId=${sessionId}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.statusText}`);
      }

      const sessionData = await response.json();
      
      // Update state with session data
      documentProcessingState.update(state => ({
        ...state,
        isProcessing: false,
        sessionId: sessionData.id,
        // Convert session documents to a summary format
        result: sessionData.documents.length > 0 ? {
          id: sessionData.documents[0].id,
          summary: `Session with ${sessionData.documents.length} documents`,
          keyTerms: sessionData.documents.flatMap((doc: any) => doc.keyTerms || []),
          entities: [],
          contractTerms: [],
          processingTime: 0,
          cacheHit: true,
          sessionId: sessionData.id
        } : null
      }));

    } catch (error) {
      documentProcessingState.update(state => ({
        ...state,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to load session'
      }));
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    if (!browser) return;

    try {
      const response = await fetch(`/api/legal-processing/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete document: ${response.statusText}`);
      }

      // Clear current result if it was the deleted document
      documentProcessingState.update(state => {
        if (state.result?.id === documentId) {
          return {
            ...state,
            result: null,
            documentId: null
          };
        }
        return state;
      });

    } catch (error) {
      documentProcessingState.update(state => ({
        ...state,
        error: error instanceof Error ? error.message : 'Failed to delete document'
      }));
    }
  }

  async sendChatMessage(message: string): Promise<void> {
    chatState.update(state => ({ 
      ...state, 
      messages: [...state.messages, { role: 'user', content: message }],
      isTyping: true,
      error: null 
    }));

    try {
      // Simple request - no complex callback managers
      const response = await langExtractService.generateLegalSummary(message, 'case');
      
      chatState.update(state => ({
        ...state,
        messages: [...state.messages, { role: 'assistant', content: response.summary }],
        isTyping: false
      }));

    } catch (error) {
      chatState.update(state => ({
        ...state,
        isTyping: false,
        error: error instanceof Error ? error.message : 'Chat message failed'
      }));
    }
  }

  clearDocumentProcessing(): void {
    documentProcessingState.set({
      isProcessing: false,
      progress: 0,
      result: null,
      error: null
    });
  }

  clearChat(): void {
    chatState.set({
      messages: [],
      isTyping: false,
      error: null
    });
  }
}

// Singleton service instance
export const langchainServiceLogic = new LangChainServiceLogic();

// Read-only stores for UI consumption
export const langchainService: Readable<LangChainState> = {
  subscribe: langchainState.subscribe
};

export const documentProcessing: Readable<DocumentProcessingState> = {
  subscribe: documentProcessingState.subscribe
};

export const chatService: Readable<ChatState> = {
  subscribe: chatState.subscribe
};

// Derived computed states
export const isLangChainReady = derived(
  langchainService, 
  $service => $service.isAvailable && !$service.isProcessing && !$service.error
);

export const availableModels = derived(
  langchainService,
  $service => $service.models
);

// Auto-initialize on import
langchainServiceLogic.initialize();