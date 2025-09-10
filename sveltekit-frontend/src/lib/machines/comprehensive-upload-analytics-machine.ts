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
  behaviorPattern: 'novice' | 'intermediate' | 'expert';
  uploadHistory: {
    totalUploads: number;
    successRate: number;
    averageFileSize: number;
    preferredFormats: string[];
    commonUploadTimes: number[]; // hours of day
  };
  interactionMetrics: {
    typingSpeed: number; // WPM
    clickPatterns: Array<{ x: number; y: number; timestamp: number }>;
    scrollBehavior: { depth: number; speed: number };
    focusTime: number; // average time spent per element
  };
  contextualPreferences: {
    preferredAIPromptStyle: 'detailed' | 'concise' | 'technical';
    helpLevel: 'minimal' | 'moderate' | 'extensive';
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

export interface UploadContext {
  // File management
  files: File[];
  currentFile?: File;
  uploadProgress: number;
  totalFiles: number;
  completedFiles: number;

  // User analytics
  userAnalytics: UserAnalytics;
  sessionStartTime: number;
  currentInteraction: {
    startTime: number;
    events: Array<{ type: string; timestamp: number; data: any }>;
    aiPrompts: Array<{ prompt: string; response: string; confidence: number }>;
  };

  // AI Context
  contextualPrompts: Array<{
    id: string;
    type: 'suggestion' | 'warning' | 'insight' | 'next-step';
    content: string;
    confidence: number;
    timing: 'before-upload' | 'during-upload' | 'after-upload';
    userReaction?: 'accepted' | 'dismissed' | 'ignored';
  }>;

  // Processing pipeline
  pipeline: {
    validation: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
    upload: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
    ocr: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
    aiAnalysis: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
    embedding: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
    indexing: { status: 'pending' | 'processing' | 'completed' | 'failed'; result?: any };
  };

  // Results
  uploadResults: Array<{
    fileId: string;
    fileName: string;
    success: boolean;
    documentId?: string;
    aiInsights?: any;
    processingTime: number;
    errorMessage?: string;
  }>;

  // Performance metrics
  performance: {
    totalStartTime: number;
    stageTimings: Record<string, number>;
    aiResponseTimes: number[];
    userEngagementScore: number;
    systemResourceUsage: {
      memory: number;
      cpu: number;
      network: number;
    };
  };

  // Error handling
  errors: string[];
  retryCount: number;
  maxRetries: number;
}

export type UploadEvent =
  // File operations
  | { type: 'SELECT_FILES'; files: File[]; caseId?: string }
  | { type: 'START_UPLOAD' }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'RETRY_UPLOAD' }
  | { type: 'FILE_PROGRESS'; fileId: string; progress: number }

  // User interaction tracking
  | { type: 'TRACK_USER_ACTION'; action: string; data: any }
  | { type: 'USER_TYPING'; speed: number; content: string }
  | { type: 'USER_CLICK'; x: number; y: number; element: string }
  | { type: 'USER_SCROLL'; depth: number; speed: number }
  | { type: 'USER_FOCUS'; element: string; duration: number }

  // AI contextual prompting
  | { type: 'REQUEST_AI_SUGGESTIONS'; context: string }
  | { type: 'AI_SUGGESTION_RECEIVED'; suggestions: any[] }
  | { type: 'USER_REACTED_TO_PROMPT'; promptId: string; reaction: 'accepted' | 'dismissed' | 'ignored' }
  | { type: 'GENERATE_CONTEXTUAL_HELP'; userQuery?: string }

  // Pipeline events
  | { type: 'PIPELINE_STAGE_COMPLETE'; stage: string; result: any }
  | { type: 'PIPELINE_STAGE_FAILED'; stage: string; error: string }
  | { type: 'AI_ANALYSIS_COMPLETE'; results: any }

  // Analytics events
  | { type: 'UPDATE_USER_PROFILE'; analytics: Partial<UserAnalytics> }
  | { type: 'ANALYZE_USER_PATTERNS' }
  | { type: 'GENERATE_PERFORMANCE_REPORT' }

  // System events
  | { type: 'RESET' }
  | { type: 'ERROR'; error: string };

// =========================
// SERVICES (Mock AI Integration)
// =========================

const analyzeUserBehaviorService = fromPromise(async ({ input }: { input: { analytics: UserAnalytics; currentInteraction: any } }) => {
  // Mock AI analysis of user behavior patterns
  await new Promise(resolve => setTimeout(resolve, 800));

  const { analytics, currentInteraction } = input;

  // Analyze typing patterns
  const typingAnalysis = {
    proficiency: analytics.interactionMetrics.typingSpeed > 40 ? 'high' :
                 analytics.interactionMetrics.typingSpeed > 20 ? 'medium' : 'low',
    confidence: Math.random() * 0.3 + 0.7
  };

  // Analyze interaction patterns
  const interactionAnalysis = {
    engagementLevel: analytics.interactionMetrics.focusTime > 30 ? 'high' : 'medium',
    preferredHelpStyle: analytics.contextualPreferences.preferredAIPromptStyle,
    confidence: Math.random() * 0.2 + 0.8
  };

  return {
    behaviorPattern: analytics.behaviorPattern,
    recommendations: [
      {
        type: 'ui-optimization',
        suggestion: 'Show advanced options based on user expertise',
        confidence: 0.85
      },
      {
        type: 'workflow-improvement',
        suggestion: 'Suggest batch upload for multiple files',
        confidence: 0.78
      }
    ],
    typingAnalysis,
    interactionAnalysis,
    predictedNextActions: ['upload', 'analyze', 'review']
  };
});

const generateContextualPromptsService = fromPromise(async ({ input }: {
  input: {
    userAnalytics: UserAnalytics;
    currentFiles: File[];
    caseContext: any;
    stage: string;
  }
}) => {
  // Mock AI contextual prompt generation
  await new Promise(resolve => setTimeout(resolve, 1200));

  const { userAnalytics, currentFiles, caseContext, stage } = input;

  const prompts = [];

  // Stage-specific prompts
  if (stage === 'file-selection') {
    if (currentFiles.length > 5) {
      prompts.push({
        id: `prompt-${Date.now()}-batch`,
        type: 'suggestion',
        content: 'Consider using batch processing for better performance with multiple files.',
        confidence: 0.82,
        timing: 'before-upload'
      });
    }

    // Check file types
    const pdfCount = currentFiles.filter(f => f.type === 'application/pdf').length;
    if (pdfCount > 0) {
      prompts.push({
        id: `prompt-${Date.now()}-ocr`,
        type: 'insight',
        content: `${pdfCount} PDF files detected. OCR analysis will be automatically applied for text extraction.`,
        confidence: 0.95,
        timing: 'before-upload'
      });
    }
  }

  // User expertise-based prompts
  if (userAnalytics.caseContext.expertise === 'paralegal') {
    prompts.push({
      id: `prompt-${Date.now()}-help`,
      type: 'suggestion',
      content: 'Would you like me to suggest relevant legal tags based on the document content?',
      confidence: 0.78,
      timing: 'during-upload'
    });
  }

  // Workflow-specific prompts
  if (caseContext?.workflowStage === 'discovery') {
    prompts.push({
      id: `prompt-${Date.now()}-discovery`,
      type: 'next-step',
      content: 'After upload, I can help identify key evidence relationships for your discovery phase.',
      confidence: 0.88,
      timing: 'after-upload'
    });
  }

  return prompts;
});

const performAIAnalysisService = fromPromise(async ({ input }: {
  input: {
    file: File;
    userContext: UserAnalytics;
    extractedText?: string;
  }
}) => {
  // Mock AI analysis with contextual understanding
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  const { file, userContext, extractedText } = input;

  // Mock analysis results based on file type and user context
  const analysisResults = {
    confidence: Math.random() * 0.3 + 0.7,
    documentType: file.type.includes('pdf') ? 'legal_document' : 'evidence_file',
    keyEntities: [
      { type: 'person', value: 'John Doe', confidence: 0.92 },
      { type: 'organization', value: 'ACME Corp', confidence: 0.85 },
      { type: 'date', value: '2024-01-15', confidence: 0.78 }
    ],
    legalCategories: ['contract', 'employment', 'litigation'],
    sentiment: { score: 0.2, label: 'neutral' },
    complexity: userContext.caseContext.expertise === 'partner' ? 'high' : 'medium',
    suggestedTags: ['evidence', 'discovery', 'contract-dispute'],
    aiInsights: {
      summary: `Document analysis complete. ${extractedText ? 'Text extracted and processed.' : 'File processed successfully.'} Identified as ${file.type.includes('pdf') ? 'legal document' : 'evidence file'}.`,
      recommendations: [
        'Consider cross-referencing with existing case documents',
        'Review entity mentions for case relevance',
        'Tag document for easy retrieval during trial preparation'
      ],
      potentialIssues: [],
      nextSteps: ['review_entities', 'tag_document', 'link_to_case']
    }
  };

  return analysisResults;
});

const generatePerformanceReportService = fromPromise(async ({ input }: { input: UploadContext }) => {
  await new Promise(resolve => setTimeout(resolve, 500));

  const { performance, userAnalytics, uploadResults } = input;

  const totalTime = Date.now() - performance.totalStartTime;
  const avgAIResponseTime = performance.aiResponseTimes.reduce((a, b) => a + b, 0) / performance.aiResponseTimes.length || 0;

  return {
    summary: {
      totalFiles: uploadResults.length,
      successfulUploads: uploadResults.filter(r => r.success).length,
      totalProcessingTime: totalTime,
      averageAIResponseTime: avgAIResponseTime,
      userEngagementScore: performance.userEngagementScore
    },
    recommendations: [
      'Consider batch processing for better performance',
      'Enable AI pre-analysis for faster insights',
      'Use suggested tags to improve search efficiency'
    ],
    userInsights: {
      behaviorPattern: userAnalytics.behaviorPattern,
      preferredWorkflow: 'standard_upload',
      improvementAreas: ['file_organization', 'tag_consistency']
    }
  };
});

// =========================
// MACHINE DEFINITION
// =========================

export const comprehensiveUploadAnalyticsMachine = createMachine({
  id: 'comprehensiveUploadAnalytics',

  types: {} as {
    context: UploadContext;
    events: UploadEvent;
  },

  initial: 'idle',

  context: {
    files: [],
    uploadProgress: 0,
    totalFiles: 0,
    completedFiles: 0,

    userAnalytics: {
      userId: '',
      sessionId: '',
      behaviorPattern: 'intermediate',
      uploadHistory: {
        totalUploads: 0,
        successRate: 0.0,
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

    sessionStartTime: Date.now(),
    currentInteraction: {
      startTime: Date.now(),
      events: [],
      aiPrompts: []
    },

    contextualPrompts: [],

    pipeline: {
      validation: { status: 'pending' },
      upload: { status: 'pending' },
      ocr: { status: 'pending' },
      aiAnalysis: { status: 'pending' },
      embedding: { status: 'pending' },
      indexing: { status: 'pending' }
    },

    uploadResults: [],

    performance: {
      totalStartTime: Date.now(),
      stageTimings: {},
      aiResponseTimes: [],
      userEngagementScore: 0,
      systemResourceUsage: {
        memory: 0,
        cpu: 0,
        network: 0
      }
    },

    errors: [],
    retryCount: 0,
    maxRetries: 3
  },

  states: {
    idle: {
      entry: assign({
        sessionStartTime: () => Date.now(),
        'performance.totalStartTime': () => Date.now()
      }),

      on: {
        SELECT_FILES: {
          target: 'analyzingUserBehavior',
          actions: assign({
            files: ({ event }) => event.files,
            totalFiles: ({ event }) => event.files.length,
            'userAnalytics.caseContext.currentCaseId': ({ event }) => event.caseId,
            'currentInteraction.events': ({ context }) => [
              ...context.currentInteraction.events,
              { type: 'file_selection', timestamp: Date.now(), data: { fileCount: context.files.length } }
            ]
          })
        },

        TRACK_USER_ACTION: {
          actions: assign({
            'currentInteraction.events': ({ context, event }) => [
              ...context.currentInteraction.events,
              { type: event.action, timestamp: Date.now(), data: event.data }
            ]
          })
        },

        UPDATE_USER_PROFILE: {
          actions: assign({
            userAnalytics: ({ context, event }) => ({
              ...context.userAnalytics,
              ...event.analytics
            })
          })
        }
      }
    },

    analyzingUserBehavior: {
      invoke: {
        src: analyzeUserBehaviorService,
        input: ({ context }) => ({
          analytics: context.userAnalytics,
          currentInteraction: context.currentInteraction
        }),
        onDone: {
          target: 'generatingContextualPrompts',
          actions: assign({
            'userAnalytics.behaviorPattern': ({ event }) => event.output.behaviorPattern || 'intermediate',
            'performance.userEngagementScore': ({ event }) => event.output.interactionAnalysis?.confidence || 0.5
          })
        },
        onError: {
          target: 'generatingContextualPrompts',
          actions: assign({
            errors: ({ context, event }) => [...context.errors, `Behavior analysis failed: ${event.error}`]
          })
        }
      }
    },

    generatingContextualPrompts: {
      invoke: {
        src: generateContextualPromptsService,
        input: ({ context }) => ({
          userAnalytics: context.userAnalytics,
          currentFiles: context.files,
          caseContext: context.userAnalytics.caseContext,
          stage: 'file-selection'
        }),
        onDone: {
          target: 'ready',
          actions: assign({
            contextualPrompts: ({ event }) => event.output,
            'currentInteraction.aiPrompts': ({ context, event }) => [
              ...context.currentInteraction.aiPrompts,
              ...event.output.map((prompt: any) => ({
                prompt: prompt.content,
                response: '',
                confidence: prompt.confidence
              }))
            ]
          })
        },
        onError: {
          target: 'ready',
          actions: assign({
            errors: ({ context, event }) => [...context.errors, `Prompt generation failed: ${event.error}`]
          })
        }
      }
    },

    ready: {
      on: {
        START_UPLOAD: 'uploadPipeline',

        USER_REACTED_TO_PROMPT: {
          actions: assign({
            contextualPrompts: ({ context, event }) =>
              context.contextualPrompts.map(prompt =>
                prompt.id === event.promptId
                  ? { ...prompt, userReaction: event.reaction }
                  : prompt
              ),
            'performance.userEngagementScore': ({ context, event }) =>
              event.reaction === 'accepted'
                ? Math.min(context.performance.userEngagementScore + 0.1, 1.0)
                : context.performance.userEngagementScore
          })
        },

        REQUEST_AI_SUGGESTIONS: 'generatingContextualPrompts',

        TRACK_USER_ACTION: {
          actions: assign({
            'currentInteraction.events': ({ context, event }) => [
              ...context.currentInteraction.events,
              { type: event.action, timestamp: Date.now(), data: event.data }
            ]
          })
        }
      }
    },

    uploadPipeline: {
      initial: 'validating',

      entry: assign({
        'performance.stageTimings.upload_start': () => Date.now()
      }),

      states: {
        validating: {
          entry: assign({
            'pipeline.validation.status': () => 'processing' as const
          }),

          after: {
            1000: {
              target: 'uploading',
              actions: assign({
                'pipeline.validation.status': () => 'completed' as const,
                'pipeline.validation.result': ({ context }) => ({
                  validFiles: context.files.length,
                  totalSize: context.files.reduce((sum, file) => sum + file.size, 0)
                })
              })
            }
          }
        },

        uploading: {
          entry: assign({
            'pipeline.upload.status': () => 'processing' as const
          }),

          after: {
            2000: {
              target: 'performingOCR',
              actions: assign({
                'pipeline.upload.status': () => 'completed' as const,
                uploadProgress: 33
              })
            }
          },

          on: {
            FILE_PROGRESS: {
              actions: assign({
                uploadProgress: ({ event }) => event.progress
              })
            }
          }
        },

        performingOCR: {
          entry: assign({
            'pipeline.ocr.status': () => 'processing' as const
          }),

          after: {
            3000: {
              target: 'aiAnalysis',
              actions: assign({
                'pipeline.ocr.status': () => 'completed' as const,
                'pipeline.ocr.result': () => ({
                  extractedText: 'Mock extracted text from documents...',
                  confidence: 0.89
                }),
                uploadProgress: 60
              })
            }
          }
        },

        aiAnalysis: {
          entry: assign({
            'pipeline.aiAnalysis.status': () => 'processing' as const
          }),

          invoke: {
            src: performAIAnalysisService,
            input: ({ context }) => ({
              file: context.files[0],
              userContext: context.userAnalytics,
              extractedText: context.pipeline.ocr.result?.extractedText
            }),
            onDone: {
              target: 'generatingEmbeddings',
              actions: assign({
                'pipeline.aiAnalysis.status': () => 'completed' as const,
                'pipeline.aiAnalysis.result': ({ event }) => event.output,
                'performance.aiResponseTimes': ({ context, event }) => [
                  ...context.performance.aiResponseTimes,
                  Date.now() - context.performance.totalStartTime
                ],
                uploadProgress: 80
              })
            },
            onError: {
              target: 'generatingEmbeddings',
              actions: assign({
                'pipeline.aiAnalysis.status': () => 'failed' as const,
                errors: ({ context, event }) => [...context.errors, `AI analysis failed: ${event.error}`]
              })
            }
          }
        },

        generatingEmbeddings: {
          entry: assign({
            'pipeline.embedding.status': () => 'processing' as const
          }),

          after: {
            1500: {
              target: 'indexing',
              actions: assign({
                'pipeline.embedding.status': () => 'completed' as const,
                uploadProgress: 90
              })
            }
          }
        },

        indexing: {
          entry: assign({
            'pipeline.indexing.status': () => 'processing' as const
          }),

          after: {
            1000: {
              target: 'completed',
              actions: assign({
                'pipeline.indexing.status': () => 'completed' as const,
                uploadProgress: 100,
                completedFiles: ({ context }) => context.totalFiles,
                uploadResults: ({ context }) => context.files.map((file, index) => ({
                  fileId: `file-${index}`,
                  fileName: file.name,
                  success: true,
                  documentId: `doc-${Date.now()}-${index}`,
                  aiInsights: context.pipeline.aiAnalysis.result,
                  processingTime: Date.now() - context.performance.totalStartTime
                }))
              })
            }
          }
        },

        completed: {
          type: 'final'
        }
      },

      onDone: 'generatingReport'
    },

    generatingReport: {
      invoke: {
        src: generatePerformanceReportService,
        input: ({ context }) => context,
        onDone: {
          target: 'completed',
          actions: assign({
            'performance.stageTimings.report_generated': () => Date.now()
          })
        },
        onError: 'completed'
      }
    },

    completed: {
      entry: assign({
        'performance.stageTimings.total_complete': () => Date.now()
      }),

      on: {
        RESET: 'idle',
        ANALYZE_USER_PATTERNS: 'analyzingUserBehavior'
      }
    },

    error: {
      on: {
        RETRY_UPLOAD: {
          target: 'uploadPipeline',
          guard: ({ context }) => context.retryCount < context.maxRetries,
          actions: assign({
            retryCount: ({ context }) => context.retryCount + 1,
            errors: []
          })
        },
        RESET: 'idle'
      }
    }
  },

  on: {
    CANCEL_UPLOAD: 'idle',
    ERROR: {
      target: 'error',
      actions: assign({
        errors: ({ context, event }) => [...context.errors, event.error]
      })
    }
  }
});

// =========================
// HELPER FUNCTIONS
// =========================

export function createUploadAnalyticsActor(initialContext?: Partial<UploadContext>) {
  return createActor(comprehensiveUploadAnalyticsMachine, {
    input: initialContext
  });
}

export function getContextualPromptsByTiming(context: UploadContext, timing: 'before-upload' | 'during-upload' | 'after-upload') {
  return context.contextualPrompts.filter(prompt => prompt.timing === timing);
}

export function calculateUserEngagementScore(context: UploadContext): number {
  const promptsAccepted = context.contextualPrompts.filter(p => p.userReaction === 'accepted').length;
  const totalPrompts = context.contextualPrompts.length;
  const baseScore = totalPrompts > 0 ? promptsAccepted / totalPrompts : 0.5;

  // Factor in interaction metrics
  const interactionScore = Math.min(context.currentInteraction.events.length / 10, 1.0);

  return (baseScore * 0.7) + (interactionScore * 0.3);
}

export function generateUserInsights(context: UploadContext) {
  return {
    behaviorPattern: context.userAnalytics.behaviorPattern,
    engagementLevel: context.performance.userEngagementScore > 0.7 ? 'high' :
                     context.performance.userEngagementScore > 0.4 ? 'medium' : 'low',
    preferredInteractionStyle: context.userAnalytics.contextualPreferences.preferredAIPromptStyle,
    uploadEfficiency: context.uploadResults.length > 0 ?
      context.uploadResults.filter(r => r.success).length / context.uploadResults.length : 0,
    recommendations: generatePersonalizedRecommendations(context)
  };
}

function generatePersonalizedRecommendations(context: UploadContext): string[] {
  const recommendations = [];

  if (context.performance.userEngagementScore < 0.5) {
    recommendations.push('Consider enabling more AI suggestions for better workflow guidance');
  }

  if (context.userAnalytics.behaviorPattern === 'novice') {
    recommendations.push('Tutorial mode available for step-by-step upload guidance');
  }

  if (context.files.length > 5) {
    recommendations.push('Batch processing mode can improve efficiency for multiple files');
  }

  return recommendations;
}
