import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';

export default defineConfig({
	plugins: [
		UnoCSS(),
		sveltekit(),
		// WebSocket integration plugin
		{
			name: 'qlora-websocket-integration',
			configureServer(server) {
				// Handle WebSocket upgrades at the HTTP server level
				server.httpServer?.on('upgrade', async (request, socket, head) => {
					if (request.url === '/websocket' || request.url === '/ws/qlora') {
						try {
							// Get WebSocket server from global reference
							const wss = globalThis.__qloraWebSocketServer;
							if (wss) {
								console.log('🔌 [Vite] Handling WebSocket upgrade for:', request.url);
								wss.handleUpgrade(request, socket, head, (ws) => {
									wss.emit('connection', ws, request);
								});
							} else {
								console.error('❌ [Vite] WebSocket server not available');
								socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
								socket.destroy();
							}
						} catch (error) {
							console.error('❌ [Vite] WebSocket upgrade failed:', error);
							socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
							socket.destroy();
						}
					}
				});
				console.log('🔌 [Vite] WebSocket upgrade handler registered');
			}
		}
	],
	server: {
		port: parseInt(process.env.PORT) || 5174,
		strictPort: false,
		host: '0.0.0.0',
		hmr: {
			port: 24678, // Fixed WebSocket port to avoid conflicts
			host: 'localhost'
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
					// AI & ML components - Heavy processing
					'ai-core': [
						'$lib/components/ai/RAGAssistantChat.svelte',
						'$lib/components/ai/VectorSearch.svelte',
						'$lib/services/ollama-service.ts',
						'$lib/services/enhanced-rag-semantic-analyzer.ts'
					],

					// Canvas & Visualization - Heavy rendering
					'canvas-fabric': [
						'$lib/components/canvas/FabricCanvas.svelte',
						'$lib/components/canvas/EvidenceNode.svelte',
						'$lib/components/detective/DetectiveBoard.svelte',
						'fabric'
					],

					// GPU Processing - CUDA/WebGPU
					'gpu-processing': [
						'$lib/services/gpu-acceleration-service.ts',
						'$lib/services/webgpu-service.ts',
						'$lib/services/cuda-vector-integration',
						'$lib/webgpu/webgpu-ai-engine'
					],

					// Legal Document Processing
					'legal-processing': [
						'$lib/services/document-processor.ts',
						'$lib/services/evidence-analyzer.ts',
						'$lib/services/legal-workflow-service.ts'
					],

					// WebAssembly & Performance
					'wasm-performance': [
						'$lib/wasm/vector-wasm-wrapper',
						'$lib/wasm/gpu-wasm-init',
						'$lib/services/webgpu-wasm-service',
						'$lib/services/wasm-accelerated-cache-ops'
					],

					// UI Components - Heavy libraries
					'ui-heavy': [
						'$lib/components/ui/enhanced-bits',
						'$lib/components/layout/ProductionLayout.svelte',
						'$lib/templates/EssentialRoutePage.svelte'
					],

					// Existing chunks
					'webgpu-ai': ['$lib/webgpu/webgpu-ai-engine'],
					'cognitive-router': ['$lib/ai/cognitive-smart-router']
				}
			}
		}
	},
	optimizeDeps: {
		exclude: ['@webgpu/types'],
		include: ['wasm-feature-detect', 'web-streams-polyfill'],
		esbuildOptions: {
			target: 'esnext'
		}
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
		// Removed REDIS_PASSWORD since Redis server doesn't require authentication
	}
});