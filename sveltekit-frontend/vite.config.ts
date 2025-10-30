import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import UnoCSS from '@unocss/vite';
import path from 'path';
import fs from 'fs';

const generatedDir = path.resolve(__dirname, '.svelte-kit/generated');
const serverInternals = path.resolve(generatedDir, 'server');
const publicInternals = path.resolve(generatedDir, 'client');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const wsPort = env.VITE_WS_PORT || '5173';

  // Ensure logs directory exists
  const logsDir = path.resolve(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  return {
    assetsInclude: ['**/*.woff2'], // Added for font assets
    plugins: [
      sveltekit(),
      UnoCSS(),
      // HMR error logger plugin
      {
        name: 'hmr-error-logger',
        handleHotUpdate(ctx) {
          const logPath = path.join(logsDir, 'hmr-errors.log');
          const timestamp = new Date().toISOString();
          const logEntry = `[${timestamp}] HMR update: ${ctx.file}\n`;
          fs.appendFileSync(logPath, logEntry);
        },
        configureServer(server) {
          // Log WebSocket errors
          server.ws.on('error', error => {
            const logPath = path.join(logsDir, 'hmr-errors.log');
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] ❌ WebSocket error: ${error.message}\n${error.stack}\n\n`;
            fs.appendFileSync(logPath, logEntry);
            console.error('WebSocket error logged to hmr-errors.log');
          });

          // Log client connection issues
          server.ws.on('connection', socket => {
            socket.on('error', error => {
              const logPath = path.join(logsDir, 'hmr-errors.log');
              const timestamp = new Date().toISOString();
              const logEntry = `[${timestamp}] ❌ Client WebSocket error: ${error.message}\n`;
              fs.appendFileSync(logPath, logEntry);
            });
          });
        },
      },
    ],
    server: {
      port: 5173,
      strictPort: true,
      host: '0.0.0.0',
      // Proxy gRPC and API requests
      proxy: {
        '/grpc': {
          target: 'http://localhost:50051',
          changeOrigin: true,
          secure: false,
        },
        '/api/cuda': {
          target: 'http://localhost:8097',
          changeOrigin: true,
          secure: false,
        },
        // WebSocket proxy for legal AI services
        '/ws/rag': {
          target: `ws://localhost:${wsPort}`, // enhanced-rag Go service
          ws: true,
          changeOrigin: true,
        },
        '/ws/canvas': {
          target: 'ws://localhost:8095', // evidence canvas collaboration
          ws: true,
          changeOrigin: true,
        },
        '/ws/chat': {
          target: 'ws://localhost:8096', // AI chat service
          ws: true,
          changeOrigin: true,
        },
        // Health check proxy
        '/health': {
          target: `http://localhost:${wsPort}`,
          changeOrigin: true,
        },
        // Add more WebSocket endpoints as needed
      },
    },
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },
    build: {
      target: 'ES2022',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'webgpu-ai': ['$lib/webgpu/webgpu-ai-engine'],
            'cognitive-router': ['$lib/ai/cognitive-smart-router'],
            'gpu-inference': ['$lib/services/cuda-vector-integration'],
            'bits-ui': ['bits-ui'],
            drizzle: ['drizzle-orm'],
            langchain: ['langchain', '@langchain/core'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false,
    },
    optimizeDeps: {
      exclude: ['@webgpu/types'],
      include: ['@grpc/grpc-js', '@grpc/proto-loader', 'bits-ui', 'drizzle-orm', 'svelte', '@sveltejs/kit'],
      esbuildOptions: {
        target: 'ES2022',
      },
    },
    esbuild: {
      legalComments: 'none',
      treeShaking: true,
    },
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.DATABASE_URL': '"postgresql://legal_admin:123456@localhost:5432/legal_ai_db"',
      'process.env.DEV_BYPASS_AUTH': JSON.stringify(process.env.DEV_BYPASS_AUTH || 'false'),
      'import.meta.env.VITE_DEV_BYPASS_AUTH': JSON.stringify(process.env.DEV_BYPASS_AUTH || 'false'),
    },
    clearScreen: false,
    resolve: {
      alias: {
        __SERVER__: serverInternals,
        __PUBLIC__: publicInternals,
        // Shim node-postgres imports to use postgres-js adapter (conservative)
        'drizzle-orm/node-postgres': path.resolve(__dirname, 'src/lib/shims/drizzle-node-postgres.ts'),
      },
      dedupe: ['svelte'],
    },
  };
});
