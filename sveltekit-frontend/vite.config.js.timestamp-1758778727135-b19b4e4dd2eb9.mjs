// vite.config.js
import { sveltekit } from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/vite/dist/node/index.js";
import UnoCSS from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/unocss/dist/vite.mjs";
var vite_config_default = defineConfig({
  plugins: [UnoCSS(), sveltekit()],
  server: {
    port: process.env.PORT || 5173,
    strictPort: false,
    // Allow automatic port fallback
    host: "0.0.0.0"
  },
  preview: {
    port: 4173,
    host: "0.0.0.0"
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "webgpu-ai": ["$lib/webgpu/webgpu-ai-engine"],
          "cognitive-router": ["$lib/ai/cognitive-smart-router"],
          "gpu-inference": ["$lib/services/cuda-vector-integration"]
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["@webgpu/types"]
  },
  define: {
    "process.env.DATABASE_URL": '"postgresql://legal_admin:123456@localhost:5433/legal_ai_db"'
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYW1lc1xcXFxWaWRlb3NcXFxcZGVlZHMtd2ViLWFwcFxcXFxzdmVsdGVraXQtZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGphbWVzXFxcXFZpZGVvc1xcXFxkZWVkcy13ZWItYXBwXFxcXHN2ZWx0ZWtpdC1mcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvamFtZXMvVmlkZW9zL2RlZWRzLXdlYi1hcHAvc3ZlbHRla2l0LWZyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IFVub0NTUyBmcm9tICd1bm9jc3Mvdml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtVbm9DU1MoKSwgc3ZlbHRla2l0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiBwcm9jZXNzLmVudi5QT1JUIHx8IDUxNzMsXG4gICAgc3RyaWN0UG9ydDogZmFsc2UsIC8vIEFsbG93IGF1dG9tYXRpYyBwb3J0IGZhbGxiYWNrXG4gICAgaG9zdDogJzAuMC4wLjAnLFxuICB9LFxuICBwcmV2aWV3OiB7XG4gICAgcG9ydDogNDE3MyxcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAnd2ViZ3B1LWFpJzogWyckbGliL3dlYmdwdS93ZWJncHUtYWktZW5naW5lJ10sXG4gICAgICAgICAgJ2NvZ25pdGl2ZS1yb3V0ZXInOiBbJyRsaWIvYWkvY29nbml0aXZlLXNtYXJ0LXJvdXRlciddLFxuICAgICAgICAgICdncHUtaW5mZXJlbmNlJzogWyckbGliL3NlcnZpY2VzL2N1ZGEtdmVjdG9yLWludGVncmF0aW9uJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnQHdlYmdwdS90eXBlcyddLFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICAncHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMJzogJ1wicG9zdGdyZXNxbDovL2xlZ2FsX2FkbWluOjEyMzQ1NkBsb2NhbGhvc3Q6NTQzMy9sZWdhbF9haV9kYlwiJyxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLGlCQUFpQjtBQUMxWCxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFlBQVk7QUFFbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7QUFBQSxFQUMvQixRQUFRO0FBQUEsSUFDTixNQUFNLFFBQVEsSUFBSSxRQUFRO0FBQUEsSUFDMUIsWUFBWTtBQUFBO0FBQUEsSUFDWixNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGFBQWEsQ0FBQyw4QkFBOEI7QUFBQSxVQUM1QyxvQkFBb0IsQ0FBQyxnQ0FBZ0M7QUFBQSxVQUNyRCxpQkFBaUIsQ0FBQyx1Q0FBdUM7QUFBQSxRQUMzRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGVBQWU7QUFBQSxFQUMzQjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sNEJBQTRCO0FBQUEsRUFDOUI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
