import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],

	// Fabric.js optimization
	optimizeDeps: {
		include: ['fabric']
	},

	// Canvas and file handling
	define: {
		global: 'globalThis'
	},

	server: {
		fs: {
			allow: ['..']
		}
	},

	// CSS imports for NES.css
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: '@import "nes.css/css/nes.min.css";'
			}
		}
	}
});