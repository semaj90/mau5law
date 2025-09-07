import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from '@unocss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig(({ ssrBuild }) => {
	const isSSR = !!ssrBuild;

	const plugins = [sveltekit(), UnoCSS()];
	// Apply node polyfills only for client (browser) builds to avoid SSR issues
	if (!isSSR) {
		plugins.push(
			nodePolyfills({
				include: ['process', 'buffer', 'util', 'stream', 'events', 'crypto'], // omit 'path' to avoid path-browserify on SSR
				exclude: ['fs', 'dns', 'os', 'os-browserify'],
				globals: {
					Buffer: true,
					global: true,
					process: {
						env: {},
						platform: 'browser',
						version: '',
						cwd: () => '/',
						nextTick: (fn) => setTimeout(fn, 0)
					},
					exports: {}
				},
				protocolImports: true
			})
		);
	}

	// Base aliases shared by both client and SSR
	const baseAliases = {
		$lib: path.resolve('./src/lib'),
		$components: path.resolve('./src/lib/components'),
		$services: path.resolve('./src/lib/services'),
		$types: path.resolve('./src/lib/types'),
		// Provide a lightweight CommonJS interop shim for rare deps that still probe for module/exports
		'cjs-shim': path.resolve('./src/lib/shims/commonjs-shim.js'),
		// Shim sveltekit-superforms SuperDebug (package ships a duplicate top-level <script> during build)
		'sveltekit-superforms/dist/client/SuperDebug.svelte': path.resolve(
			'./src/lib/shims/superforms/SuperDebug.svelte'
		),
		// Force fabric to use the browser-specific build (safe in SSR too)
		fabric: path.resolve('./node_modules/fabric/dist/fabric.js')
	};

	// Browser-only aliases (avoid these during SSR)
	const browserOnlyAliases = !isSSR
		? {
				fs: path.resolve('./src/lib/shims/fs-browser-shim.js'),
				dns: path.resolve('./src/lib/shims/dns-browser-shim.js'),
				ioredis: path.resolve('./src/lib/shims/ioredis-browser-shim.js'),
				os: path.resolve('./src/lib/shims/os-browser-shim.js'),
				'os-browserify': path.resolve('./src/lib/shims/os-browser-shim.js'),
				crypto: 'crypto-browserify'
			}
		: {};

	// SSR-only aliases to force Node built-ins rather than browser polyfills
	const ssrOnlyAliases = isSSR
		? {
				path: 'node:path',
				'path-browserify': 'node:path'
			}
		: {};

	return {
		plugins,

		// Enhanced logging configuration
		logLevel: 'info',

		resolve: {
			alias: {
				...baseAliases,
				...browserOnlyAliases,
				...ssrOnlyAliases
			}
		},

		// Define global constants for browser compatibility
		define: {
			global: 'globalThis',
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
			'process.platform': isSSR ? '"node"' : '"browser"',
			'process.version': isSSR ? JSON.stringify(process.version || '') : '""',
			__DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
			'process.env.NODE_DEBUG': 'false'
		},

		server: {
			port: 5174,
			strictPort: true,
			host: 'localhost',
			hmr: { port: 5174 }
		},

		optimizeDeps: {
			include: [
				'socket.io-client',
				// Bits UI and Melt UI dependencies
				'bits-ui',
				'melt',
				// Browser polyfills for Node.js modules
				'fuse.js',
				'zod',
				'class-variance-authority',
				'clsx',
				'tailwind-merge',
				// Vector/AI dependencies
				'@xenova/transformers',
				// Force camelcase to be optimized to fix import issues
				'camelcase',
				// Crypto polyfill
				'crypto-browserify'
			],
			exclude: [
				'@tauri-apps/api',
				'pdf-lib',
				'@xenova/transformers',
				// Exclude problematic Vite chunks observed in dev
				'chunk-LKWBGAQA',
				'chunk-274JHYMB',
				// WebGPU types should not be optimized
				'@webgpu/types'
			]
		},

		ssr: {
			noExternal: ['bits-ui', 'melt', '$lib/services/cognitive-cache-integration'],
			external: [
				'fabric',
				'canvas',
				'fs',
				'dns',
				'lokijs',
				'ioredis',
				// Use Node built-ins in SSR; avoid browserified variants
				'crypto-browserify',
				'os-browserify',
				'os'
			]
		},

		// Enhanced build configuration for browser compatibility
		build: {
			target: ['es2020', 'chrome80', 'firefox78', 'safari14'],
			modulePreload: { polyfill: true },
			rollupOptions: {
				output: {
					// Separate chunks for better caching
					manualChunks: {
						'bits-ui': ['bits-ui'],
						'melt-ui': ['melt'],
						search: ['fuse.js'],
						vector: ['@xenova/transformers'],
						ai: ['@langchain/core', '@langchain/community'],
						utils: ['zod', 'clsx', 'tailwind-merge', 'class-variance-authority']
					}
				},
				// Fix CommonJS/ESM compatibility for camelcase
				external: (id) => {
					if (id === 'camelcase') return false;
					return false;
				}
			},
			reportCompressedSize: true,
			chunkSizeWarningLimit: 1000
		}
	};
});