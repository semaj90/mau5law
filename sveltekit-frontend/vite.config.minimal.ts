import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    host: '127.0.0.1',  // Force specific host binding
    port: 5175,         // New port to avoid conflicts
    strictPort: true    // Don't silently fallback
  }
});