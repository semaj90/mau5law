import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import { enhancedImages } from '@sveltejs/enhanced-img';

export default defineConfig({
  plugins: [UnoCSS(), enhancedImages(), sveltekit()],
  server: {
    port: process.env.PORT || 5173,
    strictPort: false, // Allow automatic port fallback
    host: '0.0.0.0',
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'webgpu-ai': ['$lib/webgpu/webgpu-ai-engine'],
          'cognitive-router': ['$lib/ai/cognitive-smart-router'],
          'gpu-inference': ['$lib/services/cuda-vector-integration'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@webgpu/types'],
  },
  define: {
    'process.env.DATABASE_URL': '"postgresql://legal_admin:123456@localhost:5433/legal_ai_db"',
  },
});
