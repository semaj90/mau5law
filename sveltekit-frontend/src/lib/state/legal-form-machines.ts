// Legal AI Form State Machines with XState
// Advanced state management for legal document processing workflows
import { createMachine, assign, fromPromise, type ActorRefFrom } from 'xstate';
import { z } from 'zod';
// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================
export const DocumentUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  documentType: z.enum([
    'contract',
    'motion',
    'brief',
    'evidence',
    'correspondence',
    'statute',
    'regulation',
    'case_law',
    'other',
  ]),
  jurisdiction: z.enum(['federal', 'state', 'local', 'international']).optional(),
  tags: z.array(z.string()).default([]),
  file: z.any().refine(file => file instanceof File, 'File is required'),
  aiProcessing: z
    .object({
      generateSummary: z.boolean().default(true),
      extractEntities: z.boolean().default(true),
      riskAssessment: z.boolean().default(true),
      generateRecommendations: z.boolean().default(false),
    })
    .optional()
    .default({
      generateSummary: true,
      extractEntities: true,
      riskAssessment: true,
      generateRecommendations: false,
    }),
});
export const CaseCreationSchema = z.object({
  title: z.string().min(1, 'Case title is required').max(255, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  caseNumber: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['active', 'pending', 'closed', 'archived']).default('active'),
  assignedTo: z.string().uuid().optional(),
  jurisdiction: z.enum(['federal', 'state', 'local', 'international']).optional(),
  tags: z.array(z.string()).default([]),
  estimatedDuration: z.number().min(1).max(365).optional(),
  budget: z.number().min(0).optional(),
});
export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Query too long'),
  filters: z
    .object({
      documentTypes: z.array(z.string()).default([]),
      jurisdictions: z.array(z.string()).default([]),
      dateRange: z
        .object({
          from: z.date().optional(),
          to: z.date().optional(),
        })
        .optional(),
      tags: z.array(z.string()).default([]),
      similarityThreshold: z.number().min(0).max(1).default(0.7),
      maxResults: z.number().min(1).max(100).default(20),
    })
    .optional()
    .default({}),
  useAI: z.boolean().default(true),
  cacheResults: z.boolean().default(true),
});
export const AIAnalysisSchema = z.object({
  documentId: z.string().uuid(),
  analysisType: z.enum(['summary', 'entities', 'risk', 'recommendations', 'precedents', 'compliance']),
  options: z
    .object({
      model: z.string().default('gemma3-legal:latest'),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().min(100).max(8000).default(2000),
      includeConfidence: z.boolean().default(true),
      generateCitations: z.boolean().default(true),
    })
    .optional()
    .default({
      model: 'gemma3-legal:latest',
      temperature: 0.7,
      maxTokens: 2000,
      includeConfidence: true,
      generateCitations: true,
    }),
});
// ============================================================================
// TYPE DEFINITIONS FOR API & CONTEXTS
// ============================================================================
// Placeholder for API response for an uploaded file
export interface UploadedFile {
  id: string;
  filename: string;
  url: string;
  [key: string]: unknown;
}
// Placeholder for AI processing results
export interface AIResults {
  summary?: string;
  entities?: { type: string; value: string }[];
  riskAssessment?: { level: 'low' | 'medium' | 'high'; details: string };
  [key:string]: unknown;
}
// Placeholder for a created case from the API
export interface CreatedCase extends z.infer<typeof CaseCreationSchema> {
  id: string;
  createdAt: string;
  updatedAt: string;
}
// Placeholder for a search result item
export interface SearchResult {
  id: string;
  title: string;
  documentType: string;
  snippet: string;
  score: number;
  [key: string]: unknown;
}
// Placeholder for AI analysis results
export interface AIAnalysisResult {
  summary?: string;
  entities?: { type: string; value: string }[];
  risk?: { level: string; details: string };
  recommendations?: string[];
  [key: string]: unknown;
}
// ============================================================================
// STATE MACHINE CONTEXTS
// ============================================================================
export interface DocumentUploadContext {
  formData: z.infer<typeof DocumentUploadSchema> | null;
  validationErrors: Record<string, string[]>;
  uploadProgress: number;
  uploadedFile: UploadedFile | null;
  processingProgress: number;
  aiResults: AIResults | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
}
export interface CaseCreationContext {
  formData: z.infer<typeof CaseCreationSchema> | null;
  validationErrors: Record<string, string[]>;
  createdCase: CreatedCase | null;
  relatedDocuments: UploadedFile[];
  error: string | null;
  isAutoSaving: boolean;
  lastSaved: Date | null;
}
export interface SearchContext {
  query: z.infer<typeof SearchQuerySchema> | null;
  results: SearchResult[];
  validationErrors: Record<string, string[]>;
  isSearching: boolean;
  searchHistory: string[];
  filters: z.infer<typeof SearchQuerySchema>['filters'];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  analytics: {
    searchTime: number;
    resultCount: number;
    cacheHit: boolean;
  } | null;
  error: string | null;
}
export interface AIAnalysisContext {
  analysisData: z.infer<typeof AIAnalysisSchema> | null;
  validationErrors: Record<string, string[]>;
  analysisResults: AIAnalysisResult | null;
  confidence: number;
  processingTime: number;
  tokensUsed: number;
  model: string;
  error: string | null;
  isStreaming: boolean;
  streamedContent: string;
}
// ============================================================================
// DOCUMENT UPLOAD STATE MACHINE
// ============================================================================
type DocumentUploadEvent =
  | { type: 'VALIDATE_FORM'; data: z.infer<typeof DocumentUploadSchema> }
  | { type: 'RESET' }
  | { type: 'UPLOAD' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'RETRY' }
  | { type: 'PROCESSING_PROGRESS'; progress: number }
  | { type: 'SKIP_PROCESSING' }
  | { type: 'NEW_UPLOAD' };

export const documentUploadMachine = createMachine(
  {
    id: 'documentUpload',
    initial: 'idle',
    context: {
      formData: null,
      validationErrors: {},
      uploadProgress: 0,
      uploadedFile: null,
      processingProgress: 0,
      aiResults: null,
      error: null,
      retryCount: 0,
      maxRetries: 3,
    },
    states: {
      idle: {
        on: {
          VALIDATE_FORM: {
            target: 'validating',
            actions: assign({
              // Use DocumentUploadEvent type for event to ensure correct context assignment and avoid 'any'
              formData: (_ctx, event: { type: 'VALIDATE_FORM'; data: z.infer<typeof DocumentUploadSchema> }) =>
                (event.data ?? null) as z.infer<typeof DocumentUploadSchema> | null,
            }),
          },
        },
      },
      validating: {
        invoke: {
          id: 'validateDocumentForm',
          src: 'validateDocumentForm',
          input: ({ context }) => context.formData,
          onDone: {
            target: 'valid',
            actions: assign({
              validationErrors: () => ({}),
            }),
          },
          onError: {
            target: 'invalid',
              // Map Zod field errors from the event to the validationErrors context property.
              // The event.data is expected to be a Record<string, string[]> produced by ZodError.flatten().fieldErrors.
              validationErrors: (_ctx, event: { data?: Record<string, string[]> }) =>
                (event?.data ?? {}) as Record<string, string[]>,
              validationErrors: (_ctx, event: any) => (event?.data ?? {}) as Record<string, string[]>,
            }),
          },
        },
      },
      invalid: {
        on: {
          VALIDATE_FORM: {
            target: 'validating',
            actions: assign({
              formData: (_ctx, event: any) => ((event && event.data) ?? null) as z.infer<typeof DocumentUploadSchema> | null,
            }),
          },
          RESET: 'idle',
        },
      },
      valid: {
        on: {
          UPLOAD: 'uploading',
          VALIDATE_FORM: {
            target: 'validating',
            actions: assign({
              formData: (_ctx, event: any) => ((event && event.data) ?? null) as z.infer<typeof DocumentUploadSchema> | null,
            }),
          },
        },
      },
      uploading: {
        invoke: {
          id: 'uploadDocument',
          src: 'uploadDocument',
          input: ({ context }: { context: DocumentUploadContext }) => context.formData,
          onDone: {
            target: 'uploaded',
            actions: assign({
              uploadedFile: (_ctx, event: any) => ((event && event.output) ?? null) as UploadedFile | null,
              uploadProgress: () => 100,
            }),
          },
          onError: {
            target: 'uploadError',
            actions: assign({
              error: (_ctx, event: any) => (event?.data?.message ?? String(event?.data ?? 'Upload error')) as string,
            }),
          },
        },
        on: {
          UPLOAD_PROGRESS: {
            actions: assign({
              uploadProgress: (_ctx, event: any) => (event?.progress ?? 0) as number,
            }),
          },
        },
      },
      uploaded: {
        always: [
          {
            // explicitly type ctx to avoid implicit any
            target: 'processing',
            cond: (ctx: DocumentUploadContext) =>
              !!ctx.formData?.aiProcessing &&
              (ctx.formData.aiProcessing.generateSummary ||
                ctx.formData.aiProcessing.extractEntities ||
                ctx.formData.aiProcessing.riskAssessment),
          },
          { target: 'completed' },
        ],
      },
      processing: {
        invoke: {
          id: 'processDocument',
          src: 'processDocument',
          input: ({ context }: { context: DocumentUploadContext }) => ({
            // make optional inputs explicit so the actor receives a defined shape
            documentId: context.uploadedFile?.id ?? undefined,
            options: context.formData?.aiProcessing ?? undefined,
          }),
          onDone: {
            target: 'completed',
            actions: assign({
              aiResults: (_ctx, event: any) => ((event && event.output && event.output.results) ?? null) as AIResults | null,
              processingProgress: () => 100,
            }),
          },
          onError: {
            target: 'processingError',
            actions: assign({
              error: (_ctx, event: any) =>
                (event?.data?.message ?? String(event?.data ?? 'Processing error')) as string,
            }),
          },
        },
        on: {
          PROCESSING_PROGRESS: {
            actions: assign({
              processingProgress: (_ctx, event: any) => (event?.progress ?? 0) as number,
            }),
          },
        },
      },
      uploadError: {
        on: {
          RETRY: [
            {
              // use functional assign to ensure correct typing for ctx modifications (see retry logic)
              actions: assign((ctx: DocumentUploadContext, _event) => ({
                retryCount: ctx.retryCount + 1,
                error: null,
              })),
                retryCount: ctx.retryCount + 1,
                error: null,
              })),
            },
            { target: 'failed' },
          ],
          RESET: 'idle',
        },
      },
      processingError: {
        on: {
          RETRY: [
            {
              target: 'processing',
              cond: (ctx: DocumentUploadContext) => ctx.retryCount < ctx.maxRetries,
              actions: assign((ctx: DocumentUploadContext) => ({
                retryCount: ctx.retryCount + 1,
                error: null,
              })),
            },
            { target: 'failed' },
          ],
          SKIP_PROCESSING: 'completed',
          RESET: 'idle',
        },
      },
      completed: {
        on: {
          RESET: 'idle',
          NEW_UPLOAD: 'idle',
        },
      },
      failed: {
        on: {
          RESET: 'idle',
        },
      },
    },
  },
  {
    actors: {
      /**
       * Validates document upload form data.
       * @param input {z.infer<typeof DocumentUploadSchema>} - The form data to validate.
       * @returns {true} if valid, otherwise throws field errors as Record<string, string[]>.
       */
      validateDocumentForm: fromPromise(async ({ input }) => {
        try {
          DocumentUploadSchema.parse(input);
          return true;
        } catch (error) {
          if (error instanceof z.ZodError) {
            // throw field errors so onError can map them
      uploadDocument: fromPromise(async ({ input }) => {
        // Mock upload implementation
        // TODO: Integrate with actual backend or use productionServiceClient as per project conventions
        const formData = new FormData();
        Object.entries(input || {}).forEach(([key, value]) => {
          if (key === 'file' && value instanceof File) {
            formData.append('file', value);
          } else if (typeof value === 'object' && value !== null) {
            formData.append(key, JSON.stringify(value));
          } else if (value !== null && value !== undefined) {
            formData.append(key, String(value));
          }
        });
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        return await response.json();
      }),
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        return await response.json();
      }),
      processDocument: fromPromise(async ({ input }) => {
        const response = await fetch('/api/ai/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(`Processing failed: ${response.statusText}`);
        }
        return await response.json();
      }),
    },
  }
);
// ============================================================================
// CASE CREATION STATE MACHINE
// ============================================================================
type CaseCreationEvent =
  | { type: 'START_CREATION' }
  | { type: 'LOAD_DRAFT' }
  | { type: 'UPDATE_FORM'; data: z.infer<typeof CaseCreationSchema> }
  | { type: 'AUTO_SAVE' }
  | { type: 'VALIDATE' }
  | { type: 'SUBMIT' }
  | { type: 'NEW_CASE' }
  | { type: 'EDIT_CASE' };

export const caseCreationMachine = createMachine(
  {
    id: 'caseCreation',
    initial: 'idle',
    context: {
      formData: null,
      validationErrors: {},
      createdCase: null,
      relatedDocuments: [],
      error: null,
      isAutoSaving: false,
      lastSaved: null,
    },
    states: {
      idle: {
        on: {
          START_CREATION: 'creating',
          LOAD_DRAFT: 'loadingDraft',
        },
      },
      loadingDraft: {
        invoke: {
          id: 'loadDraft',
          src: 'loadDraft',
          onDone: {
            target: 'editing',
            actions: assign({
              // cast via unknown first to satisfy TS when converting event shapes
              formData: (_, event) =>
                ((event as unknown as { output?: any })?.output ?? null) as z.infer<typeof CaseCreationSchema> | null,
            }),
          },
          onError: 'creating',
        },
      },
      creating: {
        on: {
          UPDATE_FORM: {
            target: 'editing',
            actions: assign({
              formData: (_, event) =>
                ((event as unknown as { data?: z.infer<typeof CaseCreationSchema> })?.data ?? null) as z.infer<
                  typeof CaseCreationSchema
                > | null,
            }),
          },
        },
      },
      editing: {
        on: {
          UPDATE_FORM: {
            actions: assign({
              formData: (_, event) =>
                ((event as unknown as { data?: z.infer<typeof CaseCreationSchema> })?.data ?? null) as z.infer<
                  typeof CaseCreationSchema
                > | null,
            }),
          },
          AUTO_SAVE: 'autoSaving',
          VALIDATE: 'validating',
          SUBMIT: 'validating',
        },
        after: {
          5000: 'autoSaving', // Auto-save every 5 seconds
        },
      },
      autoSaving: {
        invoke: {
          id: 'autoSave',
          src: 'autoSave',
          input: ({ context }) => context.formData,
          onDone: {
            target: 'editing',
            actions: assign({
              lastSaved: () => new Date(),
              isAutoSaving: () => false,
            }),
          },
          onError: {
            target: 'editing',
            actions: assign({
              isAutoSaving: () => false,
            }),
          },
        },
        entry: assign({
          isAutoSaving: () => true,
        }),
      },
      validating: {
        invoke: {
          id: 'validateCase',
          src: 'validateCase',
          input: ({ context }) => context.formData,
          onDone: 'submitting',
          onError: {
            target: 'editing',
            actions: assign({
              validationErrors: (_, event) => {
                const error = (event as any)?.data;
                if (error && typeof error === 'object' && 'issues' in error) {
                  return (error as any).issues.reduce((acc: Record<string, string[]>, issue: any) => {
                    const field = issue.path?.[0] || 'general';
                    if (!acc[field]) acc[field] = [];
                    acc[field].push(issue.message);
                    return acc;
                  }, {});
                }
                if (error && typeof error === 'object') {
                  return error as Record<string, string[]>;
                }
                return {};
              },
            }),
          },
        },
      },
      submitting: {
        invoke: {
          id: 'createCase',
          src: 'createCase',
          input: ({ context }) => context.formData,
          onDone: {
            target: 'completed',
            actions: assign({
              createdCase: (_, event) =>
                (event as unknown as { output?: CreatedCase })?.output ?? null,
            }),
          },
          onError: {
            target: 'editing',
            actions: assign({
              error: (_, event) => {
                const err = (event as any)?.data ?? (event as any)?.data?.message ?? (event as any);
                if (err instanceof Error) return err.message;
                if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
                return 'An unknown error occurred';
              },
            }),
          },
        },
      },
      completed: {
        on: {
          NEW_CASE: 'idle',
          EDIT_CASE: 'editing',
        },
      },
    },
  },
  {
    actors: {
      loadDraft: fromPromise(async () => {
        const draft = typeof localStorage !== 'undefined' ? localStorage.getItem('case-draft') : null;
        return draft ? JSON.parse(draft) : null;
      }),
      autoSave: fromPromise(async ({ input }) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('case-draft', JSON.stringify(input));
        }
        return true;
      }),
      validateCase: fromPromise(async ({ input }) => {
        try {
          CaseCreationSchema.parse(input);
          return true;
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw error.flatten().fieldErrors;
          }
          throw error;
        }
      }),
      createCase: fromPromise(async ({ input }) => {
        const response = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(`Case creation failed: ${response.statusText}`);
        }
        return await response.json();
      }),
    },
  }
);
// ============================================================================
// SEARCH STATE MACHINE
// ============================================================================
type SearchEvent =
  | { type: 'SEARCH'; data: z.infer<typeof SearchQuerySchema> }
  | { type: 'LOAD_HISTORY' }
  | { type: 'REFINE_SEARCH' }
  | { type: 'CLEAR_RESULTS' }
  | { type: 'LOAD_MORE' }
  | { type: 'RETRY' }
  | { type: 'NEW_SEARCH' };

export const searchMachine = createMachine<SearchContext, SearchEvent>(
  {
    id: 'search',
    initial: 'idle',
    context: {
      query: null,
      results: [],
      validationErrors: {},
      isSearching: false,
      searchHistory: [],
      filters: {},
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
      },
      analytics: null,
      error: null,
    } as SearchContext,
    states: {
      idle: {
        on: {
          SEARCH: 'validating',
          LOAD_HISTORY: 'loadingHistory',
        },
      },
      loadingHistory: {
        invoke: {
          id: 'loadSearchHistory',
          src: 'loadSearchHistory',
          onDone: {
            target: 'idle',
            actions: assign<SearchContext, any>({
              searchHistory: (_, event) => (event as any)?.output ?? [],
            }),
          },
          onError: 'idle',
        },
      },
      validating: {
        invoke: {
          id: 'validateSearch',
          src: 'validateSearch',
          input: ({ context }) => context.query,
          onDone: 'searching',
          onError: {
            target: 'idle',
            actions: assign<SearchContext, any>({
              validationErrors: (_, event) => {
                const error = (event as any)?.data;
                if (error && typeof error === 'object' && 'issues' in error) {
                  return (error as any).issues.reduce((acc: Record<string, string[]>, issue: any) => {
                    const field = issue.path?.[0] || 'general';
                    if (!acc[field]) acc[field] = [];
                    acc[field].push(issue.message);
                    return acc;
                  }, {});
                }
                if (error && typeof error === 'object') return error as Record<string, string[]>;
                return {};
              },
            }),
          },
        },
      },
      searching: {
        invoke: {
          id: 'performSearch',
          src: 'performSearch',
          input: ({ context }) => context.query,
          onDone: {
            target: 'results',
            actions: assign<SearchContext, any>({
              results: (_, event) => (event as any)?.output?.results ?? [],
              analytics: (_, event) => (event as any)?.output?.analytics ?? null,
              pagination: (_, event) => (event as any)?.output?.pagination ?? { page: 1, pageSize: 20, total: 0 },
              searchHistory: (ctx, event) => {
                const outQuery = (event as any)?.output?.query ?? '';
                return [outQuery, ...ctx.searchHistory.filter((q: string) => q !== outQuery)].slice(0, 10);
              },
            }),
          },
          onError: {
            target: 'error',
            actions: assign<SearchContext, any>({
              error: (_, event) => {
                const err = (event as any)?.data ?? (event as any);
                if (err instanceof Error) return err.message;
                if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
                return String(err ?? 'Search error');
              },
            }),
          },
        },
        entry: assign<SearchContext, any>({
          isSearching: () => true,
          results: () => [],
        }),
        exit: assign<SearchContext, any>({
          isSearching: () => false,
        }),
      },
      results: {
        on: {
          SEARCH: {
            target: 'validating',
            actions: assign<SearchContext, any>({
              query: (_, event) => (event as any).data,
            }),
          },
          REFINE_SEARCH: 'validating',
          CLEAR_RESULTS: 'idle',
          LOAD_MORE: 'loadingMore',
        },
      },
      loadingMore: {
        invoke: {
          id: 'loadMoreResults',
          src: 'loadMoreResults',
          input: ({ context }) => ({
            query: context.query,
            page: context.pagination.page + 1,
          }),
          onDone: {
            target: 'results',
            actions: assign<SearchContext, any>({
              results: (ctx, event) => [...ctx.results, ...((event as any)?.output?.results ?? [])],
              pagination: (_, event) => (event as any)?.output?.pagination ?? { page: 1, pageSize: 20, total: 0 },
            }),
          },
          onError: 'results',
        },
      },
      error: {
        on: {
          RETRY: 'searching',
          NEW_SEARCH: 'idle',
        },
      },
    },
  },
  {
    actors: {
      loadSearchHistory: fromPromise(async () => {
        const history = typeof localStorage !== 'undefined' ? localStorage.getItem('search-history') : null;
        return history ? JSON.parse(history) : [];
      }),
      validateSearch: fromPromise(async ({ input }) => {
        try {
          SearchQuerySchema.parse(input);
          return true;
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw error.flatten().fieldErrors;
          }
          throw error;
        }
      }),
      performSearch: fromPromise(async ({ input }: { input: any }) => {
        const query = input?.query || '';
        const response = await fetch('/api/search/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (typeof localStorage !== 'undefined') {
          const history = JSON.parse(localStorage.getItem('search-history') || '[]');
          const updatedHistory = [query, ...history.filter((q: string) => q !== query)].slice(0, 10);
          localStorage.setItem('search-history', JSON.stringify(updatedHistory));
        }
        return data;
      }),
      loadMoreResults: fromPromise(async ({ input }: { input: any }) => {
        const query = input?.query || {};
        const page = input?.page || 1;
        const response = await fetch('/api/search/vector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...query,
            pagination: { page },
          }),
        });
        if (!response.ok) {
          throw new Error(`Load more failed: ${response.statusText}`);
        }
        return await response.json();
      }),
    },
  }
);
// ============================================================================
// AI ANALYSIS STATE MACHINE
// ============================================================================
type AIAnalysisEvent =
  | { type: 'START_ANALYSIS'; data: z.infer<typeof AIAnalysisSchema> }
  | { type: 'STREAM_CONTENT'; content: string }
  | { type: 'NEW_ANALYSIS' }
  | { type: 'RETRY_ANALYSIS' }
  | { type: 'RETRY' };

export const aiAnalysisMachine = createMachine<AIAnalysisContext, AIAnalysisEvent>(
  {
    id: 'aiAnalysis',
    initial: 'idle',
    context: {
      analysisData: null,
      validationErrors: {},
      analysisResults: null,
      confidence: 0,
      processingTime: 0,
      tokensUsed: 0,
      model: 'gemma3-legal:latest',
      error: null,
      isStreaming: false,
      streamedContent: '',
    } as AIAnalysisContext,
    states: {
      idle: {
        on: {
          START_ANALYSIS: {
            target: 'validating',
            actions: assign<AIAnalysisContext, any>({
              analysisData: (_, event) => (event as any)?.data ?? null,
            }),
          },
        },
      },
      validating: {
        invoke: {
          id: 'validateAnalysis',
          src: 'validateAnalysis',
          input: ({ context }) => context.analysisData,
          onDone: 'analyzing',
          onError: {
            target: 'idle',
            actions: assign<AIAnalysisContext, any>({
              validationErrors: (_, event) => {
                const error = (event as any)?.data;
                if (error && typeof error === 'object' && 'issues' in error) {
                  return (error as any).issues.reduce((acc: Record<string, string[]>, issue: any) => {
                    const field = issue.path?.[0] || 'general';
                    if (!acc[field]) acc[field] = [];
                    acc[field].push(issue.message);
                    return acc;
                  }, {});
                }
                if (error && typeof error === 'object') return error as Record<string, string[]>;
                return {};
              },
            }),
          },
        },
      },
      analyzing: {
        invoke: {
          id: 'performAnalysis',
          src: 'performAnalysis',
          input: ({ context }) => context.analysisData,
          onDone: {
            target: 'completed',
            actions: assign<AIAnalysisContext, any>({
              analysisResults: (_, event) => (event as any)?.output?.results ?? null,
              confidence: (_, event) => (event as any)?.output?.confidence ?? 0,
              processingTime: (_, event) => (event as any)?.output?.processingTime ?? 0,
              tokensUsed: (_, event) => (event as any)?.output?.tokensUsed ?? 0,
            }),
          },
          onError: {
            target: 'error',
            actions: assign<AIAnalysisContext, any>({
              error: (_, event) => {
                const err = (event as any)?.data ?? (event as any);
                if (err instanceof Error) return err.message;
                if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
                return 'Analysis failed with an unknown error';
              },
            }),
          },
        },
        on: {
          STREAM_CONTENT: {
            actions: assign<AIAnalysisContext, any>({
              streamedContent: (ctx, event) => ctx.streamedContent + ((event as any)?.content ?? ''),
              isStreaming: () => true,
            }),
          },
        },
      },
      completed: {
        on: {
          NEW_ANALYSIS: 'idle',
          RETRY_ANALYSIS: 'analyzing',
        },
      },
      error: {
        on: {
          RETRY: 'analyzing',
          NEW_ANALYSIS: 'idle',
        },
      },
    },
  },
  {
    actors: {
      validateAnalysis: fromPromise(async ({ input }) => {
        try {
          AIAnalysisSchema.parse(input);
          return true;
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw error.flatten().fieldErrors;
          }
          throw error;
        }
      }),
      performAnalysis: fromPromise(async ({ input }) => {
        const startTime = Date.now();
        const response = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.statusText}`);
        }
        const data = await response.json();
        return {
          ...data,
          processingTime: Date.now() - startTime,
        };
      }),
    },
  }
);
// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type DocumentUploadMachine = typeof documentUploadMachine;
export type CaseCreationMachine = typeof caseCreationMachine;
export type SearchMachine = typeof searchMachine;
export type AIAnalysisMachine = typeof aiAnalysisMachine;
export type DocumentUploadActor = ActorRefFrom<DocumentUploadMachine>;
export type CaseCreationActor = ActorRefFrom<CaseCreationMachine>;
export type SearchActor = ActorRefFrom<SearchMachine>;
export type AIAnalysisActor = ActorRefFrom<AIAnalysisMachine>;
export type AIAnalysisActor = ActorRefFrom<AIAnalysisMachine>;
// Schemas are already exported above where they are defined
export type SearchMachine = typeof searchMachine;
export type AIAnalysisMachine = typeof aiAnalysisMachine;
export type DocumentUploadActor = ActorRefFrom<DocumentUploadMachine>;
export type CaseCreationActor = ActorRefFrom<CaseCreationMachine>;
export type SearchActor = ActorRefFrom<SearchMachine>;
export type AIAnalysisActor = ActorRefFrom<AIAnalysisMachine>;
// Schemas are already exported above where they are defined
