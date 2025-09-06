// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/svelte';
import AIAssistantMachine from './AIAssistantMachineComponent.svelte';

// NOTE: Typing loosened due to Storybook + Svelte 5 (runes) inference friction; casting to any to avoid blocking TS errors.
const meta: any = {
  title: 'XState/AI Assistant Machine',
  // @ts-expect-error Svelte 5 component typing mismatch with Storybook inferred component type
  component: AIAssistantMachine,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Enterprise-grade XState 5 AI Assistant Machine with full-stack legal AI integration, multi-protocol service support, and real-time capabilities'
      }
    }
  },
  tags: ['autodocs'],
  // Cast argTypes to any to suppress prop name validation (alignment not critical for current story functionality)
  argTypes: {
    initialContext: {
      control: 'object',
      description: 'Initial context for the AI Assistant Machine',
      table: {
        type: { summary: 'AIAssistantContext' },
        defaultValue: { summary: 'Default idle state context' }
      }
    },
    enableStreamingMode: {
      control: 'boolean',
      description: 'Enable real-time streaming responses',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' }
      }
    },
    preferredProtocol: {
      control: 'select',
      options: ['http', 'grpc', 'quic', 'websocket'],
      description: 'Preferred communication protocol for AI services',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'http' }
      }
    }
  } as any
};

export default meta as Meta;
type Story = StoryObj<any>;

// Default idle state - ready for interaction
export const Default: Story = {
  args: {
    initialContext: {
      currentQuery: '',
      response: '',
      conversationHistory: [],
      sessionId: 'story-default-session',
      isProcessing: false,
      model: 'gemma3-legal',
      temperature: 0.7,
      maxTokens: 2048,
      availableModels: [
        { name: 'gemma3-legal', displayName: 'Gemma 3 Legal', capabilities: ['text', 'legal'] },
        { name: 'nomic-embed-text', displayName: 'Nomic Embeddings', capabilities: ['embeddings'] }
      ],
      modelLoadBalancing: false,
      databaseConnected: true,
      vectorSearchEnabled: true,
      databasePerformance: {
        queryLatency: 45,
        connectionPool: 8,
        cacheHitRatio: 0.85
      },
      vectorIndexStatus: {
        totalVectors: 15432,
        indexHealth: 'excellent',
        lastUpdated: new Date().toISOString()
      },
      context7Available: true,
      context7Cache: new Map(),
      currentDocuments: [],
      currentImages: [],
      processingQueue: [],
      gpuProcessingEnabled: true,
      serviceHealth: {
        overallHealth: 'excellent',
        services: {
          'enhanced-rag': { status: 'healthy', latency: 25 },
          'upload-service': { status: 'healthy', latency: 15 },
          'vector-service': { status: 'healthy', latency: 35 }
        }
      },
      preferredProtocol: 'http',
      activeProtocol: 'http',
      serviceLoadBalancer: {
        strategy: 'round_robin',
        currentIndex: 0
      },
      circuitBreakers: new Map(),
      natsConnected: true,
      activeStreaming: false,
      streamBuffer: '',
      collaborationUsers: []
    },
    enableStreamingMode: false,
    preferredProtocol: 'http'
  }
};

// Processing state with AI interaction
export const Processing: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Analyze the contractual obligations in this employment agreement',
      isProcessing: true,
      response: 'Analyzing legal document... Please wait.',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'Analyze the contractual obligations in this employment agreement',
          timestamp: new Date(Date.now() - 5000)
        }
      ],
      processingQueue: [
        {
          id: 'job-1',
          type: 'legal_analysis',
          status: 'processing',
          progress: 0.65
        }
      ],
      activeStreaming: false,
      streamBuffer: 'Analyzing legal document structure...'
    },
    enableStreamingMode: false,
    preferredProtocol: 'http'
  },
  parameters: {
    docs: {
      description: {
        story: 'AI Assistant in processing state - actively analyzing legal documents'
      }
    }
  }
};

// Streaming mode with real-time responses
export const StreamingMode: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'What are the key provisions in this merger agreement?',
      isProcessing: true,
      response: 'Based on my analysis of the merger agreement, I can identify several key provisions:\n\n1. **Purchase Price and Payment Terms**: The agreement specifies...',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'What are the key provisions in this merger agreement?',
          timestamp: new Date(Date.now() - 10000)
        }
      ],
      activeStreaming: true,
      streamBuffer: 'Based on my analysis of the merger agreement, I can identify several key provisions:\n\n1. **Purchase Price and Payment Terms**: The agreement specifies a total consideration of $50M, payable in cash and stock...\n\n2. **Representations and Warranties**: Both parties have made extensive representations covering...',
      preferredProtocol: 'websocket',
      activeProtocol: 'websocket',
      collaborationUsers: [
        {
          id: 'user-1',
          name: 'Sarah Chen',
          role: 'Senior Attorney',
          status: 'active'
        }
      ]
    },
    enableStreamingMode: true,
    preferredProtocol: 'websocket'
  },
  parameters: {
    docs: {
      description: {
        story: 'Streaming mode with real-time AI response generation and WebSocket communication'
      }
    }
  }
};

// Multi-document analysis scenario
export const MultiDocumentAnalysis: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Compare these three contracts for common risk factors',
      isProcessing: true,
      response: 'Comparing 3 contracts for risk analysis...',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'Compare these three contracts for common risk factors',
          timestamp: new Date(Date.now() - 15000)
        }
      ],
      currentDocuments: [
        {
          id: 'doc-1',
          filename: 'Service_Agreement_2024.pdf',
          title: 'Service Agreement 2024',
          fileSize: 245760,
          extractedText: '',
          isIndexed: false,
          // additional metadata omitted for story simplicity
        },
        {
          id: 'doc-2',
          filename: 'Employment_Contract_Manager.pdf',
          title: 'Employment Contract Manager',
          fileSize: 189440,
          extractedText: '',
          isIndexed: false,
          // analysis pending
        },
        {
          id: 'doc-3',
          filename: 'NDA_Template_2024.pdf',
          title: 'NDA Template 2024',
          fileSize: 156672,
          extractedText: '',
          isIndexed: false,
          // queued for analysis
        }
      ],
      processingQueue: [
        {
          id: 'compare-job',
          type: 'multi_document_analysis',
          status: 'processing',
          progress: 0.45,
          documentsCount: 3
        }
      ],
      vectorSearchEnabled: true,
      vectorIndexStatus: {
        totalVectors: 23890,
        indexHealth: 'excellent',
        lastUpdated: new Date().toISOString()
      }
    },
    enableStreamingMode: false,
    preferredProtocol: 'grpc'
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-document analysis with vector search and comparative risk assessment'
      }
    }
  }
};

// High-performance QUIC protocol scenario
export const HighPerformanceMode: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Perform deep semantic analysis on this 500-page legal brief',
      isProcessing: true,
      response: '',
      modelLoadBalancing: true,
      availableModels: [
        { name: 'gemma3-legal', displayName: 'Gemma 3 Legal', capabilities: ['text', 'legal'], status: 'active' },
        { name: 'gemma3-legal-backup', displayName: 'Gemma 3 Legal Backup', capabilities: ['text', 'legal'], status: 'active' },
        { name: 'nomic-embed-text', displayName: 'Nomic Embeddings', capabilities: ['embeddings'], status: 'active' }
      ],
      preferredProtocol: 'quic',
      activeProtocol: 'quic',
      serviceHealth: {
        overallHealth: 'excellent',
        services: {
          'enhanced-rag': { status: 'healthy', latency: 5 },
          'vector-service': { status: 'healthy', latency: 12 },
          'gpu-compute': { status: 'healthy', latency: 8 }
        }
      },
      serviceLoadBalancer: {
        strategy: 'least_latency',
        currentIndex: 0
      },
      gpuProcessingEnabled: true,
      processingQueue: [
        {
          id: 'deep-analysis',
          type: 'semantic_analysis',
          status: 'processing',
          progress: 0.23,
          estimatedTimeRemaining: 180
        }
      ],
      databasePerformance: {
        queryLatency: 12,
        connectionPool: 16,
        cacheHitRatio: 0.94
      }
    },
    enableStreamingMode: true,
    preferredProtocol: 'quic'
  },
  parameters: {
    docs: {
      description: {
        story: 'High-performance mode using QUIC protocol with GPU acceleration and load balancing'
      }
    }
  }
};

// Error state with circuit breaker activation
export const ErrorRecovery: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Analyze this corrupted document',
      isProcessing: false,
      response: '',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'Analyze this corrupted document',
          timestamp: new Date(Date.now() - 30000)
        },
        {
          id: '2',
          type: 'system',
          content: 'Document processing failed: Unable to extract text from corrupted PDF',
          timestamp: new Date(Date.now() - 25000)
        },
        {
          id: '3',
          type: 'system',
          content: 'Attempting alternative extraction method...',
          timestamp: new Date(Date.now() - 20000)
        }
      ],
      serviceHealth: {
        overallHealth: 'degraded',
        services: {
          'enhanced-rag': { status: 'healthy', latency: 45 },
          'upload-service': { status: 'degraded', latency: 250 },
          'ocr-service': { status: 'unhealthy', latency: 0 }
        }
      },
      circuitBreakers: new Map([
        ['ocr-service', { state: 'open', failures: 5, lastFailure: Date.now() - 5000 }],
        ['upload-service', { state: 'half-open', failures: 2, lastFailure: Date.now() - 15000 }]
      ]),
      processingQueue: [
        {
          id: 'retry-job',
          type: 'document_recovery',
          status: 'waiting',
          progress: 0,
          retryCount: 2
        }
      ]
    },
    enableStreamingMode: false,
    preferredProtocol: 'http'
  },
  parameters: {
    docs: {
      description: {
        story: 'Error recovery state with circuit breaker patterns and service degradation handling'
      }
    }
  }
};

// Collaborative session with multiple users
export const CollaborativeMode: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Draft a motion for summary judgment based on these case files',
      isProcessing: true,
      response: 'Analyzing case precedents and drafting motion...',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'Draft a motion for summary judgment based on these case files',
          timestamp: new Date(Date.now() - 120000)
        },
        {
          id: '2',
          type: 'user',
          content: 'Make sure to include the Johnson v. Smith precedent',
          timestamp: new Date(Date.now() - 90000)
        },
        {
          id: '3',
          type: 'assistant',
          content: 'I have incorporated the Johnson v. Smith precedent into the analysis...',
          timestamp: new Date(Date.now() - 60000)
        }
      ],
      natsConnected: true,
      activeStreaming: true,
      collaborationUsers: [
        {
          id: 'user-1',
          name: 'Michael Torres',
          role: 'Lead Attorney',
          status: 'active',
          lastSeen: new Date().toISOString()
        },
        {
          id: 'user-2',
          name: 'Elena Rodriguez',
          role: 'Senior Associate',
          status: 'active',
          lastSeen: new Date(Date.now() - 30000).toISOString()
        },
        {
          id: 'user-3',
          name: 'David Kim',
          role: 'Paralegal',
          status: 'idle',
          lastSeen: new Date(Date.now() - 300000).toISOString()
        }
      ],
      preferredProtocol: 'websocket',
      activeProtocol: 'websocket'
    },
    enableStreamingMode: true,
    preferredProtocol: 'websocket'
  },
  parameters: {
    docs: {
      description: {
        story: 'Collaborative mode with multiple users working together on legal document analysis'
      }
    }
  }
};

// Context7 integration showcase
export const Context7Integration: Story = {
  args: {
    initialContext: {
      ...Default.args?.initialContext,
      currentQuery: 'Help me implement a new Svelte 5 component for case management',
      isProcessing: true,
      response: 'Analyzing your SvelteKit architecture and generating Context7-compliant component...',
      conversationHistory: [
        {
          id: '1',
          type: 'user',
          content: 'Help me implement a new Svelte 5 component for case management',
          timestamp: new Date(Date.now() - 45000)
        }
      ],
      context7Available: true,
      context7Analysis: {
        framework: 'SvelteKit 2',
        version: 'Svelte 5',
        libraries: ['bits-ui', 'melt-ui', 'shadcn-svelte'],
        patterns: ['runes', 'type-safety', 'barrel-exports'],
        recommendations: [
          'Use $state() for reactive variables',
          'Implement proper TypeScript interfaces',
          'Follow Context7 component patterns'
        ]
      },
      context7Cache: new Map([
        ['svelte-5-runes', { data: 'Cached Svelte 5 documentation...', timestamp: Date.now() - 3600000 }],
        ['bits-ui-components', { data: 'Cached Bits UI patterns...', timestamp: Date.now() - 1800000 }]
      ]),
      processingQueue: [
        {
          id: 'context7-analysis',
          type: 'code_generation',
          status: 'processing',
          progress: 0.75,
          framework: 'SvelteKit'
        }
      ]
    },
    enableStreamingMode: true,
    preferredProtocol: 'http'
  },
  parameters: {
    docs: {
      description: {
        story: 'Context7 integration for intelligent code generation and framework-specific assistance'
      }
    }
  }
};