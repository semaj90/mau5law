/**
 * Minimal AI Assistant Machine - XState v5
 * Stripped down working version for production startup
 * Full feature version to be restored after Phase 3 stabilization
 */

import { createMachine, assign, fromPromise } from 'xstate';

export interface AIAssistantContext {
  response?: string;
  ollamaClusterHealth?: { primary?: boolean };
  conversation?: Array<{ id: string; text?: string }>;
  model?: string;
  isProcessing?: boolean;
  error?: string | null;
  [key: string]: unknown;
}

export type AIAssistantEvent =
  | { type: 'SEND_MESSAGE'; message: string; useContext7?: boolean }
  | { type: 'SET_MODEL'; model: string }
  | { type: 'CHECK_SERVICE_HEALTH' }
  | { type: 'ANALYZE_WITH_CONTEXT7'; query: string }
  | { type: 'CLEAR_CONVERSATION' }
  | { type: 'done.invoke.checkHealth'; output: unknown };

export const aiAssistantMachine = createMachine(
  {
    id: 'aiAssistant',
    initial: 'idle',
    context: {
      response: '',
      conversation: [],
      model: 'gemma3-legal',
      isProcessing: false,
      error: null
    } as AIAssistantContext,
    states: {
      idle: {
        on: {
          SEND_MESSAGE: {
            target: 'processing',
            actions: assign({
              isProcessing: true,
              error: null
            })
          },
          SET_MODEL: {
            actions: assign({
              model: (_, event) => (event as { model: string }).model
            })
          },
          CHECK_SERVICE_HEALTH: {
            target: 'checkingHealth'
          },
          ANALYZE_WITH_CONTEXT7: {
            target: 'processing'
          },
          CLEAR_CONVERSATION: {
            actions: assign({
              conversation: [],
              response: ''
            })
          }
        }
      },
      processing: {
        invoke: {
          src: fromPromise(async () => {
            // Simulate processing
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true };
          }),
          onDone: {
            target: 'idle',
            actions: assign({
              isProcessing: false,
              response: 'Processing complete'
            })
          },
          onError: {
            target: 'idle',
            actions: assign({
              isProcessing: false,
              error: 'Processing failed'
            })
          }
        }
      },
      checkingHealth: {
        invoke: {
          src: fromPromise(async () => {
            return { healthy: true };
          }),
          onDone: {
            target: 'idle',
            actions: assign({
              ollamaClusterHealth: { primary: true }
            })
          },
          onError: {
            target: 'idle',
            actions: assign({
              ollamaClusterHealth: { primary: false }
            })
          }
        }
      }
    }
  }
);
