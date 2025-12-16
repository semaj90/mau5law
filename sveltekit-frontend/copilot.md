# Copilot Quick Notes: Phase13 Integration Pattern
- Detect services with lightweight probes: Ollama via `getOllamaEndpoint`, Enhanced RAG via `/health`, Qdrant via `healthz/readyz/collections`, Redis via env/ping, DB via env presence, Docker flag. Cache health briefly to avoid hammering.
- Prefer production paths: Enhanced RAG first, else Ollama (`gemma3-legal:latest`); Redis caching if present; vector DB priority Qdrant > pgvector > memory; DB priority prod URL > memory.
- Performance hints: SSR on, code splitting, UnoCSS, caching layer set to Redis when available.
- Health endpoint: `/api/system/phase13` returns status + recommendations.
- Env-driven only (no container changes): `ENHANCED_RAG_URL`, `DATABASE_URL` + `PGVECTOR_ENABLED`/`ENABLE_PGVECTOR`, `REDIS_URL`/`UPSTASH_REDIS_REST_URL`, `QDRANT_URL`, `OLLAMA_URL`/`OLLAMA_BASE_URL`, optional Docker flags.
- Mirror this shape for other modules (e.g., `/api/system/vector`, `/api/system/ai`), consume via `initializePhase13()` or health endpoint.

## 🔄 Phase 74: Core Route Gate & Fix Waves

### Operating Loop
1. **Inventory**: Run `node scripts/routes-inventory.mjs` to map Core vs Dev routes.
2. **Check**: Run `scripts/advanced-check.ps1` to get a fresh error baseline.
3. **Prioritize**:
   - **Wave 1**: Fix all errors in `Core Routes` (must be 0 errors).
   - **Wave 2**: Fix `Import` and `Type` errors globally.
   - **Wave 3**: Fix `Event Handler` deprecations (on:click -> onclick).
4. **Verify**: Re-run `scripts/advanced-check.ps1` after each wave.

### Fix Rules
- **Never** delete a file unless explicitly instructed.
- **If a fix is complex**, wrap it in `// @ts-ignore` with a TODO comment: `// TODO: Phase 75 fix`.
- **Core Routes** take precedence over everything else.

