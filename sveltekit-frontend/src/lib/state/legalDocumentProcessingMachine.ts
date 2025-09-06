
/**
 * Legal Document Processing State Machine
 * XState workflow for comprehensive legal document analysis pipeline
 */

import { createMachine, assign, type ActorRefFrom } from 'xstate';
// Orphaned content: import type { LegalDocument, LegalEntities, LegalRAGOptions
import type { EnhancedContext7Service } from '$lib/services/enhancedContext7Service';
// Orphaned content: import type { QdrantService

// Context interface for the state machine
export interface LegalDocumentContext {
  // Document data
  documentId?: string;
  caseId: string;
  content: string;
  title: string;
  caseType: 'contract' | 'litigation' | 'compliance' | 'regulatory';
  jurisdiction: 'federal' | 'state' | 'local' | 'international';
  
  // Processing results
  summary?: string;
  entities?: LegalEntities;
  tags?: string[];
  embedding?: number[];
  riskScore?: number;
  confidenceScore?: number;
  
  // AI Analysis
  aiAnalysis?: {
    keyFindings: string[];
    complianceStatus: any;
    recommendedActions: string[];
    legalPrecedents: any[];
  };
  
  // Context7 MCP results
  mcpAnalysis?: unknown;
  stackRecommendations?: string[];
  
  // Error handling
  errors: string[];
  retryCount: number;
  maxRetries: number;
  
  // Performance tracking
  startTime?: number;
  processingDuration?: number;
  
  // Options
  options: {
    extractEntities: boolean;
    generateSummary: boolean;
    assessRisk: boolean;
    generateEmbedding: boolean;
    storeInQdrant: boolean;
    useContext7: boolean;
    useSemanticSearch: boolean;
  };
}

// Events for the state machine
export type LegalDocumentEvent =
  | { type: 'START_PROCESSING'; document: Partial<LegalDocument>; options?: Partial<LegalDocumentContext['options']> }
  | { type: 'CONTENT_EXTRACTED' }
  | { type: 'ANALYSIS_COMPLETE'; analysis: any }
  | { type: 'ENTITIES_EXTRACTED'; entities: LegalEntities }
  | { type: 'SUMMARY_GENERATED'; summary: string }
  | { type: 'EMBEDDING_GENERATED'; embedding: number[] }
  | { type: 'RISK_ASSESSED'; riskScore: number; confidenceScore: number }
  | { type: 'MCP_ANALYSIS_COMPLETE'; mcpAnalysis: any; recommendations: string[] }
  | { type: 'STORAGE_COMPLETE'; documentId: string }
  | { type: 'RETRY' }
  | { type: 'CANCEL' }
  | { type: 'ERROR'; error: string };

// Services for async operations
const services = {
  extractContent: async (context: LegalDocumentContext) => {
    // Simulate content extraction (OCR, PDF parsing, etc.)
    await new Promise((resolve: any) => setTimeout(resolve, 1000));
    return { content: context.content, title: context.title };
  },

  analyzeWithAI: async (context: LegalDocumentContext) => {
    // This would integrate with your Ollama service
    const mockAnalysis = {
      keyFindings: ['Contract terms identified', 'Liability clauses present'],
      complianceStatus: { gdpr: 'Under Review', contractLaw: 'Requires Review' },
      recommendedActions: ['Legal review recommended', 'Compliance verification needed'],
      legalPrecedents: []
    };
    
    await new Promise((resolve: any) => setTimeout(resolve, 2000));
    return mockAnalysis;
  },

  extractEntities: async (context: LegalDocumentContext) => {
    // This would integrate with your Context7 MCP service
    const mockEntities: LegalEntities = {
      parties: ['John Smith', 'ABC Corporation'],
      dates: ['2023-01-15', '2023-12-31'],
      monetary: ['$50,000', '$10,000'],
      clauses: ['Section 3.1', 'Clause 7.2'],
      jurisdictions: [context.jurisdiction],
      caseTypes: [context.caseType]
    };
    
    await new Promise((resolve: any) => setTimeout(resolve, 1500));
    return mockEntities;
  },

  generateSummary: async (context: LegalDocumentContext) => {
    // This would integrate with your Ollama service
    const mockSummary = `Legal document summary for ${context.caseType} case in ${context.jurisdiction} jurisdiction. Contains ${context.entities?.parties.length || 0} parties and ${context.entities?.clauses.length || 0} legal clauses.`;
    
    await new Promise((resolve: any) => setTimeout(resolve, 1000));
    return mockSummary;
  },

  generateEmbedding: async (context: LegalDocumentContext) => {
    // This would integrate with your embedding service (nomic-embed-text)
    const mockEmbedding = new Array(384).fill(0).map(() => Math.random());
    
    await new Promise((resolve: any) => setTimeout(resolve, 500));
    return mockEmbedding;
  },

  assessRisk: async (context: LegalDocumentContext) => {
    // This would integrate with your AI risk assessment
    const hasLiability = context.content.toLowerCase().includes('liability');
    const riskScore = hasLiability ? 85 : 35;
    const confidenceScore = 0.87;
    
    await new Promise((resolve: any) => setTimeout(resolve, 800));
    return { riskScore, confidenceScore };
  },

  analyzWithMCP: async (context: LegalDocumentContext) => {
    // This would integrate with your Context7 MCP service
    const mockMCPAnalysis = {
      stackAnalysis: 'SvelteKit + Drizzle + pgvector integration recommended',
      legalSpecificRecommendations: [
        'Use enhanced evidence schema for storage',
        'Implement legal-specific reranking',
        'Enable hybrid vector search'
      ],
      performanceOptimizations: [
        'Cache frequently accessed legal precedents',
        'Use parallel processing for entity extraction'
      ]
    };
    
    await new Promise((resolve: any) => setTimeout(resolve, 1200));
    return {
      mcpAnalysis: mockMCPAnalysis,
      recommendations: mockMCPAnalysis.legalSpecificRecommendations
    };
  },

  storeDocument: async (context: LegalDocumentContext) => {
    // This would integrate with your database and Qdrant services
    const documentId = `legal_doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await new Promise((resolve: any) => setTimeout(resolve, 800));
    return { documentId };
  }
};

// Legal Document Processing State Machine
export const legalDocumentProcessingMachine = createMachine({
  id: 'legalDocumentProcessing',
  types: {} as {
    context: LegalDocumentContext;
    events: LegalDocumentEvent;
  },
  context: {
    caseId: '',
    content: '',
    title: '',
    caseType: 'contract',
    jurisdiction: 'federal',
    errors: [],
    retryCount: 0,
    maxRetries: 3,
    options: {
      extractEntities: true,
      generateSummary: true,
      assessRisk: true,
      generateEmbedding: true,
      storeInQdrant: true,
      useContext7: true,
      useSemanticSearch: false
    }
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        START_PROCESSING: {
          target: 'initializing',
          actions: assign({
            caseId: ({ event }) => event.document.caseId || '',
            content: ({ event }) => event.document.content || '',
            title: ({ event }) => event.document.title || '',
            caseType: ({ event }) => event.document.caseType || 'contract',
            jurisdiction: ({ event }) => event.document.jurisdiction || 'federal',
            options: ({ context, event }) => ({
              ...context.options,
              ...event.options
            }),
            startTime: () => Date.now(),
            errors: () => [],
            retryCount: () => 0
          })
        }
      }
    },

    initializing: {
      always: [
        {
          target: 'extractingContent',
          guard: ({ context }) => !!context.content && context.content.length > 0
        },
        {
          target: 'error',
          actions: assign({
            errors: ({ context }) => [...context.errors, 'No content provided for processing']
          })
        }
      ]
    },

    extractingContent: {
      invoke: {
        id: 'extractContent',
        src: services.extractContent,
        onDone: {
          target: 'analyzing',
          actions: assign({
            content: ({ event }) => event.output.content,
            title: ({ event }) => event.output.title
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            errors: ({ context, event }) => [...context.errors, `Content extraction failed: ${event.error}`]
          })
        }
      }
    },

    analyzing: {
      type: 'parallel',
      states: {
        aiAnalysis: {
          initial: 'processing',
          states: {
            processing: {
              invoke: {
                id: 'analyzeWithAI',
                src: services.analyzeWithAI,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    aiAnalysis: ({ event }) => event.output
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `AI analysis failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' }
          }
        },

        entityExtraction: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                { target: 'processing', guard: ({ context }) => context.options.extractEntities },
                { target: 'skipped' }
              ]
            },
            processing: {
              invoke: {
                id: 'extractEntities',
                src: services.extractEntities,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    entities: ({ event }) => event.output
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `Entity extraction failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' },
            skipped: { type: 'final' }
          }
        },

        summaryGeneration: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                { target: 'processing', guard: ({ context }) => context.options.generateSummary },
                { target: 'skipped' }
              ]
            },
            processing: {
              invoke: {
                id: 'generateSummary',
                src: services.generateSummary,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    summary: ({ event }) => event.output
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `Summary generation failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' },
            skipped: { type: 'final' }
          }
        },

        embeddingGeneration: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                { target: 'processing', guard: ({ context }) => context.options.generateEmbedding },
                { target: 'skipped' }
              ]
            },
            processing: {
              invoke: {
                id: 'generateEmbedding',
                src: services.generateEmbedding,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    embedding: ({ event }) => event.output
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `Embedding generation failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' },
            skipped: { type: 'final' }
          }
        },

        riskAssessment: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                { target: 'processing', guard: ({ context }) => context.options.assessRisk },
                { target: 'skipped' }
              ]
            },
            processing: {
              invoke: {
                id: 'assessRisk',
                src: services.assessRisk,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    riskScore: ({ event }) => event.output.riskScore,
                    confidenceScore: ({ event }) => event.output.confidenceScore
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `Risk assessment failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' },
            skipped: { type: 'final' }
          }
        },

        mcpAnalysis: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                { target: 'processing', guard: ({ context }) => context.options.useContext7 },
                { target: 'skipped' }
              ]
            },
            processing: {
              invoke: {
                id: 'analyzWithMCP',
                src: services.analyzWithMCP,
                onDone: {
                  target: 'completed',
                  actions: assign({
                    mcpAnalysis: ({ event }) => event.output.mcpAnalysis,
                    stackRecommendations: ({ event }) => event.output.recommendations
                  })
                },
                onError: {
                  target: 'failed',
                  actions: assign({
                    errors: ({ context, event }) => [...context.errors, `MCP analysis failed: ${event.error}`]
                  })
                }
              }
            },
            completed: { type: 'final' },
            failed: { type: 'final' },
            skipped: { type: 'final' }
          }
        }
      },
      onDone: [
        {
          target: 'storing',
          guard: ({ context }) => context.options.storeInQdrant
        },
        {
          target: 'completed'
        }
      ]
    },

    storing: {
      invoke: {
        id: 'storeDocument',
        src: services.storeDocument,
        onDone: {
          target: 'completed',
          actions: assign({
            documentId: ({ event }) => event.output.documentId,
            processingDuration: ({ context }) => 
              context.startTime ? Date.now() - context.startTime : 0
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            errors: ({ context, event }) => [...context.errors, `Storage failed: ${event.error}`]
          })
        }
      }
    },

    completed: {
      type: 'final',
      entry: assign({
        processingDuration: ({ context }) => 
          context.startTime ? Date.now() - context.startTime : 0
      })
    },

    error: {
      on: {
        RETRY: [
          {
            target: 'initializing',
            guard: ({ context }) => context.retryCount < context.maxRetries,
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              errors: ({ context }) => [...context.errors, `Retry attempt ${context.retryCount + 1}`]
            })
          },
          {
            target: 'failed'
          }
        ],
        CANCEL: {
          target: 'cancelled'
        }
      }
    },

    failed: {
      type: 'final'
    },

    cancelled: {
      type: 'final'
    }
  }
}, {
  // Guards
  guards: {
    hasContent: ({ context }) => !!context.content && context.content.length > 0,
    canRetry: ({ context }) => context.retryCount < context.maxRetries,
    shouldExtractEntities: ({ context }) => context.options.extractEntities,
    shouldGenerateSummary: ({ context }) => context.options.generateSummary,
    shouldAssessRisk: ({ context }) => context.options.assessRisk,
    shouldGenerateEmbedding: ({ context }) => context.options.generateEmbedding,
    shouldUseMCP: ({ context }) => context.options.useContext7,
    shouldStore: ({ context }) => context.options.storeInQdrant
  }
});

// Type for the actor reference
export type LegalDocumentProcessingActor = ActorRefFrom<typeof legalDocumentProcessingMachine>;

// Helper function to create a configured machine
export function createLegalDocumentProcessor(initialContext?: Partial<LegalDocumentContext>) {
  return legalDocumentProcessingMachine.provide({
    guards: {
      hasContent: ({ context }) => !!context.content && context.content.length > 0,
      canRetry: ({ context }) => context.retryCount < context.maxRetries
    }
  }).withContext({
    ...legalDocumentProcessingMachine.context,
    ...initialContext
  });
}

// State selectors for UI components
export const selectors = {
  isProcessing: (state: any) => 
    state.matches('extractingContent') || 
    state.matches('analyzing') || 
    state.matches('storing'),
  
  isAnalyzing: (state: any) => state.matches('analyzing'),
  isCompleted: (state: any) => state.matches('completed'),
  isFailed: (state: any) => state.matches('failed') || state.matches('error'),
  
  getProgress: (state: any) => {
    if (state.matches('idle')) return 0;
    if (state.matches('initializing')) return 10;
    if (state.matches('extractingContent')) return 20;
    if (state.matches('analyzing')) return 60;
    if (state.matches('storing')) return 90;
    if (state.matches('completed')) return 100;
    return 0;
  },

  getProcessingStage: (state: any) => {
    if (state.matches('idle')) return 'Ready';
    if (state.matches('initializing')) return 'Initializing';
    if (state.matches('extractingContent')) return 'Extracting Content';
    if (state.matches('analyzing')) return 'AI Analysis';
    if (state.matches('storing')) return 'Storing Results';
    if (state.matches('completed')) return 'Completed';
    if (state.matches('error')) return 'Error';
    if (state.matches('failed')) return 'Failed';
    return 'Unknown';
  },

  getAnalysisProgress: (state: any) => {
    if (!state.matches('analyzing')) return {};
    
    return {
      aiAnalysis: state.context.aiAnalysis ? 'completed' : 'processing',
      entityExtraction: state.context.entities ? 'completed' : 'processing',
      summaryGeneration: state.context.summary ? 'completed' : 'processing',
      embeddingGeneration: state.context.embedding ? 'completed' : 'processing',
      riskAssessment: state.context.riskScore !== undefined ? 'completed' : 'processing',
      mcpAnalysis: state.context.mcpAnalysis ? 'completed' : 'processing'
    };
  }
};