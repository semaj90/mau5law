/**
 * XState v5 Ingestion Workflow Machine
 * Orchestrates document processing: upload → chunk → embed → store → cache
 * Integrates with RabbitMQ, LokiJS, and Drizzle ORM
 */

import { setup, assign, createActor, fromPromise, sendTo } from 'xstate';
import { getEmbeddingViaGate } from '$lib/server/embedding-gateway.js';
import { cache } from '$lib/server/cache/redis.js';

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
  metadata: Record<string, any>;
}

export interface IngestionJob {
  id: string;
  documentId: string;
  chunks: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    caseId?: string;
    userId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    confidenceThreshold?: number;
  };
  state: 'queued' | 'processing' | 'chunking' | 'embedding' | 'storing' | 'caching' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  results?: {
    embeddedChunks: number;
    totalChunks: number;
    averageConfidence: number;
    processingTime: number;
    similarDocuments?: Array<{ id: string; similarity: number }>;
  };
}

export interface IngestionContext {
  // Current job
  currentJob: IngestionJob | null;
  
  // Job queue management
  jobQueue: IngestionJob[];
  completedJobs: IngestionJob[];
  failedJobs: IngestionJob[];
  
  // Processing state
  currentChunk: number;
  processedChunks: DocumentChunk[];
  
  // Performance metrics
  stats: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    totalEmbeddings: number;
    cacheHitRate: number;
  };
  
  // Worker configuration
  concurrency: number;
  batchSize: number;
  
  // Error handling
  error: string | null;
  isRetrying: boolean;
}

export type IngestionEvent =
  | { type: 'QUEUE_JOB'; job: IngestionJob }
  | { type: 'PROCESS_NEXT_JOB' }
  | { type: 'RETRY_FAILED_JOB'; jobId: string }
  | { type: 'CANCEL_JOB'; jobId: string }
  | { type: 'UPDATE_PROGRESS'; progress: number }
  | { type: 'CHUNK_COMPLETED'; chunk: DocumentChunk }
  | { type: 'JOB_COMPLETED'; results: any }
  | { type: 'JOB_FAILED'; error: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'PAUSE_PROCESSING' }
  | { type: 'RESUME_PROCESSING' }
  | { type: 'SET_CONCURRENCY'; concurrency: number }
  | { type: 'RESET_STATS' };

const initialContext: IngestionContext = {
  currentJob: null,
  jobQueue: [],
  completedJobs: [],
  failedJobs: [],
  currentChunk: 0,
  processedChunks: [],
  stats: {
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    totalEmbeddings: 0,
    cacheHitRate: 0
  },
  concurrency: 3,
  batchSize: 10,
  error: null,
  isRetrying: false
};

export const ingestionWorkflowMachine = setup({
  types: {} as {
    context: IngestionContext;
    events: IngestionEvent;
  },
  actions: {
    // Job queue management
    queueJob: assign({
      jobQueue: ({ context, event }) => {
        const job = (event as any).job;
        job.state = 'queued';
        return [...context.jobQueue, job];
      },
      stats: ({ context }) => ({
        ...context.stats,
        totalJobs: context.stats.totalJobs + 1
      })
    }),
    
    setCurrentJob: assign({
      currentJob: ({ context }) => context.jobQueue[0] || null,
      jobQueue: ({ context }) => context.jobQueue.slice(1),
      currentChunk: () => 0,
      processedChunks: () => []
    }),
    
    updateJobProgress: assign({
      currentJob: ({ context, event }) => {
        if (!context.currentJob) return null;
        return {
          ...context.currentJob,
          progress: (event as any).progress || context.currentJob.progress,
          state: (event as any).state || context.currentJob.state
        };
      }
    }),
    
    completeJob: assign({
      currentJob: ({ context, event }) => {
        if (!context.currentJob) return null;
        return {
          ...context.currentJob,
          state: 'completed' as const,
          progress: 100,
          completedAt: new Date().toISOString(),
          results: (event as any).results
        };
      },
      completedJobs: ({ context }) => {
        return context.currentJob ? [...context.completedJobs, context.currentJob] : context.completedJobs;
      },
      stats: ({ context }) => ({
        ...context.stats,
        completedJobs: context.stats.completedJobs + 1,
        totalEmbeddings: context.stats.totalEmbeddings + (context.processedChunks.length || 0)
      })
    }),
    
    failJob: assign({
      currentJob: ({ context, event }) => {
        if (!context.currentJob) return null;
        return {
          ...context.currentJob,
          state: 'failed' as const,
          error: (event as any).error || 'Processing failed',
          completedAt: new Date().toISOString()
        };
      },
      failedJobs: ({ context }) => {
        return context.currentJob ? [...context.failedJobs, context.currentJob] : context.failedJobs;
      },
      stats: ({ context }) => ({
        ...context.stats,
        failedJobs: context.stats.failedJobs + 1
      }),
      error: ({ event }) => (event as any).error || 'Job failed'
    }),
    
    addProcessedChunk: assign({
      processedChunks: ({ context, event }) => [...context.processedChunks, (event as any).chunk],
      currentChunk: ({ context }) => context.currentChunk + 1
    }),
    
    updateStats: assign({
      stats: ({ context, event }) => ({
        ...context.stats,
        ...(event as any).stats
      })
    }),
    
    setConcurrency: assign({
      concurrency: ({ event }) => (event as any).concurrency
    }),
    
    clearError: assign({
      error: () => null,
      isRetrying: () => false
    }),
    
    setRetrying: assign({
      isRetrying: () => true
    })
  },
  
  actors: {
    // Main job processing orchestrator
    processJob: fromPromise(async ({ input }: { input: any }) => {
      const { job } = input;
      console.log(`🚀 Starting job processing: ${job.id}`);
      
      const startTime = Date.now();
      const chunks: DocumentChunk[] = [];
      
      // Process chunks in batches for better performance
      const batchSize = input.batchSize || 5;
      for (let i = 0; i < job.chunks.length; i += batchSize) {
        const batch = job.chunks.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (text, index) => {
            const chunkId = `${job.id}_chunk_${i + index}`;
            
            // Check cache first
            const cached = await cache.get(`embedding:${chunkId}`);
            if (cached) {
              console.log(`📋 Cache hit for chunk ${chunkId}`);
              return {
                id: chunkId,
                documentId: job.documentId,
                chunkIndex: i + index,
                text,
                embedding: cached,
                metadata: {
                  ...job.metadata,
                  fromCache: true,
                  chunkId
                }
              };
            }
            
            // Generate embedding
            console.log(`🔄 Generating embedding for chunk ${chunkId}`);
            const result = await getEmbeddingViaGate(fetch, text, {
              model: process.env.EMBEDDING_MODEL
            });
            
            // Cache the embedding
            await cache.set(`embedding:${chunkId}`, result.embedding, 24 * 60 * 60); // 24h TTL
            
            return {
              id: chunkId,
              documentId: job.documentId,
              chunkIndex: i + index,
              text,
              embedding: result.embedding,
              metadata: {
                ...job.metadata,
                backend: result.backend,
                model: result.model,
                chunkId,
                confidence: Math.random() * 0.3 + 0.7 // Mock confidence score
              }
            };
          })
        );
        
        chunks.push(...batchResults);
        
        // Update progress
        const progress = Math.round(((i + batch.length) / job.chunks.length) * 100);
        console.log(`📊 Job ${job.id} progress: ${progress}%`);
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      return {
        chunks,
        processingTime,
        totalChunks: chunks.length,
        embeddedChunks: chunks.filter(c => c.embedding?.length > 0).length,
        averageConfidence: chunks.reduce((sum, c) => sum + (c.metadata.confidence || 0), 0) / chunks.length
      };
    }),
    
    // Store processed chunks in database using Drizzle ORM
    storeChunks: fromPromise(async ({ input }: { input: any }) => {
      const { chunks, jobId } = input;
      
      console.log(`💾 Storing ${chunks.length} chunks for job ${jobId}`);
      
      try {
        // This would use Drizzle ORM to store in PostgreSQL
        const response = await fetch('/api/documents/chunks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chunks: chunks.map((chunk: DocumentChunk) => ({
              document_id: chunk.documentId,
              chunk_index: chunk.chunkIndex,
              chunk_text: chunk.text,
              embedding: chunk.embedding,
              metadata: chunk.metadata
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error(`Storage failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`✅ Stored ${result.inserted} chunks successfully`);
        
        return {
          stored: result.inserted,
          errors: result.errors || []
        };
      } catch (error) {
        console.error(`❌ Storage failed for job ${jobId}:`, error);
        throw error;
      }
    }),
    
    // Send job to RabbitMQ for reliable processing
    publishToQueue: fromPromise(async ({ input }: { input: any }) => {
      const { job } = input;
      
      try {
        // Try RabbitMQ first
        const { publishToQueue } = await import('$lib/server/rabbitmq.js');
        await publishToQueue('ingestion.jobs', {
          ...job,
          queuedAt: new Date().toISOString()
        });
        
        console.log(`📤 Published job ${job.id} to RabbitMQ`);
        return { backend: 'rabbitmq', jobId: job.id };
      } catch (error) {
        console.warn('RabbitMQ unavailable, using Redis fallback:', error);
        
        // Fallback to Redis
        await cache.rpush('ingestion:jobs', JSON.stringify({
          ...job,
          queuedAt: new Date().toISOString()
        }));
        
        console.log(`📤 Published job ${job.id} to Redis`);
        return { backend: 'redis', jobId: job.id };
      }
    }),
    
    // Find similar documents for the processed job
    findSimilarDocuments: fromPromise(async ({ input }: { input: any }) => {
      const { chunks } = input;
      
      if (!chunks.length) return [];
      
      // Use the first chunk's embedding for similarity search
      const queryEmbedding = chunks[0].embedding;
      if (!queryEmbedding) return [];
      
      try {
        const response = await fetch('/api/ai/vector-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embedding: queryEmbedding,
            limit: 5,
            threshold: 0.7
          })
        });
        
        if (!response.ok) {
          throw new Error(`Similarity search failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.results || [];
      } catch (error) {
        console.warn('Similarity search failed:', error);
        return [];
      }
    })
  },
  
  guards: {
    hasJobsInQueue: ({ context }) => context.jobQueue.length > 0,
    canRetry: ({ context }) => {
      if (!context.currentJob) return false;
      return context.currentJob.retryCount < context.currentJob.maxRetries;
    },
    isHighPriority: ({ context }) => {
      if (!context.currentJob) return false;
      return context.currentJob.metadata.priority === 'urgent' || context.currentJob.metadata.priority === 'high';
    }
  }
}).createMachine({
  id: 'ingestionWorkflow',
  initial: 'idle',
  context: initialContext,
  
  states: {
    idle: {
      on: {
        QUEUE_JOB: {
          target: 'checkingQueue',
          actions: 'queueJob'
        },
        PROCESS_NEXT_JOB: {
          target: 'checkingQueue',
          guard: 'hasJobsInQueue'
        },
        SET_CONCURRENCY: {
          actions: 'setConcurrency'
        },
        CLEAR_COMPLETED: {
          actions: assign({
            completedJobs: () => [],
            failedJobs: () => []
          })
        },
        RESET_STATS: {
          actions: assign({
            stats: () => initialContext.stats
          })
        }
      }
    },
    
    checkingQueue: {
      always: [
        {
          target: 'processingJob',
          guard: 'hasJobsInQueue',
          actions: 'setCurrentJob'
        },
        {
          target: 'idle'
        }
      ]
    },
    
    processingJob: {
      initial: 'publishing',
      entry: assign({
        currentJob: ({ context }) => context.currentJob ? {
          ...context.currentJob,
          state: 'processing' as const,
          startedAt: new Date().toISOString()
        } : null
      }),
      
      states: {
        publishing: {
          invoke: {
            src: 'publishToQueue',
            input: ({ context }) => ({ job: context.currentJob }),
            onDone: {
              target: 'chunking',
              actions: assign({
                currentJob: ({ context, event }) => context.currentJob ? {
                  ...context.currentJob,
                  metadata: {
                    ...context.currentJob.metadata,
                    queueBackend: (event as any).output.backend
                  }
                } : null
              })
            },
            onError: {
              target: 'processing',
              actions: assign({
                currentJob: ({ context }) => context.currentJob ? {
                  ...context.currentJob,
                  metadata: {
                    ...context.currentJob.metadata,
                    queueBackend: 'direct'
                  }
                } : null
              })
            }
          }
        },
        
        processing: {
          invoke: {
            src: 'processJob',
            input: ({ context }) => ({ 
              job: context.currentJob,
              batchSize: context.batchSize
            }),
            onDone: {
              target: 'storing',
              actions: assign({
                processedChunks: ({ event }) => (event as any).output.chunks,
                currentJob: ({ context, event }) => context.currentJob ? {
                  ...context.currentJob,
                  state: 'storing' as const,
                  progress: 90,
                  results: {
                    embeddedChunks: (event as any).output.embeddedChunks,
                    totalChunks: (event as any).output.totalChunks,
                    averageConfidence: (event as any).output.averageConfidence,
                    processingTime: (event as any).output.processingTime
                  }
                } : null
              })
            },
            onError: {
              target: '#ingestionWorkflow.retrying',
              actions: 'failJob'
            }
          }
        },
        
        chunking: {
          after: {
            100: 'processing'
          },
          entry: assign({
            currentJob: ({ context }) => context.currentJob ? {
              ...context.currentJob,
              state: 'chunking' as const,
              progress: 10
            } : null
          })
        },
        
        storing: {
          invoke: {
            src: 'storeChunks',
            input: ({ context }) => ({ 
              chunks: context.processedChunks,
              jobId: context.currentJob?.id
            }),
            onDone: {
              target: 'findingSimilar',
              actions: assign({
                currentJob: ({ context }) => context.currentJob ? {
                  ...context.currentJob,
                  state: 'caching' as const,
                  progress: 95
                } : null
              })
            },
            onError: {
              target: '#ingestionWorkflow.retrying',
              actions: 'failJob'
            }
          }
        },
        
        findingSimilar: {
          invoke: {
            src: 'findSimilarDocuments',
            input: ({ context }) => ({ chunks: context.processedChunks }),
            onDone: {
              target: 'completed',
              actions: assign({
                currentJob: ({ context, event }) => context.currentJob ? {
                  ...context.currentJob,
                  results: {
                    ...context.currentJob.results!,
                    similarDocuments: (event as any).output
                  }
                } : null
              })
            },
            onError: {
              target: 'completed' // Continue even if similarity search fails
            }
          }
        },
        
        completed: {
          entry: 'completeJob',
          always: {
            target: '#ingestionWorkflow.checkingQueue',
            actions: assign({
              currentJob: () => null
            })
          }
        }
      },
      
      on: {
        CANCEL_JOB: {
          target: 'idle',
          actions: assign({
            currentJob: () => null,
            jobQueue: ({ context, event }) => context.jobQueue.filter(j => j.id !== (event as any).jobId)
          })
        }
      }
    },
    
    retrying: {
      entry: 'setRetrying',
      always: [
        {
          target: 'processingJob',
          guard: 'canRetry',
          actions: [
            'clearError',
            assign({
              currentJob: ({ context }) => context.currentJob ? {
                ...context.currentJob,
                retryCount: context.currentJob.retryCount + 1,
                state: 'processing' as const
              } : null
            })
          ]
        },
        {
          target: 'checkingQueue',
          actions: [
            'failJob',
            assign({ currentJob: () => null })
          ]
        }
      ]
    },
    
    paused: {
      on: {
        RESUME_PROCESSING: 'checkingQueue',
        QUEUE_JOB: {
          actions: 'queueJob'
        }
      }
    }
  },
  
  on: {
    PAUSE_PROCESSING: {
      target: 'paused'
    }
  }
});

// Export actor
export const ingestionWorkflowActor = createActor(ingestionWorkflowMachine);

// Helper function to create and start the workflow
export function startIngestionWorkflow(options?: { concurrency?: number; batchSize?: number }) {
  const actor = createActor(ingestionWorkflowMachine);
  
  if (options?.concurrency) {
    actor.send({ type: 'SET_CONCURRENCY', concurrency: options.concurrency });
  }
  
  actor.start();
  return actor;
}

// Utility functions
export function createIngestionJob(
  documentId: string,
  chunks: string[],
  metadata: Partial<IngestionJob['metadata']>
): IngestionJob {
  return {
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    documentId,
    chunks,
    metadata: {
      fileName: metadata.fileName || 'unknown',
      fileSize: metadata.fileSize || 0,
      mimeType: metadata.mimeType || 'text/plain',
      userId: metadata.userId || 'anonymous',
      priority: metadata.priority || 'medium',
      tags: metadata.tags || [],
      confidenceThreshold: metadata.confidenceThreshold || 0.7,
      ...metadata
    },
    state: 'queued',
    progress: 0,
    retryCount: 0,
    maxRetries: 3
  };
}

export default ingestionWorkflowMachine;