// SvelteKit + xState integration for Legal AI PNG Evidence Workflow
import { createMachine, assign, interpret } from 'xstate';
import { writable, derived } from 'svelte/store';
import { PNGEmbedExtractor } from '$lib/services/png-embed-extractor';
import type { LegalAIMetadata } from '$lib/types/legal-ai-metadata';

// Evidence Processing State Machine
const evidenceProcessingMachine = createMachine({
  id: 'evidenceProcessor',
  initial: 'idle',
  context: {
    file: null as File | null,
    evidenceId: '',
    caseId: '',
    metadata: null as LegalAIMetadata | null,
    pngArtifact: null as ArrayBuffer | null,
    uploadProgress: 0,
    processingSteps: [] as string[],
    error: null as string | null,
    artifactUrl: null as string | null
  },
  states: {
    idle: {
      on: {
        START_PROCESSING: {
          target: 'validating',
          actions: assign({
            file: (_, event) => event.file,
            evidenceId: (_, event) => event.evidenceId,
            caseId: (_, event) => event.caseId,
            error: null,
            processingSteps: []
          })
        }
      }
    },
    validating: {
      invoke: {
        id: 'validateEvidence',
        src: 'validateEvidenceFile',
        onDone: {
          target: 'analyzing',
          actions: assign({
            processingSteps: (ctx) => [...ctx.processingSteps, 'File validated']
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message
          })
        }
      }
    },
    analyzing: {
      invoke: {
        id: 'analyzeEvidence',
        src: 'performAIAnalysis',
        onDone: {
          target: 'embedding',
          actions: assign({
            metadata: (_, event) => event.data,
            processingSteps: (ctx) => [...ctx.processingSteps, 'AI analysis completed']
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message
          })
        }
      }
    },
    embedding: {
      invoke: {
        id: 'embedMetadata',
        src: 'embedMetadataInPNG',
        onDone: {
          target: 'uploading',
          actions: assign({
            pngArtifact: (_, event) => event.data,
            processingSteps: (ctx) => [...ctx.processingSteps, 'Metadata embedded in PNG']
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message
          })
        }
      }
    },
    uploading: {
      invoke: {
        id: 'uploadArtifact',
        src: 'uploadToMinIOAndIndex',
        onDone: {
          target: 'completed',
          actions: assign({
            artifactUrl: (_, event) => event.data.downloadUrl,
            processingSteps: (ctx) => [...ctx.processingSteps, 'Artifact uploaded and indexed']
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: (_, event) => event.data.message
          })
        }
      }
    },
    completed: {
      on: {
        RESET: 'idle'
      }
    },
    error: {
      on: {
        RETRY: 'validating',
        RESET: 'idle'
      }
    }
  }
}, {
  services: {
    validateEvidenceFile: async (context) => {
      if (!context.file) throw new Error('No file provided');
      if (!context.evidenceId) throw new Error('Evidence ID required');
      if (!context.caseId) throw new Error('Case ID required');

      // Additional validation logic
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (context.file.size > maxSize) {
        throw new Error('File too large (max 50MB)');
      }

      return true;
    },

    performAIAnalysis: async (context) => {
      const formData = new FormData();
      formData.append('file', context.file!);
      formData.append('evidence_id', context.evidenceId);
      formData.append('case_id', context.caseId);

      const response = await fetch('/api/ai/analyze-evidence', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      return await response.json() as LegalAIMetadata;
    },

    embedMetadataInPNG: async (context) => {
      const embedder = new PNGEmbedExtractor();

      // Convert file to ArrayBuffer
      const fileBuffer = await context.file!.arrayBuffer();

      // Embed metadata
      const pngWithMetadata = await embedder.embedMetadata(fileBuffer, context.metadata!);

      return pngWithMetadata;
    },

    uploadToMinIOAndIndex: async (context) => {
      const uploadData = {
        evidence_id: context.evidenceId,
        case_id: context.caseId,
        document_type: 'evidence',
        file_data: Array.from(new Uint8Array(context.pngArtifact!)),
        metadata: {
          original_filename: context.file!.name,
          processing_timestamp: new Date().toISOString()
        },
        ai_analysis: context.metadata,
        risk_assessment: context.metadata?.riskAssessment || 'unknown',
        confidence: context.metadata?.confidence || 0.5
      };

      const response = await fetch('http://localhost:8095/api/artifacts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadData)
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    }
  }
});

// Svelte Stores for State Management
export const evidenceService = interpret(evidenceProcessingMachine);
export const currentState = writable(evidenceService.state);
export const isProcessing = derived(currentState, $state =>
  !['idle', 'completed', 'error'].includes($state.value as string)
);
export const processingProgress = derived(currentState, $state => {
  const steps = $state.context.processingSteps.length;
  const totalSteps = 5; // validate, analyze, embed, upload, complete
  return Math.round((steps / totalSteps) * 100);
});

// Start the service
evidenceService.start();
evidenceService.onTransition(state => {
  currentState.set(state);
});

// Evidence Processing Functions
export const processEvidence = (file: File, evidenceId: string, caseId: string) => {
  evidenceService.send({
    type: 'START_PROCESSING',
    file,
    evidenceId,
    caseId
  });
};

export const retryProcessing = () => {
  evidenceService.send('RETRY');
};

export const resetProcessor = () => {
  evidenceService.send('RESET');
};

// Evidence Search and Retrieval
export const searchArtifacts = async (searchParams: {
  query?: string;
  caseId?: string;
  documentType?: string;
  riskLevels?: string[];
  minConfidence?: number;
  limit?: number;
  offset?: number;
}) => {
  const response = await fetch('http://localhost:8095/api/artifacts/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(searchParams)
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return await response.json();
};

export const getArtifact = async (evidenceId: string) => {
  const response = await fetch(`http://localhost:8095/api/artifacts/${evidenceId}`);

  if (!response.ok) {
    throw new Error(`Retrieval failed: ${response.statusText}`);
  }

  return await response.json();
};

// PNG Metadata Extraction (client-side)
export const extractPNGMetadata = async (file: File | ArrayBuffer): Promise<LegalAIMetadata | null> => {
  const embedder = new PNGEmbedExtractor();

  let buffer: ArrayBuffer;
  if (file instanceof File) {
    buffer = await file.arrayBuffer();
  } else {
    buffer = file;
  }

  return await embedder.extractMetadata(buffer);
};

// Utility Functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatProcessingTime = (startTime: Date): string => {
  const elapsed = Date.now() - startTime.getTime();
  if (elapsed < 1000) return `${elapsed}ms`;
  return `${(elapsed / 1000).toFixed(1)}s`;
};

// Types for component props
export interface EvidenceUploadProps {
  caseId: string;
  onUploadComplete?: (artifactUrl: string) => void;
  onError?: (error: string) => void;
  allowedTypes?: string[];
  maxFileSize?: number;
}

export interface ArtifactViewerProps {
  evidenceId: string;
  showMetadata?: boolean;
  allowDownload?: boolean;
  onMetadataExtracted?: (metadata: LegalAIMetadata) => void;
}

export interface SearchResultsProps {
  searchResults: any[];
  loading?: boolean;
  onArtifactSelect?: (artifact: any) => void;
  onViewDetails?: (evidenceId: string) => void;
}
