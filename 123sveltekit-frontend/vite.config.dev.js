import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
	plugins: [
		UnoCSS(),
		sveltekit({
			kit: {
				adapter: {
					fallback: 'index.html'
				}
			}
		})
	],
	ssr: {
		noExternal: ['svelte', '@sveltejs/kit']
	},
	server: {
		port: 5174,
		strictPort: false,
		host: '0.0.0.0',
		open: '/demo/gpu-inference'
	},
	preview: {
		port: 4174,
		host: '0.0.0.0',
		open: '/demo/gpu-inference'
	},
	build: {
		target: 'esnext',
		sourcemap: true,
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
		'process.env.NODE_ENV': '"development"',
		'process.env.DATABASE_URL': '"postgresql://postgres:123456@localhost:5432/legal_ai_db"'
	}
});