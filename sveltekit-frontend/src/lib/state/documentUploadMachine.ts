import crypto from "crypto";

/**
 * XState State Machine for Document Upload Workflow
 * Handles file upload, validation, processing, and search indexing
 */

import { createMachine, assign, fromPromise } from "xstate";
// TODO: Fix import - // Orphaned content: import {  import type { EvidenceProcessingContext } from './evidenceProcessingMachine';

// Types for document upload
export interface DocumentUploadContext {
  // File information
  file?: File;
  filename: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  
  // Upload details
  caseId: string;
  userId: string;
  title: string;
  description?: string;
  tags: string[];
  
  // Processing state
  uploadProgress: number;
  validationErrors: string[];
  extractedText?: string;
  documentId?: string;
  evidenceId?: string;
  
  // Child machine state
  evidenceProcessingState?: unknown;
  
  // Timestamps and metrics
  uploadStartTime: number;
  uploadEndTime?: number;
  processingStartTime?: number;
  processingEndTime?: number;
  
  // Error handling
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export type DocumentUploadEvent =
  | { type: 'SELECT_FILE'; file: File; caseId: string; userId: string; title: string; description?: string; tags?: string[] }
  | { type: 'VALIDATE_FILE' }
  | { type: 'UPLOAD_FILE' }
  | { type: 'RETRY_UPLOAD' }
  | { type: 'CANCEL_UPLOAD' }
  | { type: 'START_PROCESSING' }
  | { type: 'PROCESSING_UPDATE'; progress: number; stage: string }
  | { type: 'PROCESSING_COMPLETE' }
  | { type: 'PROCESSING_FAILED'; error: string }
  | { type: 'FORCE_COMPLETE' }
  | { type: 'RESET' };

// Configuration constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/tiff'
];

// Service implementations
const validateFileService = fromPromise(async ({ input }: { input: DocumentUploadContext }) => {
  const errors: string[] = [];
  
  if (!input.file) {
    errors.push('No file selected');
    return { valid: false, errors };
  }
  
  // Check file size
  if (input.file.size > MAX_FILE_SIZE) {
    errors.push(`File size (${Math.round(input.file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(input.file.type)) {
    errors.push(`File type '${input.file.type}' is not supported. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
  }
  
  // Check filename
  if (!input.filename || input.filename.trim().length === 0) {
    errors.push('Filename is required');
  }
  
  // Check case ID and user ID
  if (!input.caseId || !input.userId) {
    errors.push('Case ID and User ID are required');
  }
  
  // Additional security checks
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
  const hassuspicious = suspiciousExtensions.some((ext: any) => input.filename.toLowerCase().endsWith(ext)
  );
  
  if (hassuspicious) {
    errors.push('File type appears to be executable and is not allowed');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
});

const calculateFileHashService = fromPromise(async ({ input }: { input: DocumentUploadContext }) => {
  if (!input.file) {
    throw new Error('No file to hash');
  }
  
  const buffer = await input.file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b: any) => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
});

const uploadFileService = fromPromise(async ({ input }: { input: DocumentUploadContext }) => {
  if (!input.file) {
    throw new Error('No file to upload');
  }
  
  // Simulate file upload with progress (replace with actual upload logic)
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('caseId', input.caseId);
  formData.append('userId', input.userId);
  formData.append('title', input.title);
  formData.append('description', input.description || '');
  formData.append('tags', JSON.stringify(input.tags));
  formData.append('fileHash', input.fileHash || '');
  
  // This would be replaced with actual upload to your backend
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${errorText}`);
  }
  
  const result = await response.json();
  
  return {
    documentId: result.documentId,
    evidenceId: result.evidenceId,
    extractedText: result.extractedText,
    uploadTime: Date.now() - input.uploadStartTime
  };
});

const extractTextService = fromPromise(async ({ input }: { input: DocumentUploadContext }) => {
  if (!input.file) {
    throw new Error('No file to extract text from');
  }
  
  // Simple text extraction based on file type
  let extractedText = '';
  
  if (input.file.type === 'text/plain') {
    extractedText = await input.file.text();
  } else if (input.file.type === 'application/pdf') {
    // For PDF files, you would use a library like pdf-parse
    // For now, we'll simulate this
    extractedText = `[Extracted PDF content from ${input.filename}]`;
  } else if (input.file.type.startsWith('image/')) {
    // For images, you would use OCR
    extractedText = `[OCR extracted text from ${input.filename}]`;
  } else {
    // For other documents, use appropriate parsers
    extractedText = `[Extracted content from ${input.filename}]`;
  }
  
  return extractedText;
});

// Main state machine
export const documentUploadMachine = createMachine({
  id: 'documentUpload',
  types: {
    context: {} as DocumentUploadContext,
    events: {} as DocumentUploadEvent
  },
  initial: 'idle',
  context: {
    filename: '',
    fileSize: 0,
    mimeType: '',
    caseId: '',
    userId: '',
    title: '',
    tags: [],
    uploadProgress: 0,
    validationErrors: [],
    uploadStartTime: 0,
    retryCount: 0,
    maxRetries: 3
  },
  states: {
    idle: {
      on: {
        SELECT_FILE: {
          target: 'fileSelected',
          actions: assign({
            file: ({ event }) => event.file,
            filename: ({ event }) => event.file.name,
            fileSize: ({ event }) => event.file.size,
            mimeType: ({ event }) => event.file.type,
            caseId: ({ event }) => event.caseId,
            userId: ({ event }) => event.userId,
            title: ({ event }) => event.title,
            description: ({ event }) => event.description,
            tags: ({ event }) => event.tags || [],
            uploadStartTime: Date.now(),
            retryCount: 0,
            validationErrors: [],
            error: undefined
          })
        }
      }
    },

    fileSelected: {
      always: {
        target: 'validating'
      }
    },

    validating: {
      invoke: {
        src: validateFileService,
        input: ({ context }) => context,
        onDone: [
          {
            target: 'calculatingHash',
            guard: ({ event }) => event.output.valid,
            actions: assign({
              validationErrors: []
            })
          },
          {
            target: 'validationError',
            actions: assign({
              validationErrors: ({ event }) => event.output.errors
            })
          }
        ],
        onError: {
          target: 'validationError',
          actions: assign({
            error: ({ event }) => `Validation failed: ${event.error}`,
            validationErrors: ({ event }) => [`Validation error: ${event.error}`]
          })
        }
      }
    },

    validationError: {
      on: {
        SELECT_FILE: {
          target: 'fileSelected',
          actions: assign({
            file: ({ event }) => event.file,
            filename: ({ event }) => event.file.name,
            fileSize: ({ event }) => event.file.size,
            mimeType: ({ event }) => event.file.type,
            title: ({ event }) => event.title,
            description: ({ event }) => event.description,
            tags: ({ event }) => event.tags || [],
            validationErrors: [],
            error: undefined
          })
        },
        RESET: 'idle'
      }
    },

    calculatingHash: {
      invoke: {
        src: calculateFileHashService,
        input: ({ context }) => context,
        onDone: {
          target: 'extractingText',
          actions: assign({
            fileHash: ({ event }) => event.output
          })
        },
        onError: {
          target: 'uploadReady', // Continue without hash
          actions: assign({
            error: ({ event }) => `Hash calculation failed: ${event.error}`
          })
        }
      }
    },

    extractingText: {
      invoke: {
        src: extractTextService,
        input: ({ context }) => context,
        onDone: {
          target: 'uploadReady',
          actions: assign({
            extractedText: ({ event }) => event.output
          })
        },
        onError: {
          target: 'uploadReady', // Continue without extracted text
          actions: assign({
            error: ({ event }) => `Text extraction failed: ${event.error}`
          })
        }
      }
    },

    uploadReady: {
      on: {
        UPLOAD_FILE: 'uploading',
        CANCEL_UPLOAD: 'cancelled',
        SELECT_FILE: {
          target: 'fileSelected',
          actions: assign({
            file: ({ event }) => event.file,
            filename: ({ event }) => event.file.name,
            fileSize: ({ event }) => event.file.size,
            mimeType: ({ event }) => event.file.type,
            title: ({ event }) => event.title,
            description: ({ event }) => event.description,
            tags: ({ event }) => event.tags || [],
            validationErrors: [],
            error: undefined
          })
        },
        RESET: 'idle'
      }
    },

    uploading: {
      invoke: {
        src: uploadFileService,
        input: ({ context }) => context,
        onDone: {
          target: 'uploaded',
          actions: assign({
            documentId: ({ event }) => event.output.documentId,
            evidenceId: ({ event }) => event.output.evidenceId,
            extractedText: ({ event, context }) => event.output.extractedText || context.extractedText,
            uploadEndTime: Date.now(),
            uploadProgress: 100
          })
        },
        onError: {
          target: 'uploadError',
          actions: assign({
            error: ({ event }) => `Upload failed: ${event.error}`
          })
        }
      },
      on: {
        CANCEL_UPLOAD: 'cancelled'
      }
    },

    uploadError: {
      on: {
        RETRY_UPLOAD: [
          {
            target: 'uploading',
            guard: ({ context }) => context.retryCount < context.maxRetries,
            actions: assign({
              retryCount: ({ context }) => context.retryCount + 1,
              error: undefined
            })
          },
          {
            target: 'uploadFailed'
          }
        ],
        CANCEL_UPLOAD: 'cancelled',
        RESET: 'idle'
      }
    },

    uploaded: {
      always: {
        target: 'startingProcessing',
        actions: assign({
          processingStartTime: Date.now()
        })
      }
    },

    startingProcessing: {
      always: {
        target: 'processing',
        actions: assign({
          // Initialize evidence processing state
          evidenceProcessingState: ({ context }) => ({
            evidenceId: context.evidenceId!,
            caseId: context.caseId,
            userId: context.userId,
            filename: context.filename,
            content: context.extractedText || '',
            metadata: {
              title: context.title,
              description: context.description,
              tags: context.tags,
              originalFilename: context.filename,
              fileSize: context.fileSize,
              mimeType: context.mimeType,
              fileHash: context.fileHash
            }
          })
        })
      }
    },

    processing: {
      // This state would spawn the evidence processing machine as a child
      // For now, we'll simulate the processing steps
      initial: 'analyzing',
      states: {
        analyzing: {
          after: {
            2000: 'embedding'
          },
          entry: assign({
            uploadProgress: 25
          })
        },
        embedding: {
          after: {
            3000: 'indexing'
          },
          entry: assign({
            uploadProgress: 50
          })
        },
        indexing: {
          after: {
            2000: 'caching'
          },
          entry: assign({
            uploadProgress: 75
          })
        },
        caching: {
          after: {
            1000: 'done'
          },
          entry: assign({
            uploadProgress: 90
          })
        },
        done: {
          type: 'final',
          entry: assign({
            uploadProgress: 100,
            processingEndTime: Date.now()
          })
        }
      },
      onDone: 'completed',
      on: {
        PROCESSING_UPDATE: {
          actions: assign({
            uploadProgress: ({ event }) => event.progress
          })
        },
        PROCESSING_FAILED: {
          target: 'processingError',
          actions: assign({
            error: ({ event }) => event.error
          })
        },
        CANCEL_UPLOAD: 'cancelled'
      }
    },

    processingError: {
      on: {
        RETRY_UPLOAD: {
          target: 'processing',
          actions: assign({
            error: undefined,
            retryCount: ({ context }) => context.retryCount + 1
          })
        },
        FORCE_COMPLETE: 'completed',
        CANCEL_UPLOAD: 'cancelled',
        RESET: 'idle'
      }
    },

    completed: {
      type: 'final',
      entry: () => {
        console.log('Document upload and processing completed successfully');
      }
    },

    uploadFailed: {
      type: 'final',
      entry: ({ context }) => {
        console.error(`Document upload failed after ${context.retryCount} retries: ${context.error}`);
      }
    },

    cancelled: {
      type: 'final',
      entry: () => {
        console.log('Document upload cancelled by user');
      }
    }
  }
});

// Helper functions
export const createDocumentUploadActor = () => {
  return documentUploadMachine;
};

export const isUploading = (state: any): boolean => {
  return ['uploading', 'processing'].includes(state.value);
};

export const isValidating = (state: any): boolean => {
  return ['validating', 'calculatingHash', 'extractingText'].includes(state.value);
};

export const hasValidationErrors = (state: any): boolean => {
  return state.context.validationErrors && state.context.validationErrors.length > 0;
};

export const getValidationErrors = (state: any): string[] => {
  return state.context.validationErrors || [];
};

export const getUploadProgress = (state: any): number => {
  return state.context.uploadProgress || 0;
};

export const canRetryUpload = (state: any): boolean => {
  return ['uploadError', 'processingError'].includes(state.value) && 
         state.context.retryCount < state.context.maxRetries;
};

export const getUploadMetrics = (state: any) => {
  const context = state.context;
  return {
    uploadTime: context.uploadEndTime ? context.uploadEndTime - context.uploadStartTime : 0,
    processingTime: context.processingEndTime ? context.processingEndTime - context.processingStartTime! : 0,
    totalTime: context.processingEndTime ? context.processingEndTime - context.uploadStartTime : 0,
    fileSize: context.fileSize,
    filename: context.filename
  };
};

// Export types
export type DocumentUploadMachine = typeof documentUploadMachine;
export type DocumentUploadState = Parameters<typeof documentUploadMachine.transition>[0];