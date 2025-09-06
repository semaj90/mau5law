// API Service Registry and Route Mapper
// Maps all your existing API routes and provides service discovery

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export class ApiServiceRegistry {
  routes: Map<string, any>;
  services: Map<string, any>;
  healthChecks: Map<string, any>;

  constructor() {
    this.routes = new Map();
    this.services = new Map();
    this.healthChecks = new Map();
    this.initialize();
  }

  initialize() {
    // Core API routes from your sveltekit-frontend structure
    const apiRoutes = {
      // Authentication & User Management
      auth: {
        endpoints: ['/api/auth/login', '/api/auth/logout', '/api/auth/register'],
        description: 'User authentication and session management',
        required: true
      },
      users: {
        endpoints: ['/api/users', '/api/user/profile'],
        description: 'User account management',
        required: true
      },

      // Core Legal AI Features
      cases: {
        endpoints: ['/api/cases', '/api/cases/[id]', '/api/cases/search'],
        description: 'Legal case management',
        required: true
      },
      evidence: {
        endpoints: ['/api/evidence', '/api/evidence/[id]', '/api/evidence/upload'],
        description: 'Evidence handling and processing',
        required: true
      },
      citations: {
        endpoints: ['/api/citations', '/api/citations/generate'],
        description: 'Legal citation management',
        required: true
      },
      reports: {
        endpoints: ['/api/reports', '/api/reports/generate'],
        description: 'Report generation',
        required: true
      },

      // AI Services
      chat: {
        endpoints: ['/api/chat', '/api/chat/stream'],
        description: 'AI chat with Gemma3:legal',
        dependencies: ['ollama'],
        required: true
      },
      ai: {
        endpoints: ['/api/ai/analyze', '/api/ai/summarize', '/api/ai/suggest'],
        description: 'AI analysis and suggestions',
        dependencies: ['ollama'],
        required: true
      },
      embeddings: {
        endpoints: ['/api/embed', '/api/embeddings/generate'],
        description: 'Text embeddings with nomic-embed-text',
        dependencies: ['ollama'],
        required: true
      },

      // Search & Vector Operations
      search: {
        endpoints: ['/api/search', '/api/search/vector', '/api/search/similarity'],
        description: 'Vector and semantic search',
        dependencies: ['postgresql', 'qdrant'],
        required: true
      },
      vector: {
        endpoints: ['/api/vector', '/api/vectors/index'],
        description: 'Vector database operations',
        dependencies: ['qdrant', 'postgresql'],
        required: false
      },

      // Enhanced RAG System
      rag: {
        endpoints: ['/api/rag/query', '/api/rag/index', '/api/rag/status'],
        description: 'Enhanced RAG system',
        dependencies: ['enhanced_rag'],
        required: false
      },
      'enhanced-rag': {
        endpoints: ['/api/enhanced-rag', '/api/enhanced-rag/process'],
        description: 'Advanced RAG processing',
        dependencies: ['enhanced_rag'],
        required: false
      },

      // File & Document Management
      upload: {
        endpoints: ['/api/upload', '/api/upload/evidence', '/api/upload/status'],
        description: 'File upload and processing',
        dependencies: ['minio'],
        required: true
      },
      documents: {
        endpoints: ['/api/documents', '/api/documents/[id]', '/api/documents/process'],
        description: 'Document management and processing',
        required: true
      },

      // System & Administration
      health: {
        endpoints: ['/api/health', '/api/health-check'],
        description: 'System health monitoring',
        required: true
      },
      system: {
        endpoints: ['/api/system/status', '/api/system/info'],
        description: 'System information',
        required: true
      },
      metrics: {
        endpoints: ['/api/metrics'],
        description: 'Performance metrics',
        required: false
      },

      // GPU & Processing
      gpu: {
        endpoints: ['/api/gpu/status', '/api/gpu-orchestration'],
        description: 'GPU processing orchestration',
        dependencies: ['gpu_orchestrator'],
        required: false
      },
      process: {
        endpoints: ['/api/process', '/api/process-legal-document'],
        description: 'Document processing pipeline',
        required: true
      },

      // Legal Specific
      legal: {
        endpoints: ['/api/legal', '/api/legal-ai', '/api/legal-ai-integration'],
        description: 'Legal AI analysis',
        dependencies: ['ollama'],
        required: true
      },
      statutes: {
        endpoints: ['/api/statutes'],
        description: 'Legal statutes database',
        required: false
      },
      laws: {
        endpoints: ['/api/laws'],
        description: 'Legal laws database',
        required: false
      },

      // Specialized Features
      ocr: {
        endpoints: ['/api/ocr'],
        description: 'Optical Character Recognition',
        required: false
      },
      'text-to-voice': {
        endpoints: ['/api/text-to-voice', '/api/tts'],
        description: 'Text to speech conversion',
        required: false
      },
      'voice-to-text': {
        endpoints: ['/api/voice-to-text'],
        description: 'Speech to text conversion',
        required: false
      },

      // Development & Testing
      test: {
        endpoints: ['/api/test', '/api/test-simple', '/api/testing'],
        description: 'Development testing endpoints',
        required: false
      },
      debug: {
        endpoints: ['/api/debug', '/api/debug-users'],
        description: 'Debug and troubleshooting',
        required: false
      }
    };

    // Register routes
    for (const [name, config] of Object.entries(apiRoutes)) {
      this.routes.set(name, config);
    }

    // Register external services
    this.services.set('postgresql', {
      name: 'PostgreSQL',
      port: 5432,
      host: 'localhost',
      type: 'database',
      required: true,
      healthCheck: () => this.checkPort(5432)
    });

    this.services.set('redis', {
      name: 'Redis Cache',
      port: 6379,
      host: 'localhost', 
      type: 'cache',
      required: false,
      healthCheck: () => this.checkPort(6379)
    });

    this.services.set('ollama', {
      name: 'Ollama AI',
      port: 11434,
      host: 'localhost',
      type: 'ai',
      required: true,
      healthCheck: () => this.checkHttp('http://localhost:11434/api/tags')
    });

    this.services.set('qdrant', {
      name: 'Qdrant Vector DB',
      port: 6333,
      host: 'localhost',
      type: 'database',
      required: false,
      healthCheck: () => this.checkHttp('http://localhost:6333/collections')
    });

    this.services.set('minio', {
      name: 'MinIO Object Storage',
      port: 9000,
      host: 'localhost',
      type: 'storage',
      required: false,
      healthCheck: () => this.checkHttp('http://localhost:9000/minio/health/live')
    });

    this.services.set('enhanced_rag', {
      name: 'Enhanced RAG Service',
      port: 8094,
      host: 'localhost',
      type: 'microservice',
      required: false,
      healthCheck: () => this.checkHttp('http://localhost:8094/health')
    });

    this.services.set('gpu_orchestrator', {
      name: 'GPU Orchestrator',
      port: 8095,
      host: 'localhost',
      type: 'microservice',
      required: false,
      healthCheck: () => this.checkHttp('http://localhost:8095/health')
    });
  }

  async checkPort(port, host = 'localhost', timeout = 5000) {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => resolve(false), timeout);
      
      try {
        const socket = new (require('net').Socket)();
        
        socket.setTimeout(timeout);
        socket.on('connect', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve(true);
        });
        
        socket.on('timeout', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve(false);
        });
        
        socket.on('error', () => {
          clearTimeout(timeoutId);
          socket.destroy();
          resolve(false);
        });
        
        socket.connect(port, host);
      } catch (e) {
        clearTimeout(timeoutId);
        resolve(false);
      }
    });
  }

  async checkHttp(url, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkAllServices() {
    const results = new Map();
    
    for (const [name, service] of this.services) {
      try {
        const isHealthy = await service.healthCheck();
        results.set(name, {
          ...service,
          status: isHealthy ? 'healthy' : 'unhealthy',
          lastCheck: new Date().toISOString()
        });
      } catch (error) {
        results.set(name, {
          ...service,
          status: 'error',
          error: error.message,
          lastCheck: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  getRoutesByService(serviceName) {
    const routes = [];
    
    for (const [routeName, config] of this.routes) {
      if (config.dependencies?.includes(serviceName)) {
        routes.push({ name: routeName, ...config });
      }
    }
    
    return routes;
  }

  getRequiredServices() {
    return Array.from(this.services.values()).filter(service => service.required);
  }

  getOptionalServices() {
    return Array.from(this.services.values()).filter(service => !service.required);
  }

  getServiceDependencies(routeName) {
    const route = this.routes.get(routeName);
    if (!route?.dependencies) return [];
    
    return route.dependencies.map(dep => this.services.get(dep)).filter(Boolean);
  }

  async validateApiRoutes() {
    const apiPath = './sveltekit-frontend/src/routes/api';
    const results = {
      registered: Array.from(this.routes.keys()),
      existing: [],
      missing: [],
      extra: []
    };

    if (!existsSync(apiPath)) {
      return { ...results, error: 'API directory not found' };
    }

    // Scan existing API routes
    const scanDir = (dir, prefix = '') => {
      try {
        const entries = readdirSync(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDir(fullPath, `${prefix}/${entry}`);
          } else if (entry === '+server.ts' || entry === '+server.js') {
            results.existing.push(prefix || '/');
          }
        }
      } catch (error) {
        // Directory might not exist, skip
      }
    };

    scanDir(apiPath);

    // Find missing and extra routes
    const registeredEndpoints = new Set();
    for (const config of this.routes.values()) {
      config.endpoints.forEach(endpoint => {
        const routePath = endpoint.replace('/api', '').replace(/\[.*?\]/g, '[id]');
        registeredEndpoints.add(routePath);
      });
    }

    results.missing = Array.from(registeredEndpoints).filter(endpoint => 
      !results.existing.some(existing => existing === endpoint || existing.startsWith(endpoint))
    );

    results.extra = results.existing.filter(existing =>
      !Array.from(registeredEndpoints).some(registered => 
        existing === registered || existing.startsWith((registered as string).split('/')[0])
      )
    );

    return results;
  }

  generateServiceReport() {
    return {
      totalRoutes: this.routes.size,
      totalServices: this.services.size,
      requiredServices: this.getRequiredServices().length,
      optionalServices: this.getOptionalServices().length,
      routes: Object.fromEntries(this.routes),
      services: Object.fromEntries(this.services),
      timestamp: new Date().toISOString()
    };
  }
}

export const apiRegistry = new ApiServiceRegistry();
;