import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
  plugins: [
    UnoCSS(),
    sveltekit()
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
        secure: false
      },
      '/api/cuda': {
        target: 'http://localhost:8097',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    host: '0.0.0.0'
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
          'gpu-inference': ['$lib/services/cuda-vector-integration']
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@webgpu/types'],
    include: ['@grpc/grpc-js', '@grpc/proto-loader']
  },
  define: {
    'process.env.NODE_ENV': '"development"',
    'process.env.DATABASE_URL': '"postgresql://legal_admin:123456@localhost:5432/legal_ai_db"'
  },
  clearScreen: false
});