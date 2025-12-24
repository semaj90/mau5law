# Gemini Brief: Phase13 Integration Pattern

## 🔧 TypeScript Language Server: Module Export Cache Issue

**Problem:** `Module '"$lib/server/db"' has no exported member 'db'` (but export exists)

**Cause:** TypeScript Language Server caches module shapes. When `index.ts` is modified, TSServer doesn't reload.

**Fix:**
```
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

**Code Snippet:**
```typescript
// Ensure correct import path
import { db } from '$lib/server/db';
```

**Why:** Runtime works perfectly - this is purely an IDE/editor cache issue.

**Prevention:**
- After modifying barrel files (`index.ts`), restart TSServer
- Avoid circular dependencies between schema and db files
- Clear `.svelte-kit` cache if issues persist: `rm -rf .svelte-kit && npm run dev`

---

- Health probes (cached): Ollama (`getOllamaEndpoint`), Enhanced RAG `/health`, Qdrant `healthz/readyz/collections`, Redis via env/ping, DB via env presence, Docker flag.
- Preferences: Enhanced RAG first, else Ollama `gemma3-legal:latest`; vector DB Qdrant > pgvector > memory; DB prod URL > memory; Redis caching when present.
- Performance stance: enable SSR, code splitting, UnoCSS; Redis-or-memory caching.
- Endpoint: `/api/system/phase13` exposes status + recommendations.
- Env-only wiring (no container changes): `ENHANCED_RAG_URL`, `DATABASE_URL` + `PGVECTOR_ENABLED`/`ENABLE_PGVECTOR`, `REDIS_URL`/`UPSTASH_REDIS_REST_URL`, `QDRANT_URL`, `OLLAMA_URL`/`OLLAMA_BASE_URL`, optional Docker flags.
// ...existing code...
- Replicate this shape for other health endpoints; call `initializePhase13()` or hit the GET endpoint for status.

## 🗺️ Route Structure & Command Center
- **Core Routes Location**: `src/routes/(app)/` contains the authenticated core application routes.
- **Public Routes**: Root level `src/routes/` contains public/marketing pages.
- **Command Center**: The main dashboard is at `src/routes/(app)/command-center/`.
- **Navigation**: Defined in `src/lib/components/yorha/CommandCenterNav.svelte`.

### Route Status
The following routes have been migrated to `(app)`:
- `active-cases`
- `evidence-library`
- `analysis-center`
- `global-search`
- `system-configuration`
- `gpu-evidence-graph`
- `persons-of-interest`

