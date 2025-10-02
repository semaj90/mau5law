- remmeber to check what I type vs what needs to be edited before changing the files

client side is websam, gemma:270m simd parser for cpu

gpu rtx, tensor cores, cuda service worker is gemma3:legal-latest with gemma embeds

svelte 5, sveltekit 2, best practices can use mcp context7-library-docs, postgresql 17, pg vector,
drizzle-orm, run migrations, keep everything matching.

redis password = redis

The script: false configuration was the primary cause of "Unexpected token" errors in
<script lang="ts"> blocks because the Svelte compiler was treating TypeScript syntax as plain
JavaScript.

This comprehensive fix should dramatically reduce the TypeScript error count from the previous
36,000+ errors.

## Production Readiness Status (Updated 2025-10-02)

### Application Status: ✅ RUNNING
- **SvelteKit Version**: 2.43.5 (latest stable)
- **Svelte Version**: 5.x with runes ($state, $derived, $effect)
- **Build Status**: ✅ All critical syntax errors resolved
- **Homepage**: ✅ Loading with comprehensive dashboard
- **Route Discovery**: ✅ Dynamic route system implemented

### API Endpoints Audit
- **Total Endpoints**: 787
- **Production Ready**: 621 (78.9%)
- **Needs Work**: 166 (21.1%)

#### Critical Issues (Fix Before Production):
1. `/api/agent/tasks/+server.ts` - Mock RAG task system (needs real integration)
2. `/api/ai/chat-mock/+server.ts` - Development mock endpoint (restrict to dev env)
3. `/api/ai/document-drafting/history/+server.ts` - Mock history data (needs DB)
4. `/api/ai/ask/+server.ts` - Mock fallback results (needs proper error handling)

#### High Priority Issues:
- AI embedding endpoint has mock model option
- CUDA indexing missing metrics tracking (TODO comments)
- Document processing has stub implementations
- Legal research endpoints need verification

**Full Audit Report**: See `API-PRODUCTION-READINESS-REPORT.md`

### Recent Fixes Applied:
- ✅ Fixed 10+ syntax errors across API routes (commas, semicolons, parens)
- ✅ Migrated Navigation component from Svelte 4 to Svelte 5
- ✅ Fixed SSR safety issues (removed import.meta.glob)
- ✅ Auth system with graceful fallbacks
- ✅ Database connections with error recovery
- ✅ Created dynamic route discovery system

### Technology Stack Confirmed:
- **Frontend**: Svelte 5 + SvelteKit 2 + bits-ui + Melt UI v0.39.0
- **Database**: PostgreSQL 17 + pgvector + Drizzle ORM
- **Cache**: Redis (password: redis)
- **Auth**: Lucia v3 with session management
- **AI Models**:
  - CPU: WebAssembly + gemma:270m + SIMD parser
  - GPU: RTX 3060 Ti + CUDA + gemma3:legal-latest + Gemma embeddings
- **Styling**: TailwindCSS + CSS custom properties
