import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
	plugins: [
		UnoCSS(),
		sveltekit()
	],
	server: {
		port: 5174,
		strictPort: false, // Allow Vite to find alternative ports
		host: '0.0.0.0',
		hmr: {
			port: 24678,
			host: 'localhost',
			// Add retry logic for WebSocket connections
			clientPort: 24678,
			// Increase timeout for stability
			timeout: 30000
		},
		// Add connection timeout settings
		headers: {
			'Keep-Alive': 'timeout=30, max=100'
		},
		// Improve stability with larger buffers
		maxPayload: 50 * 1024 * 1024, // 50MB
		// Add more resilient WebSocket handling
		ws: {
			port: 24678
		}
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
			external: ['simdjson', 'node-simdjson', '@stomp/stompjs'],
			output: {
				manualChunks: {
					'webgpu-ai': ['$lib/webgpu/webgpu-ai-engine'],
					'cognitive-router': ['$lib/ai/cognitive-smart-router'],
					'gpu-inference': ['$lib/services/cuda-vector-integration'],
					'wasm-ops': ['$lib/wasm/vector-wasm-wrapper', '$lib/wasm/gpu-wasm-init'],
					'performance': ['$lib/services/webgpu-wasm-service', '$lib/services/wasm-accelerated-cache-ops']
				}
			}
		}
	},
	optimizeDeps: {
		exclude: ['@webgpu/types'],
		include: ['wasm-feature-detect', 'web-streams-polyfill'],
		esbuildOptions: {
			target: 'esnext'
		},
		// Force pre-bundling of problematic dependencies
		force: true
	},
	worker: {
		format: 'es'
	},
	// Enable WASM support in Vite
	assetsInclude: ['**/*.wasm'],
	define: {
		'process.env.NODE_ENV': '"development"',
		'process.env.DATABASE_URL': '"postgresql://legal_admin:123456@localhost:5433/legal_ai_db"',
		'process.env.REDIS_URL': '"redis://localhost:6379"'
	},
	// Add better error handling and logging
	logLevel: 'info',
	clearScreen: false,
	// Improve stability for large projects
	resolve: {
		dedupe: ['svelte']
	}
});