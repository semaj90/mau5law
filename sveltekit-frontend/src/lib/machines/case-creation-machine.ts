// Case Creation State Machine - XState v5 compatible
// Orchestrates legal case creation workflow with validation and API calls

import { createMachine, assign, fromPromise } from 'xstate';

export interface CaseCreationContext {
  formData: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'pending' | 'closed' | 'archived';
    location?: string;
    jurisdiction?: string;
  };
  validationErrors: Record<string, string[]>;
  createdCase: any;
  error: string | null;
  isAutoSaving: boolean;
  retryCount: number;
}

export const caseCreationMachine = createMachine({
  id: 'caseCreation',
  initial: 'idle',
  types: {
    context: {} as CaseCreationContext,
    events: {} as 
      | { type: 'START_CREATION' }
      | { type: 'UPDATE_FORM'; data: any }
      | { type: 'VALIDATE_FORM'; data: any }
      | { type: 'SUBMIT_CASE'; data: any }
      | { type: 'RETRY' }
      | { type: 'RESET' }
  },
  context: {
    formData: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'open'
    },
    validationErrors: {},
    createdCase: null,
    error: null,
    isAutoSaving: false,
    retryCount: 0
  },
  states: {
    idle: {
      on: {
        START_CREATION: 'editing',
        UPDATE_FORM: {
          target: 'editing',
          actions: assign({
            formData: ({ event }) => ({ ...event.data })
          })
        }
      }
    },
    editing: {
      entry: assign({ error: null }),
      on: {
        UPDATE_FORM: {
          actions: assign({
            formData: ({ context, event }) => ({
              ...context.formData,
              ...event.data
            }),
            isAutoSaving: true
          })
        },
        VALIDATE_FORM: {
          target: 'validating',
          actions: assign({
            formData: ({ context, event }) => ({
              ...context.formData,
              ...event.data
            })
          })
        },
        SUBMIT_CASE: 'submitting'
      },
      after: {
        2000: {
          target: 'editing',
          actions: assign({ isAutoSaving: false })
        }
      }
    },
    validating: {
      invoke: {
        id: 'validateCaseData',
        src: 'validateCaseData',
        input: ({ context }) => context,
        onDone: {
          target: 'editing',
          actions: assign({
            validationErrors: {},
            error: null
          })
        },
        onError: {
          target: 'editing',
          actions: assign({
            validationErrors: ({ event }) => (event as any).error?.validationErrors || {},
            error: 'Validation failed'
          })
        }
      }
    },
    submitting: {
      entry: assign({
        retryCount: ({ context }) => context.retryCount + 1
      }),
      invoke: {
        id: 'submitCase',
        src: fromPromise(async ({ input }: { input: CaseCreationContext }) => {
          const response = await fetch('/api/cases', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(input.formData)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          return response.json();
        }),
        input: ({ context }) => context,
        onDone: {
          target: 'completed',
          actions: assign({
            createdCase: ({ event }) => event.output,
            error: null,
            retryCount: 0
          })
        },
        onError: [
          {
            guard: ({ context }) => context.retryCount < 3,
            target: 'retrying',
            actions: assign({
              error: ({ event }) => (event as any).error?.message || 'Submission failed'
            })
          },
          {
            target: 'failed',
            actions: assign({
              error: ({ event }) => (event as any).error?.message || 'Submission failed after retries'
            })
          }
        ]
      }
    },
    retrying: {
      after: {
        1000: 'submitting'
      },
      on: {
        RETRY: 'submitting'
      }
    },
    completed: {
      type: 'final',
      entry: assign({
        isAutoSaving: false
      }),
      on: {
        RESET: {
          target: 'idle',
          actions: assign({
            formData: {
              title: '',
              description: '',
              priority: 'medium',
              status: 'open'
            },
            validationErrors: {},
            createdCase: null,
            error: null,
            isAutoSaving: false,
            retryCount: 0
          })
        }
      }
    },
    failed: {
      on: {
        RETRY: 'submitting',
        RESET: {
          target: 'idle',
          actions: assign({
            error: null,
            retryCount: 0
          })
        }
      }
    }
  }
}, {
  actors: {
    validateCaseData: fromPromise(async ({ input }: { input: CaseCreationContext }) => {
      const errors: Record<string, string[]> = {};
      
      if (!input.formData.title?.trim()) {
        errors.title = ['Title is required'];
      }
      
      if (!input.formData.description?.trim()) {
        errors.description = ['Description is required'];
      }
      
      if (Object.keys(errors).length > 0) {
        throw { validationErrors: errors };
      }
      
      return { valid: true };
    })
  }
});

export default caseCreationMachine;