// vite.config.js
import { sveltekit } from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/vite/dist/node/index.js";
import UnoCSS from "file:///C:/Users/james/Videos/deeds-web-app/sveltekit-frontend/node_modules/unocss/dist/vite.mjs";
var vite_config_default = defineConfig({
  plugins: [
    UnoCSS(),
    sveltekit()
  ],
  server: {
    port: 5173,
    strictPort: true,
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
    "process.env.NODE_ENV": '"production"',
    "process.env.DATABASE_URL": '"postgresql://legal_admin:123456@localhost:5433/legal_ai_db"'
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxqYW1lc1xcXFxWaWRlb3NcXFxcZGVlZHMtd2ViLWFwcFxcXFxzdmVsdGVraXQtZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGphbWVzXFxcXFZpZGVvc1xcXFxkZWVkcy13ZWItYXBwXFxcXHN2ZWx0ZWtpdC1mcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvamFtZXMvVmlkZW9zL2RlZWRzLXdlYi1hcHAvc3ZlbHRla2l0LWZyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBVbm9DU1MgZnJvbSAndW5vY3NzL3ZpdGUnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuXHRwbHVnaW5zOiBbXHJcblx0XHRVbm9DU1MoKSxcclxuXHRcdHN2ZWx0ZWtpdCgpXHJcblx0XSxcclxuXHRzZXJ2ZXI6IHtcclxuXHRcdHBvcnQ6IDUxNzMsXHJcblx0XHRzdHJpY3RQb3J0OiB0cnVlLFxyXG5cdFx0aG9zdDogJzAuMC4wLjAnXHJcblx0fSxcclxuXHRwcmV2aWV3OiB7XHJcblx0XHRwb3J0OiA0MTczLFxyXG5cdFx0aG9zdDogJzAuMC4wLjAnXHJcblx0fSxcclxuXHRidWlsZDoge1xyXG5cdFx0dGFyZ2V0OiAnZXNuZXh0JyxcclxuXHRcdG1pbmlmeTogJ2VzYnVpbGQnLFxyXG5cdFx0c291cmNlbWFwOiBmYWxzZSxcclxuXHRcdHJvbGx1cE9wdGlvbnM6IHtcclxuXHRcdFx0b3V0cHV0OiB7XHJcblx0XHRcdFx0bWFudWFsQ2h1bmtzOiB7XHJcblx0XHRcdFx0XHQnd2ViZ3B1LWFpJzogWyckbGliL3dlYmdwdS93ZWJncHUtYWktZW5naW5lJ10sXHJcblx0XHRcdFx0XHQnY29nbml0aXZlLXJvdXRlcic6IFsnJGxpYi9haS9jb2duaXRpdmUtc21hcnQtcm91dGVyJ10sXHJcblx0XHRcdFx0XHQnZ3B1LWluZmVyZW5jZSc6IFsnJGxpYi9zZXJ2aWNlcy9jdWRhLXZlY3Rvci1pbnRlZ3JhdGlvbiddXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHRvcHRpbWl6ZURlcHM6IHtcclxuXHRcdGV4Y2x1ZGU6IFsnQHdlYmdwdS90eXBlcyddXHJcblx0fSxcclxuXHRkZWZpbmU6IHtcclxuXHRcdCdwcm9jZXNzLmVudi5OT0RFX0VOVic6ICdcInByb2R1Y3Rpb25cIicsXHJcblx0XHQncHJvY2Vzcy5lbnYuREFUQUJBU0VfVVJMJzogJ1wicG9zdGdyZXNxbDovL2xlZ2FsX2FkbWluOjEyMzQ1NkBsb2NhbGhvc3Q6NTQzMy9sZWdhbF9haV9kYlwiJ1xyXG5cdH1cclxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUFnVyxTQUFTLGlCQUFpQjtBQUMxWCxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFlBQVk7QUFFbkIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDM0IsU0FBUztBQUFBLElBQ1IsT0FBTztBQUFBLElBQ1AsVUFBVTtBQUFBLEVBQ1g7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFlBQVk7QUFBQSxJQUNaLE1BQU07QUFBQSxFQUNQO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsRUFDUDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ04sUUFBUTtBQUFBLElBQ1IsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ1AsY0FBYztBQUFBLFVBQ2IsYUFBYSxDQUFDLDhCQUE4QjtBQUFBLFVBQzVDLG9CQUFvQixDQUFDLGdDQUFnQztBQUFBLFVBQ3JELGlCQUFpQixDQUFDLHVDQUF1QztBQUFBLFFBQzFEO0FBQUEsTUFDRDtBQUFBLElBQ0Q7QUFBQSxFQUNEO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDYixTQUFTLENBQUMsZUFBZTtBQUFBLEVBQzFCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDUCx3QkFBd0I7QUFBQSxJQUN4Qiw0QkFBNEI7QUFBQSxFQUM3QjtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
