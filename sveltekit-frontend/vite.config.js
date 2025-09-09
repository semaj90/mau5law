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
		port: 5174,
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
			external: ['simdjson', 'node-simdjson', '@stomp/stompjs'],
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