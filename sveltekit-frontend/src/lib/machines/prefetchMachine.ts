
// XState Machine for AI-Powered Intent Prediction and Prefetching
import { createMachine, assign, sendParent, fromPromise } from "xstate";

export interface PrefetchContext {
  // User behavior tracking
  userActions: Array<{
    action: string;
    timestamp: number;
    context: any;
  }>;
  
  // Intent prediction
  predictedIntent: string | null;
  confidence: number;
  
  // Prefetch state
  prefetchQueue: Array<{
    resource: string;
    priority: number;
    type: 'embedding' | 'document' | 'api' | 'route';
  }>;
  
  // Model state
  embeddings: number[][];
  modelWeights: Float32Array | null;
  
  // Performance metrics
  metrics: {
    hits: number;
    misses: number;
    avgPredictionTime: number;
    lastPredictionAccuracy: number;
  };
  
  // Current session data
  docId: string | null;
  currentRoute: string;
  viewportData: {
    width: number;
    height: number;
    scrollY: number;
  };
}

type PrefetchEvent = 
  | { type: 'USER_ACTION'; action: string; context: any }
  | { type: 'PREDICT_INTENT' }
  | { type: 'PREFETCH_RESOURCES' }
  | { type: 'UPDATE_EMBEDDINGS'; embeddings: number[][] }
  | { type: 'VIEWPORT_CHANGE'; viewport: any }
  | { type: 'ROUTE_CHANGE'; route: string }
  | { type: 'RESET_METRICS' }
  | { type: 'TRAIN_MODEL' }
  | { type: 'CACHE_HIT'; resource: string }
  | { type: 'CACHE_MISS'; resource: string };

export const prefetchMachine = createMachine({
  types: {} as {
    context: PrefetchContext;
    events: PrefetchEvent;
  },
  id: "prefetch",
  initial: "initializing",
  context: {
    userActions: [],
    predictedIntent: null,
    confidence: 0,
    prefetchQueue: [],
    embeddings: [],
    modelWeights: null,
    metrics: {
      hits: 0,
      misses: 0,
      avgPredictionTime: 0,
      lastPredictionAccuracy: 0
    },
    docId: null,
    currentRoute: '',
    viewportData: {
      width: (typeof window !== 'undefined' && window?.innerWidth) || 1920,
      height: (typeof window !== 'undefined' && window?.innerHeight) || 1080,
      scrollY: 0
    }
  },
  states: {
    initializing: {
      invoke: {
        src: 'initializePredictionModel',
        onDone: {
          target: 'idle',
          actions: assign({
            modelWeights: ({ event }) => event.type === 'xstate.done.actor.initializePredictionModel' ? (event as any).output?.weights : null,
          })
        },
        onError: 'idle'
      }
    },
    
    idle: {
      on: {
        USER_ACTION: {
          actions: [
            assign({
              userActions: ({ context, event }) => [
                ...context.userActions.slice(-19), // Keep last 20 actions
                {
                  action: (event as any).action || 'unknown',
                  timestamp: Date.now(),
                  context: (event as any).context || {}
                }
              ]
            }),
            'triggerPredictionAfterDelay'
          ]
        },
        
        PREDICT_INTENT: 'predicting',
        PREFETCH_RESOURCES: 'prefetching',
        UPDATE_EMBEDDINGS: {
          actions: assign({
            embeddings: ({ event }) => (event as any).embeddings || []
          })
        },
        
        VIEWPORT_CHANGE: {
          actions: assign({
            viewportData: ({ event }) => (event as any).viewport || { width: 1920, height: 1080, scrollY: 0 }
          })
        },
        
        ROUTE_CHANGE: {
          actions: assign({
            currentRoute: ({ event }) => (event as any).route || ''
          })
        },
        
        CACHE_HIT: {
          actions: assign({
            metrics: ({ context }) => ({
              ...context.metrics,
              hits: context.metrics.hits + 1
            })
          })
        },
        
        CACHE_MISS: {
          actions: assign({
            metrics: ({ context }) => ({
              ...context.metrics,
              misses: context.metrics.misses + 1
            })
          })
        },
        
        TRAIN_MODEL: 'training'
      }
    },
    
    predicting: {
      invoke: {
        src: 'predictUserIntent',
        onDone: {
          target: 'idle',
          actions: [
            assign({
              predictedIntent: ({ event }) => (event as any).output?.intent || null,
              confidence: ({ event }) => (event as any).output?.confidence || 0,
              prefetchQueue: ({ event }) => (event as any).output?.prefetchQueue || []
            }),
            'updatePredictionMetrics',
            sendParent(({ event }) => ({
              type: 'INTENT_PREDICTED',
              intent: (event as any).output?.intent,
              confidence: (event as any).output?.confidence
            }))
          ]
        },
        onError: {
          target: 'idle',
          actions: 'logPredictionError'
        }
      }
    },
    
    prefetching: {
      invoke: {
        src: 'prefetchResources',
        onDone: {
          target: 'idle',
          actions: 'logPrefetchSuccess'
        },
        onError: {
          target: 'idle', 
          actions: 'logPrefetchError'
        }
      }
    },
    
    training: {
      invoke: {
        src: 'trainPredictionModel',
        onDone: {
          target: 'idle',
          actions: [
            assign({
              modelWeights: ({ event }) => (event as any).output?.weights || null,
              metrics: ({ context, event }) => ({
                ...context.metrics,
                lastPredictionAccuracy: (event as any).output?.accuracy || 0
              })
            }),
            'logTrainingComplete'
          ]
        },
        onError: {
          target: 'idle',
          actions: 'logTrainingError'
        }
      }
    }
  }
}).provide({
  actions: {
    triggerPredictionAfterDelay: () => {
      // Debounce predictions to avoid excessive API calls
      setTimeout(() => {
        // This would send PREDICT_INTENT event after delay
      }, 300);
    },
    
    updatePredictionMetrics: assign({
      metrics: ({ context, event }) => {
        const predictionTime = (event as any).output?.processingTime || 0;
        return {
          ...context.metrics,
          avgPredictionTime: (context.metrics.avgPredictionTime + predictionTime) / 2
        };
      }
    }),
    
    logPredictionError: (_, event) => {
      console.error('Prediction failed:', (event as any).error);
    },
    
    logPrefetchSuccess: () => {
      console.log('Prefetch completed successfully');
    },
    
    logPrefetchError: (_, event) => {
      console.error('Prefetch failed:', (event as any).error);
    },
    
    logTrainingComplete: (_, event) => {
      console.log('Model training completed with accuracy:', (event as any).output?.accuracy);
    },
    
    logTrainingError: (_, event) => {
      console.error('Model training failed:', (event as any).error);
    }
  },
  
  actors: {
    initializePredictionModel: fromPromise(async () => {
      // Initialize neural network weights for prediction
      const weights = new Float32Array(384 * 128); // Input layer to hidden layer
      for (let i = 0; i < weights.length; i++) {
        weights[i] = (Math.random() - 0.5) * 0.1;
      }
      
      return { weights };
    }),
    
    predictUserIntent: fromPromise(async ({ input }: { input: any }) => {
      const context = input;
      const startTime = performance.now();
      
      try {
        // Analyze user behavior patterns
        const recentActions = context.userActions.slice(-5);
        const actionTypes = recentActions.map((a: any) => a.action);
        
        // Legal AI specific intent patterns
        let intent = 'unknown';
        let confidence = 0.3;
        
        if (actionTypes.includes('search') && actionTypes.includes('document_view')) {
          intent = 'research_mode';
          confidence = 0.8;
        } else if (actionTypes.includes('evidence_upload')) {
          intent = 'evidence_analysis';
          confidence = 0.9;
        } else if (actionTypes.includes('case_create')) {
          intent = 'case_management';
          confidence = 0.85;
        } else if (actionTypes.includes('ai_chat')) {
          intent = 'ai_consultation';
          confidence = 0.7;
        }
        
        // Generate prefetch queue based on intent
        const prefetchQueue = generatePrefetchQueue(intent, context);
        
        const processingTime = performance.now() - startTime;
        
        return {
          intent,
          confidence,
          prefetchQueue,
          processingTime
        };
        
      } catch (error: any) {
        throw new Error(`Prediction failed: ${error}`);
      }
    }),
    
    prefetchResources: fromPromise(async ({ input }: { input: any }) => {
      const context = input;
      const promises = context.prefetchQueue.map(async (item: any) => {
        switch (item.type) {
          case 'embedding':
            return prefetchEmbedding(item.resource);
          case 'document':
            return prefetchDocument(item.resource);
          case 'api':
            return prefetchApiData(item.resource);
          case 'route':
            return prefetchRoute(item.resource);
          default:
            return Promise.resolve();
        }
      });
      
      await Promise.allSettled(promises);
      return { success: true };
    }),
    
    trainPredictionModel: fromPromise(async ({ input }: { input: any }) => {
      const context = input;
      // Simple online learning based on user feedback
      const accuracy = Math.random() * 0.3 + 0.7; // Mock accuracy between 70-100%
      
      // Update weights based on success/failure patterns
      const newWeights = context.modelWeights ? 
        new Float32Array(context.modelWeights) : 
        new Float32Array(384 * 128);
        
      // Apply small random adjustments (in real implementation, use gradient descent)
      for (let i = 0; i < newWeights.length; i++) {
        newWeights[i] += (Math.random() - 0.5) * 0.01;
      }
      
      return { weights: newWeights, accuracy };
    })
  }
});

// Helper functions
function generatePrefetchQueue(intent: string, context: PrefetchContext) {
  const queue: any[] = [];
  
  switch (intent) {
    case 'research_mode':
      queue.push(
        { resource: 'legal-database-search', priority: 1, type: 'api' },
        { resource: 'case-law-embeddings', priority: 2, type: 'embedding' },
        { resource: '/legal/search', priority: 3, type: 'route' }
      );
      break;
      
    case 'evidence_analysis':
      queue.push(
        { resource: 'ai-analysis-models', priority: 1, type: 'api' },
        { resource: 'evidence-embeddings', priority: 2, type: 'embedding' },
        { resource: '/evidence/analysis', priority: 3, type: 'route' }
      );
      break;
      
    case 'case_management':
      queue.push(
        { resource: 'case-templates', priority: 1, type: 'document' },
        { resource: 'workflow-data', priority: 2, type: 'api' },
        { resource: '/cases/new', priority: 3, type: 'route' }
      );
      break;
      
    case 'ai_consultation':
      queue.push(
        { resource: 'llm-models', priority: 1, type: 'api' },
        { resource: 'legal-context-embeddings', priority: 2, type: 'embedding' }
      );
      break;
  }
  
  return queue;
}

async function prefetchEmbedding(resource: string): Promise<any> {
  // Call batch embedding service
  const response = await fetch('http://localhost:8081/batch-embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docId: `prefetch-${resource}`,
      chunks: [`Prefetch request for ${resource}`],
      model: 'nomic-embed-text'
    })
  });
  
  return response.ok;
}

async function prefetchDocument(resource: string): Promise<any> {
  // Prefetch document content
  console.log(`Prefetching document: ${resource}`);
  return true;
}

async function prefetchApiData(resource: string): Promise<any> {
  // Prefetch API data
  console.log(`Prefetching API data: ${resource}`);
  return true;
}

async function prefetchRoute(resource: string): Promise<any> {
  // Prefetch route data
  console.log(`Prefetching route: ${resource}`);
  return true;
}
