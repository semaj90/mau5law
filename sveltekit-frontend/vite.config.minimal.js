import { defineConfig } from 'vite';

// Minimal Vite config without SvelteKit plugins to test basic functionality
export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  root: 'static', // Use static files directory
});