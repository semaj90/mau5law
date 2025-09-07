// @ts-nocheck
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import UnoCSS from "unocss/vite";
import { resolve } from "path";
import { vscodeErrorLogger } from "./src/lib/vite/vscode-error-logger";

// Import Node.js polyfills to fix server-side issues
import '@sveltejs/kit/node/polyfills';

// Smart port discovery utility
async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  const net = await import('net');

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.listen(port, (err?: any) => {
          if (err) {
            reject(err);
          } else {
            server.close(() => resolve());
          }
        });
        server.on('error', reject);
      });
      return port;
    } catch (error) {
      console.log(`Port ${port} is occupied, trying next...`);
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export default defineConfig(async ({ mode }) => {
  // Smart port discovery - prefer DEV_PORT env if set, else 5173
  // Prefer DEV_PORT env; default to 5177 to avoid common 5173 conflicts
  const preferredPort = Number(process.env.DEV_PORT || '') || 5177;
  let availablePort: number;

  try {
    availablePort = await findAvailablePort(preferredPort);
    if (availablePort !== preferredPort) {
      console.log(`⚠️  Port ${preferredPort} was occupied, using port ${availablePort} instead`);
    }
  } catch (error) {
    console.error(`❌ Failed to find available port: ${error}`);
    availablePort = preferredPort; // Fallback to default
  }

  return {
    plugins: [
      UnoCSS(),
      vscodeErrorLogger({
        enabled: mode === 'development',
        logFile: resolve('.vscode/vite-errors.json'),
        maxEntries: 500,
        includeWarnings: true,
        includeSourceMaps: true,
        autoOpenProblems: false,
        notificationLevel: 'errors-only',
        integrateTasks: true,
        generateDiagnostics: true,
      }),
      sveltekit(),
    ],

    // Development server configuration with smart port discovery
    server: {
      port: availablePort,
      host: '0.0.0.0',
      cors: true,
      strictPort: false, // Allow Vite to find alternative ports if needed
      hmr: {
        port: 3131,
        clientPort: 3131,
      },
      fs: {
        allow: ['..', '../../'],
      },
      // Proxy for API calls during development
      proxy: {
        // Ollama LLM service with enhanced error handling
        '/api/llm': {
          target: 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/llm/, '/api'),
          timeout: 30000,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🚨 Ollama LLM proxy error:', err.message);
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Ollama service unavailable', code: 'OLLAMA_DOWN' }));
            });
          },
        },
        // Qdrant vector database with timeout
        '/api/qdrant': {
          target: 'http://localhost:6333',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/qdrant/, ''),
          timeout: 10000,
        },
        // Go microservice proxy for high-performance operations
        '/api/go': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/go/, ''),
          timeout: 60000, // Longer timeout for ML operations
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🚨 Go microservice proxy error:', err.message);
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Go service unavailable', code: 'GO_SERVICE_DOWN' }));
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔄 Proxying to Go microservice:', req.method, req.url);
            });
          },
        },
        // Document parsing service
        '/api/parse': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          timeout: 30000,
        },

        // AI training service (extended timeout)
        '/api/train-som': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          timeout: 120000, // Extended timeout for training
        },

        // CUDA inference service
        '/api/cuda-infer': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          timeout: 60000,
        },

        // Neo4j database proxy
        '/api/neo4j': {
          target: 'http://localhost:7474',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/neo4j/, ''),
          timeout: 15000,
        },

        // Note: Redis is not an HTTP service. Remove invalid proxy to avoid dev errors.
      },
    },

    preview: {
      port: availablePort + 1000, // Use different port for preview
      host: '0.0.0.0',
      cors: true,
      strictPort: false, // Allow alternative ports for preview too
    },

    // ESBuild configuration - fix legal comments parsing error
    esbuild: {
      legalComments: 'none',
      target: 'esnext',
      keepNames: mode === 'development',
      minify: mode === 'production',
      // Drop console/debugger in production
      ...(mode === 'production' && {
        drop: ['console', 'debugger'],
        pure: ['console.log', 'console.warn'],
      }),
    },

    // Build optimizations
    build: {
      target: 'esnext',
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: mode === 'development',

      rollupOptions: {
        external: [
          'amqplib',
          'ioredis',
          '@qdrant/js-client-rest',
          'neo4j-driver',
          '@xstate/svelte',
          'xstate',
          '@langchain/community',
          '@langchain/anthropic',
          '@langchain/google-genai',
          'drizzle-orm',
        ],

        // Optimize chunks for performance
        output: {
          manualChunks: {
            // Vendor chunks
            'vendor-svelte': ['svelte', '@sveltejs/kit'],
            'vendor-db': ['drizzle-orm', 'postgres'],
            'vendor-cache': ['ioredis'],
            'vendor-ai': ['@langchain/community', '@langchain/core'],

            // Feature-based chunks for optimal loading and SSR
            'legal-analysis': [
              './src/lib/legal/analysis.js',
              './src/lib/legal/document-processor.js',
              './src/lib/legal/evidence-analyzer.js',
            ],
            'agent-orchestration': [
              './src/lib/agents/orchestrator.js',
              './src/lib/agents/crew-ai.js',
              './src/lib/machines/AIAssistantMachine.js',
            ],
            'database-layer': [
              './src/lib/database/redis.js',
              './src/lib/database/qdrant.js',
              './src/lib/database/postgres.js',
              './src/lib/db/index.js',
            ],
            'vector-search': [
              './src/lib/services/vector-service.js',
              './src/lib/services/enhanced-vector-search.js',
              './src/lib/services/semantic-search.js',
            ],
            'yorha-interface': [
              './src/lib/types/yorha-interface.js',
              './src/lib/components/yorha/**/*.js',
            ],
            'xstate-machines': ['./src/lib/machines/**/*.js'],
          },
        },
      },

      // Chunk size warnings threshold
      chunkSizeWarningLimit: 1000,

      // Asset optimization
      assetsInlineLimit: 4096,
    },

    // Dependency optimization
    optimizeDeps: {
      include: ['svelte', '@sveltejs/kit'],
      exclude: [
        '@langchain/community',
        '@langchain/anthropic',
        '@langchain/google-genai',
        'ioredis',
        'drizzle-orm',
        'postgres',
        'pgvector',
        '@qdrant/js-client-rest',
        'esm-env',
        'xstate',
        'lokijs',
        '@langchain/core',
        'devalue',
        'path-browserify',
        'crypto-browserify',
        'stream-browserify',
        'browserify-fs',
        'os-browserify',
        'querystring-es3',
      ],

      // Force pre-bundling for better performance
      force: true,
    },

    // SSR configuration to handle Node.js polyfills
    ssr: {
      noExternal: ['@langchain/community', '@langchain/core', 'drizzle-orm', 'crypto-browserify'],
      external: [
        'stream-browserify',
        'path-browserify',
        'browserify-fs',
        'os-browserify',
        'querystring-es3',
      ],
    },

    // Path resolution and Node.js polyfills
    resolve: {
      alias: {
        $lib: resolve('./src/lib'),
        $components: resolve('./src/lib/components'),
        $stores: resolve('./src/lib/stores'),
        $utils: resolve('./src/lib/utils'),
        $database: resolve('./src/lib/database'),
        $agents: resolve('./src/lib/agents'),
        $legal: resolve('./src/lib/legal'),

        // Replace Melt UI with a local shim to avoid build-time breakage during migration
        '@melt-ui/svelte': resolve('./src/lib/shims/melt-ui-shim.ts'),

        // Node.js polyfills for browser compatibility (exclude problematic CommonJS modules from SSR)
        crypto: process.env.NODE_ENV === 'production' ? 'crypto-browserify' : 'crypto',
        process: 'process/browser',
        buffer: 'buffer',
        util: 'util',
        events: 'events',
        url: 'url',
      },
    },

    // CSS processing optimizations
    css: {
      devSourcemap: mode === 'development',
      postcss:
        mode === 'production'
          ? {
              plugins: [
                require('autoprefixer'),
                require('cssnano')({
                  preset: 'default',
                }),
              ],
            }
          : undefined,
    },


    // Worker configuration for Node.js clustering support
    worker: {
      format: 'es',
      plugins: () => [UnoCSS()],
    },

    // Environment variables and API URL configuration
    define: {
      __DEV__: mode === 'development',
      __PROD__: mode === 'production',
      __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VITE_PORT__: availablePort,

      // Node.js global polyfills
      global: 'globalThis',
      'process.env': {},

      // Service endpoint configuration
      __API_BASE_URL__:
        mode === 'development'
          ? JSON.stringify(`http://localhost:${availablePort}`)
          : JSON.stringify(process.env.PUBLIC_API_BASE_URL || 'https://legal-ai.yourdomain.com'),

      // Service ports for dynamic configuration
      __OLLAMA_PORT__: 11434,
      __QDRANT_PORT__: 6333,
      __POSTGRES_PORT__: 5432,
      __GO_SERVICE_PORT__: 8080,
      __NEO4J_PORT__: 7474,
      __REDIS_PORT__: 4005,
      __MCP_SERVER_PORT__: 4100,
      __GRPC_SERVER_PORT__: 8084,

      // Feature flags for SSR optimization
      __ENABLE_VECTOR_SEARCH__: true,
      __ENABLE_AI_ANALYSIS__: true,
      __ENABLE_REAL_TIME__: true,
      __ENABLE_CUDA_ACCELERATION__: process.env.CUDA_VISIBLE_DEVICES !== undefined,
      __SSR_ENABLED__: mode === 'production',

      // Ensure dev defaults for Redis are consistent across import.meta.env and process.env
      'import.meta.env.REDIS_HOST': JSON.stringify(process.env.REDIS_HOST || '127.0.0.1'),
      'import.meta.env.REDIS_PORT': JSON.stringify(process.env.REDIS_PORT || '4005'),
      'import.meta.env.REDIS_URL': JSON.stringify(
        process.env.REDIS_URL || 'redis://127.0.0.1:4005'
      ),
      'process.env.REDIS_HOST': JSON.stringify(process.env.REDIS_HOST || '127.0.0.1'),
      'process.env.REDIS_PORT': JSON.stringify(process.env.REDIS_PORT || '4005'),
      'process.env.REDIS_URL': JSON.stringify(process.env.REDIS_URL || 'redis://127.0.0.1:4005'),
    },

    // Performance optimizations
    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === 'js') {
          return `/${filename}`;
        } else {
          return { relative: true };
        }
      },
    },
  };
});
