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
		host: '0.0.0.0'
	},
	preview: {
		port: 4173,
		host: '0.0.0.0'
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
					'gpu-inference': ['$lib/services/cuda-vector-integration']
				}
			}
		}
	},
	optimizeDeps: {
		exclude: ['@webgpu/types']
	},
	define: {
		'process.env.NODE_ENV': '"production"',
		'process.env.DATABASE_URL': '"postgresql://postgres:123456@localhost:5432/legal_ai_db"'
	}
});