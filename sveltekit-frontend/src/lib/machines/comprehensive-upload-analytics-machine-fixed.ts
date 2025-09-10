/**
 * Comprehensive Upload Analytics XState Machine
 * Integrates upload pipeline, contextual AI prompting, and user analytics
 *
 * Features:
 * - Upload pipeline orchestration with real-time progress
 * - Contextual AI prompting based on user behavior
 * - User analytics collection and pattern analysis
 * - Mock AI integration ready for production
 * - Performance monitoring and optimization
 */

import { createMachine, assign, fromPromise, createActor } from 'xstate';
import { z } from 'zod';

// =========================
// TYPES & INTERFACES
// =========================

export interface UserAnalytics {
  userId: string;
  sessionId: string;
  behaviorPattern: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  uploadHistory: {
    totalUploads: number;
    successRate: number;
    averageFileSize: number;
    preferredFormats: string[];
    commonUploadTimes: number[];
  };
  interactionMetrics: {
    typingSpeed: number; // WPM
    clickPatterns: Array<{ x: number; y: number; element: string; timestamp: number }>;
    scrollBehavior: { depth: number; speed: number };
    focusTime: number; // milliseconds
  };
  contextualPreferences: {
    preferredAIPromptStyle: 'concise' | 'detailed' | 'technical';
    helpLevel: 'minimal' | 'moderate' | 'comprehensive';
    autoSuggestions: boolean;
    proactiveInsights: boolean;
  };
  caseContext: {
    activeCases: string[];
    currentCaseId?: string;
    workflowStage: 'discovery' | 'analysis' | 'preparation' | 'trial';
    expertise: 'paralegal' | 'associate' | 'senior' | 'partner';
  };
}

export interface ContextualPrompt {
  id: string;
  content: string;
  timing: 'before-upload' | 'during-upload' | 'after-upload';
  confidence: number;
  category: 'suggestion' | 'warning' | 'insight' | 'next-step';
  userReaction?: 'accepted' | 'dismissed' | 'ignored';
  timestamp: number;
}

export interface UploadContext {
  // User Analytics
  userAnalytics: UserAnalytics;

  // Current interaction tracking
  currentInteraction: {
    startTime: number;
    events: Array<{ type: string; timestamp: number; data: any }>;
    aiPrompts: ContextualPrompt[];
  };

  // Upload pipeline state
  selectedFiles: File[];
  uploadProgress: number;
  uploadResults: Array<{
    fileName: string;
    success: boolean;
    documentId?: string;
    errorMessage?: string;
    processingTime: number;
    aiInsights?: any;
  }>;

  // Pipeline status
  pipeline: {
    validation: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
    upload: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
    ocr: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
    aiAnalysis: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
    embedding: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
    indexing: { status: 'idle' | 'processing' | 'completed' | 'failed'; progress: number };
  };

  // Performance tracking
  performance: {
    totalStartTime: number;
    stageTimings: {
      user_analysis: number;
      contextual_prompts: number;
      upload_start: number;
      upload_complete: number;
      ai_analysis: number;
      report_generated: number;
      total_complete: number;
    };
    userEngagementScore: number;
    optimizationSuggestions: string[];
  };

  // AI Integration
  contextualPrompts: ContextualPrompt[];
  aiInsights: {
    behaviorAnalysis: any;
    uploadPredictions: any;
    performanceMetrics: any;
  };

  // Error handling
  errors: string[];
  retryCount: number;
}

export type UploadEvent =
  | { type: 'SELECT_FILES'; files: File[]; caseId?: string }
  | { type: 'START_UPLOAD' }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'RETRY_UPLOAD' }
  | { type: 'RESET' }
  | { type: 'TRACK_USER_ACTION'; action: string; data: any }
  | { type: 'USER_TYPING'; speed: number; content: string }
  | { type: 'USER_CLICK'; x: number; y: number; element: string }
  | { type: 'USER_SCROLL'; depth: number; speed: number }
  | { type: 'USER_REACTED_TO_PROMPT'; promptId: string; reaction: 'accepted' | 'dismissed' | 'ignored' }
  | { type: 'REQUEST_AI_SUGGESTIONS'; context: string };

// =========================
// MOCK AI SERVICES
// =========================

const analyzeUserBehaviorService = fromPromise<any, { userAnalytics: UserAnalytics }>(
  async ({ input }) => {
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const { userAnalytics } = input;

    // Mock behavior pattern analysis
    let behaviorPattern: UserAnalytics['behaviorPattern'] = 'intermediate';

    if (userAnalytics.interactionMetrics.typingSpeed > 60) {
      behaviorPattern = userAnalytics.uploadHistory.totalUploads > 50 ? 'expert' : 'advanced';
    } else if (userAnalytics.interactionMetrics.typingSpeed < 30) {
      behaviorPattern = 'beginner';
    }

    return {
      behaviorPattern,
      confidenceScore: 0.85,
      recommendations: [
        'User shows efficient interaction patterns',
        'Consider enabling advanced features',
        'Proactive suggestions would be beneficial'
      ],
      engagementLevel: 'high',
      uploadEfficiency: 0.92,
      nextStepSuggestions: [
        'Enable batch processing for multiple files',
        'Set up automated document categorization',
        'Configure custom AI prompts for your workflow'
      ]
    };
  }
);

const generateContextualPromptsService = fromPromise<ContextualPrompt[], {
  userAnalytics: UserAnalytics;
  selectedFiles?: File[];
  stage: 'before-upload' | 'during-upload' | 'after-upload';
}>(
  async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const { userAnalytics, selectedFiles, stage } = input;
    const prompts: ContextualPrompt[] = [];

    if (stage === 'before-upload' && selectedFiles?.length) {
      // Pre-upload suggestions based on files and user behavior
      const fileTypes = [...new Set(selectedFiles.map(f => f.type))];

      if (fileTypes.includes('application/pdf')) {
        prompts.push({
          id: `prompt-${Date.now()}-1`,
          content: "I notice you're uploading PDF documents. Would you like me to automatically extract key legal entities and create case timeline entries?",
          timing: 'before-upload',
          confidence: 0.9,
          category: 'suggestion',
          timestamp: Date.now()
        });
      }

      if (userAnalytics.behaviorPattern === 'beginner') {
        prompts.push({
          id: `prompt-${Date.now()}-2`,
          content: "💡 Tip: After upload, I can help organize these documents and suggest relevant case law connections.",
          timing: 'before-upload',
          confidence: 0.8,
          category: 'insight',
          timestamp: Date.now()
        });
      }
    }

    if (stage === 'during-upload') {
      prompts.push({
        id: `prompt-${Date.now()}-3`,
        content: "While processing, I'm analyzing document content for potential privilege issues and key legal concepts.",
        timing: 'during-upload',
        confidence: 0.85,
        category: 'insight',
        timestamp: Date.now()
      });
    }

    if (stage === 'after-upload') {
      prompts.push({
        id: `prompt-${Date.now()}-4`,
        content: "Great! Your documents are indexed. Would you like me to generate a case summary or search for similar precedents?",
        timing: 'after-upload',
        confidence: 0.9,
        category: 'next-step',
        timestamp: Date.now()
      });
    }

    return prompts;
  }
);

const performAIAnalysisService = fromPromise<any, { files: File[]; userContext: any }>(
  async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { files } = input;

    return {
      results: files.map(file => ({
        fileName: file.name,
        success: true,
        documentId: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        processingTime: Math.floor(Math.random() * 1000) + 500,
        aiInsights: {
          summary: `AI analysis complete for ${file.name}. Detected legal document with high confidence.`,
          keyEntities: [
            { type: 'person', value: 'John Doe', confidence: 0.95 },
            { type: 'organization', value: 'Acme Corp', confidence: 0.88 },
            { type: 'date', value: '2024-01-15', confidence: 0.92 }
          ],
          suggestedTags: ['contract', 'commercial', 'agreement'],
          confidenceScore: 0.87
        }
      }))
    };
  }
);

// =========================
// MACHINE DEFINITION
// =========================

export const comprehensiveUploadAnalyticsMachine = createMachine({
  id: 'comprehensiveUploadAnalytics',
  initial: 'idle',
  types: {
    context: {} as UploadContext,
    events: {} as UploadEvent
  },
  context: ({ input }: { input?: { userAnalytics: UserAnalytics } }) => ({
    userAnalytics: input?.userAnalytics || {
      userId: 'anonymous',
      sessionId: `session-${Date.now()}`,
      behaviorPattern: 'intermediate',
      uploadHistory: {
        totalUploads: 0,
        successRate: 0,
        averageFileSize: 0,
        preferredFormats: [],
        commonUploadTimes: []
      },
      interactionMetrics: {
        typingSpeed: 0,
        clickPatterns: [],
        scrollBehavior: { depth: 0, speed: 0 },
        focusTime: 0
      },
      contextualPreferences: {
        preferredAIPromptStyle: 'detailed',
        helpLevel: 'moderate',
        autoSuggestions: true,
        proactiveInsights: true
      },
      caseContext: {
        activeCases: [],
        workflowStage: 'discovery',
        expertise: 'associate'
      }
    },
    currentInteraction: {
      startTime: Date.now(),
      events: [],
      aiPrompts: []
    },
    selectedFiles: [],
    uploadProgress: 0,
    uploadResults: [],
    pipeline: {
      validation: { status: 'idle', progress: 0 },
      upload: { status: 'idle', progress: 0 },
      ocr: { status: 'idle', progress: 0 },
      aiAnalysis: { status: 'idle', progress: 0 },
      embedding: { status: 'idle', progress: 0 },
      indexing: { status: 'idle', progress: 0 }
    },
    performance: {
      totalStartTime: 0,
      stageTimings: {
        user_analysis: 0,
        contextual_prompts: 0,
        upload_start: 0,
        upload_complete: 0,
        ai_analysis: 0,
        report_generated: 0,
        total_complete: 0
      },
      userEngagementScore: 0,
      optimizationSuggestions: []
    },
    contextualPrompts: [],
    aiInsights: {
      behaviorAnalysis: null,
      uploadPredictions: null,
      performanceMetrics: null
    },
    errors: [],
    retryCount: 0
  }),
  states: {
    idle: {
      entry: assign(({ context }) => ({
        performance: {
          ...context.performance,
          totalStartTime: Date.now()
        }
      })),
      on: {
        SELECT_FILES: {
          target: 'analyzingUserBehavior',
          actions: assign(({ context, event }) => ({
            selectedFiles: event.files,
            userAnalytics: {
              ...context.userAnalytics,
              caseContext: {
                ...context.userAnalytics.caseContext,
                currentCaseId: event.caseId
              }
            },
            currentInteraction: {
              ...context.currentInteraction,
              events: [
                ...context.currentInteraction.events,
                { type: 'SELECT_FILES', timestamp: Date.now(), data: { fileCount: event.files.length } }
              ]
            }
          }))
        },
        TRACK_USER_ACTION: {
          actions: assign(({ context, event }) => ({
            currentInteraction: {
              ...context.currentInteraction,
              events: [
                ...context.currentInteraction.events,
                { type: event.action, timestamp: Date.now(), data: event.data }
              ]
            }
          }))
        }
      }
    },

    analyzingUserBehavior: {
      invoke: {
        src: analyzeUserBehaviorService,
        input: ({ context }) => ({ userAnalytics: context.userAnalytics }),
        onDone: {
          target: 'generatingContextualPrompts',
          actions: assign(({ context, event }) => ({
            userAnalytics: {
              ...context.userAnalytics,
              behaviorPattern: event.output.behaviorPattern || 'intermediate'
            },
            aiInsights: {
              ...context.aiInsights,
              behaviorAnalysis: event.output
            },
            performance: {
              ...context.performance,
              stageTimings: {
                ...context.performance.stageTimings,
                user_analysis: Date.now()
              }
            }
          }))
        },
        onError: {
          target: 'ready',
          actions: assign(({ context }) => ({
            errors: [...context.errors, 'Failed to analyze user behavior']
          }))
        }
      }
    },

    generatingContextualPrompts: {
      invoke: {
        src: generateContextualPromptsService,
        input: ({ context }) => ({
          userAnalytics: context.userAnalytics,
          selectedFiles: context.selectedFiles,
          stage: 'before-upload' as const
        }),
        onDone: {
          target: 'ready',
          actions: assign(({ context, event }) => ({
            currentInteraction: {
              ...context.currentInteraction,
              aiPrompts: [
                ...context.currentInteraction.aiPrompts,
                ...event.output
              ]
            },
            contextualPrompts: event.output,
            performance: {
              ...context.performance,
              stageTimings: {
                ...context.performance.stageTimings,
                contextual_prompts: Date.now()
              }
            }
          }))
        },
        onError: {
          target: 'ready',
          actions: assign(({ context }) => ({
            errors: [...context.errors, 'Failed to generate contextual prompts']
          }))
        }
      }
    },

    ready: {
      on: {
        START_UPLOAD: {
          target: 'uploadPipeline',
          guard: ({ context }) => context.selectedFiles.length > 0
        },
        USER_REACTED_TO_PROMPT: {
          actions: assign(({ context, event }) => ({
            performance: {
              ...context.performance,
              userEngagementScore: calculateUserEngagementScore({
                ...context,
                currentInteraction: {
                  ...context.currentInteraction,
                  events: [
                    ...context.currentInteraction.events,
                    { type: 'PROMPT_REACTION', timestamp: Date.now(), data: { reaction: event.reaction } }
                  ]
                }
              })
            },
            currentInteraction: {
              ...context.currentInteraction,
              events: [
                ...context.currentInteraction.events,
                { type: 'PROMPT_REACTION', timestamp: Date.now(), data: { reaction: event.reaction } }
              ]
            }
          }))
        },
        TRACK_USER_ACTION: {
          actions: assign(({ context, event }) => ({
            currentInteraction: {
              ...context.currentInteraction,
              events: [
                ...context.currentInteraction.events,
                { type: event.action, timestamp: Date.now(), data: event.data }
              ]
            }
          }))
        },
        RESET: {
          target: 'idle'
        }
      }
    },

    uploadPipeline: {
      entry: assign(({ context }) => ({
        performance: {
          ...context.performance,
          stageTimings: {
            ...context.performance.stageTimings,
            upload_start: Date.now()
          }
        }
      })),
      initial: 'validatingFiles',
      states: {
        validatingFiles: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              validation: { status: 'processing', progress: 0 }
            }
          })),
          after: {
            1000: {
              target: 'uploadingFiles',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  validation: { status: 'completed', progress: 100 }
                },
                uploadProgress: 15
              }))
            }
          }
        },

        uploadingFiles: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              upload: { status: 'processing', progress: 0 }
            }
          })),
          after: {
            2000: {
              target: 'processOCR',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  upload: { status: 'completed', progress: 100 }
                },
                uploadProgress: 35
              }))
            }
          }
        },

        processOCR: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              ocr: { status: 'processing', progress: 0 }
            }
          })),
          after: {
            1500: {
              target: 'performAIAnalysis',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  ocr: { status: 'completed', progress: 100 }
                },
                uploadProgress: 55
              }))
            }
          }
        },

        performAIAnalysis: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              aiAnalysis: { status: 'processing', progress: 0 }
            }
          })),
          invoke: {
            src: performAIAnalysisService,
            input: ({ context }) => ({
              files: context.selectedFiles,
              userContext: context.userAnalytics
            }),
            onDone: {
              target: 'generateEmbeddings',
              actions: assign(({ context, event }) => ({
                uploadResults: event.output.results,
                pipeline: {
                  ...context.pipeline,
                  aiAnalysis: { status: 'completed', progress: 100 }
                },
                uploadProgress: 75,
                performance: {
                  ...context.performance,
                  stageTimings: {
                    ...context.performance.stageTimings,
                    ai_analysis: Date.now()
                  }
                }
              }))
            },
            onError: {
              target: 'generateEmbeddings',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  aiAnalysis: { status: 'failed', progress: 0 }
                },
                errors: [...context.errors, 'AI analysis failed']
              }))
            }
          }
        },

        generateEmbeddings: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              embedding: { status: 'processing', progress: 0 }
            }
          })),
          after: {
            1000: {
              target: 'indexDocuments',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  embedding: { status: 'completed', progress: 100 }
                },
                uploadProgress: 90
              }))
            }
          }
        },

        indexDocuments: {
          entry: assign(({ context }) => ({
            pipeline: {
              ...context.pipeline,
              indexing: { status: 'processing', progress: 0 }
            }
          })),
          after: {
            800: {
              target: '#comprehensiveUploadAnalytics.generatingReport',
              actions: assign(({ context }) => ({
                pipeline: {
                  ...context.pipeline,
                  indexing: { status: 'completed', progress: 100 }
                },
                uploadProgress: 100,
                performance: {
                  ...context.performance,
                  stageTimings: {
                    ...context.performance.stageTimings,
                    upload_complete: Date.now()
                  }
                }
              }))
            }
          }
        }
      },
      on: {
        CANCEL_UPLOAD: {
          target: 'ready',
          actions: assign(({ context }) => ({
            uploadProgress: 0,
            selectedFiles: [],
            uploadResults: [],
            pipeline: {
              validation: { status: 'idle', progress: 0 },
              upload: { status: 'idle', progress: 0 },
              ocr: { status: 'idle', progress: 0 },
              aiAnalysis: { status: 'idle', progress: 0 },
              embedding: { status: 'idle', progress: 0 },
              indexing: { status: 'idle', progress: 0 }
            }
          }))
        }
      }
    },

    generatingReport: {
      invoke: {
        src: generateContextualPromptsService,
        input: ({ context }) => ({
          userAnalytics: context.userAnalytics,
          selectedFiles: context.selectedFiles,
          stage: 'after-upload' as const
        }),
        onDone: {
          target: 'completed',
          actions: assign(({ context, event }) => ({
            contextualPrompts: [...context.contextualPrompts, ...event.output],
            performance: {
              ...context.performance,
              stageTimings: {
                ...context.performance.stageTimings,
                report_generated: Date.now()
              }
            }
          }))
        },
        onError: {
          target: 'completed'
        }
      }
    },

    completed: {
      entry: assign(({ context }) => ({
        performance: {
          ...context.performance,
          stageTimings: {
            ...context.performance.stageTimings,
            total_complete: Date.now()
          }
        }
      })),
      on: {
        RESET: {
          target: 'idle',
          actions: assign(() => ({
            selectedFiles: [],
            uploadProgress: 0,
            uploadResults: [],
            contextualPrompts: [],
            errors: [],
            retryCount: 0,
            currentInteraction: {
              startTime: Date.now(),
              events: [],
              aiPrompts: []
            }
          }))
        },
        REQUEST_AI_SUGGESTIONS: {
          target: 'generatingContextualPrompts'
        }
      }
    }
  }
});

// =========================
// HELPER FUNCTIONS
// =========================

export function createUploadAnalyticsActor(input?: { userAnalytics: UserAnalytics }) {
  return createActor(comprehensiveUploadAnalyticsMachine, { input });
}

export function getContextualPromptsByTiming(
  context: UploadContext,
  timing: 'before-upload' | 'during-upload' | 'after-upload'
): ContextualPrompt[] {
  return context.contextualPrompts.filter(prompt => prompt.timing === timing);
}

export function calculateUserEngagementScore(context: UploadContext): number {
  const { currentInteraction, userAnalytics } = context;

  // Base score from interaction events
  const eventScore = Math.min(currentInteraction.events.length * 0.1, 0.5);

  // Typing speed contribution
  const typingScore = Math.min(userAnalytics.interactionMetrics.typingSpeed / 100, 0.3);

  // Prompt interaction score
  const promptInteractions = currentInteraction.events.filter(e => e.type === 'PROMPT_REACTION');
  const promptScore = Math.min(promptInteractions.length * 0.2, 0.2);

  return Math.min(eventScore + typingScore + promptScore, 1.0);
}

export function generateUserInsights(context: UploadContext) {
  const { userAnalytics, performance, currentInteraction } = context;

  return {
    behaviorPattern: userAnalytics.behaviorPattern,
    engagementLevel: performance.userEngagementScore > 0.7 ? 'high' :
                    performance.userEngagementScore > 0.4 ? 'medium' : 'low',
    uploadEfficiency: context.uploadResults.length > 0 ?
                     context.uploadResults.filter(r => r.success).length / context.uploadResults.length : 0,
    recommendations: [
      userAnalytics.behaviorPattern === 'beginner' ?
        'Consider enabling guided tour for new features' :
        'Advanced shortcuts are available for faster workflows',
      performance.userEngagementScore > 0.8 ?
        'You\'re highly engaged! Try our power-user features' :
        'Explore contextual AI suggestions to improve efficiency'
    ]
  };
}

export default comprehensiveUploadAnalyticsMachine;
