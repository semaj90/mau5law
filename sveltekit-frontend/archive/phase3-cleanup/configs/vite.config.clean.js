import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],

	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
			$components: path.resolve('./src/lib/components'),
			$services: path.resolve('./src/lib/services'),
			$types: path.resolve('./src/lib/types')
		}
	},

	server: {
		port: 5174,
		host: 'localhost'
	},

	optimizeDeps: {
		include: [
			'socket.io-client',
			'bits-ui',
			'fuse.js',
			'zod',
			'class-variance-authority',
			'clsx',
			'tailwind-merge'
		]
	},

	build: {
		target: 'es2020',
		rollupOptions: {
			output: {
				manualChunks: {
					'ui': ['bits-ui'],
					'search': ['fuse.js'],
					'utils': ['zod', 'clsx', 'tailwind-merge', 'class-variance-authority']
				}
			}
		}
	}
});