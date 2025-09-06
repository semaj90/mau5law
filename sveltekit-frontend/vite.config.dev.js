import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from '@unocss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		UnoCSS(),
		sveltekit({
			kit: {
				adapter: {
					fallback: 'index.html'
				}
			}
		}),
		nodePolyfills({
			include: ['process', 'buffer', 'util', 'stream', 'events', 'crypto'],
			exclude: ['fs', 'dns', 'os', 'os-browserify', 'path', 'path-browserify'],
			globals: {
				Buffer: true,
				global: true,
				process: true
			},
			protocolImports: true
		})
	],
	ssr: {
		noExternal: ['svelte', '@sveltejs/kit'],
		external: ['crypto-browserify', 'os-browserify', 'buffer', 'util']
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
		exclude: ['@webgpu/types', 'chunk-LKWBGAQA', 'chunk-274JHYMB']
	},
	define: {
		'process.env.NODE_ENV': '"development"',
		'process.env.DATABASE_URL': '"postgresql://postgres:123456@localhost:5432/legal_ai_db"',
		global: 'globalThis',
		'process.platform': '"browser"',
		'process.version': '""'
	}
});