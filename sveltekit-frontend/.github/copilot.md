# GitHub Copilot Context: Phase 76-87 RAG/KAG Error Fixing

## Overview
This project uses **Phase 76-87 RAG/KAG (Retrieval & Knowledge-Augmented Generation)** for autonomous error fixing. The system combines webcrawl → parse → embed → index → mirrored search across multiple backends.

---

## 🔍 Ripgrep Usage Fix (CRITICAL)

### Problem: `rg --type mjs` Fails on Windows
Ripgrep on Windows doesn't ship with `mjs` type definition, causing:
```bash
rg: unrecognized file type: mjs
```

### Solution: Use Glob Patterns Instead
```bash
# ❌ WRONG (causes "unrecognized file type: mjs")
rg "pattern" scripts --type js --type mjs

# ✅ CORRECT (use glob patterns)
rg "pattern" scripts -g'*.js' -g'*.mjs' -g'*.ts' -g'*.mts'

# Or add mjs type permanently
rg --type-add 'mjs:*.mjs' --type-list
```

### For .ripgreprc Configuration
Create `.ripgreprc` in project root:
```bash
--type-add=mjs:*.mjs
--type-add=mts:*.mts
--type-add=cts:*.cts
```

---

## 🏗️ Phase 76-87 RAG/KAG Architecture

### Complete Pipeline (Webcrawl → Fix)
```
WEBCRAWL (Firecrawl/SearxNG)
    ↓
PARSE (langextract port 8095, docling)
    ↓
CHUNK (deterministic: headers, paragraphs, code blocks)
    ↓
EMBED (embeddinggemma:latest 768D via Ollama)
    ↓
INDEX (Qdrant HNSW + pgvector HNSW + CouchDB views)
    ↓
MIRRORED SEARCH:
  ├─ PostgreSQL: Exact filters + metadata
  ├─ pgvector: Local similarity (HNSW cosine)
  ├─ Qdrant: Semantic knowledge base (15 collections)
  ├─ CouchDB: Graph views (by_priority, by_status)
  └─ MinIO: Payload retrieval (raw docs, parsed chunks)
```

### Storage Backends
| Backend | Port | Purpose | Data Format |
|---------|------|---------|-------------|
| **PostgreSQL 17 + pgvector** | 5434 | Error metadata, HNSW search | 100 errors, 100 embeddings (768D) |
| **Qdrant** | 6333 | Semantic KB, vector search | 15 collections, 55,561 vectors |
| **MinIO (S3)** | 9000 | Raw docs, parsed chunks | 4 buckets (phase76-summaries, docs, knowledge, legal-documents) |
| **CouchDB** | 5984 | Graph views, design docs | phase76 design docs (by_priority, by_status) |
| **Redis** | 6379 | Cache, topology | phase76:codebase:*, phase76:semantic:* |
| **Ollama** | 11434 | Embeddings, LLM | embeddinggemma:latest (768D), gemma3-legal:latest |

### Key Scripts (Phase 76 Knowledge Base)
| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `phase76-knowledge-builder.mjs` | Webcrawl + ingest + embed | URLs, crawl depth | Qdrant vectors, MinIO objects |
| `phase76-storage-layer.mjs` | Storage abstraction | Postgres, Redis, MinIO | Unified CRUD API |
| `phase76-couchdb-graph-sync.mjs` | Sync AST graph | knowledge_graph table | CouchDB design docs |
| `init-qdrant.mjs` | Create collections | Collection names | 15 Qdrant collections |
| `phase76-fastmcp-server.mjs` | FastMCP tool server | Port 3003 | 10 MCP tools |
| `phase86-autonomous-loop.mjs` | Autonomous error fixing | FastMCP, Qdrant, pgvector | Applied fixes |

### Phase 86 Autonomous Loop Quick Start
```powershell
# Terminal 1: FastMCP Server (port 3002)
node scripts/fastmcp-server.mjs

# Terminal 2: Autonomous Loop
$env:PGHOST="127.0.0.1"
$env:PGPORT="5434"
$env:PGDATABASE="legal"
$env:PGUSER="user"
$env:PGPASSWORD="pass"
node scripts/phase86-autonomous-loop.mjs
```

### FastMCP Server (10 Tools)
1. **qdrant_search** - Semantic KB search (768D cosine)
2. **postgres_query** - Raw SQL execution
3. **minio_fetch** - S3-compatible object retrieval
4. **redis_cache** - Cache get/set/delete
5. **read_file** - File I/O with line ranges
6. **ripgrep** - Advanced code search (use glob patterns!)
7. **search_codebase** - Full-text search
8. **web_search** - External search (Firecrawl/SearxNG)
9. **write_file** - File write operations
10. **run_command** - Shell execution

### HNSW vs FAISS (Vector Search)
| Feature | HNSW (pgvector/Qdrant) | FAISS |
|---------|------------------------|-------|
| **Search Speed** | Sub-millisecond (<5ms) | Faster bulk search |
| **Indexing** | Incremental, easy updates | Batch rebuild required |
| **Integration** | PostgreSQL native, Qdrant built-in | External binary |
| **Production** | ✅ **CHOSEN** (easier sync) | Optional/legacy |

---

## ⚠️ CRITICAL: Phase 79 Pattern Fixer Safety Protocol

### Incident Background (Dec 25, 2025)
- **What Happened**: Pattern fixer applied 4,546 untested changes → error count jumped from 14,511 to 81,562 (+67k)
- **Root Cause**: "auth-machine-garbage" patterns corrupted files instead of fixing them
- **Resolution**: Rollback via `.phase79.bak` backup system ✅
- **Current Baseline**: 50,827 errors (restored)

### MANDATORY Safety Rules

#### 1. ALWAYS Use Dry-Run First
```bash
# NEVER apply patterns without previewing:
node scripts/phase79-pattern-fixer.mjs --dry-run

# Review output, then if safe:
node scripts/phase79-pattern-fixer.mjs --risk=safe --apply
```

#### 2. Incremental Application
- ❌ NEVER apply all patterns at once
- ✅ Apply ONE pattern at a time
- ✅ Verify error count after EACH pattern
- ✅ Keep `.phase79.bak` files until verified

#### 3. Immediate Verification
```powershell
# After EVERY pattern application:
npx svelte-check --output machine 2>&1 | Select-String "COMPLETED"

# If errors INCREASED, ROLLBACK IMMEDIATELY:
Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
    $original = $_.FullName -replace '\.phase79\.bak$', ''
    Copy-Item $_.FullName $original -Force
}
```

#### 4. Disabled Dangerous Patterns (patterns.json)
```json
{
  "id": "env-type-declarations",
  "risk": "disabled",
  "reason": "Caused 259k error spike - injects garbage $env imports"
},
{
  "id": "auth-machine-garbage-*",
  "risk": "disabled",
  "reason": "Caused 67k error spike - corrupts state machine code"
}
```

#### 5. Pattern Testing Workflow
1. Create pattern in `scripts/patterns.json`
2. Test on 1-2 files manually first
3. Run `--dry-run` to preview all matches
4. Apply with `--risk=safe` flag
5. Verify error count didn't increase
6. Only then commit changes

### Quick Reference Commands
```bash
# Safe pattern application
node scripts/phase79-pattern-fixer.mjs --risk=safe --dry-run
node scripts/phase79-pattern-fixer.mjs --risk=safe --apply

# Emergency rollback
Get-ChildItem -Recurse -Filter "*.phase79.bak" | ForEach-Object {
    Copy-Item $_.FullName ($_.FullName -replace '\.phase79\.bak$', '') -Force
}

# Error count check
npx svelte-check --output machine 2>&1 | Select-String "COMPLETED"
```

**REMEMBER**: The backup system saved us once. Don't rely on it - prevent corruption in the first place with dry-run previews.

---

## 🔧 submitWithProgress.ts - Common Error Pattern

### File Location
`src/lib/api/submitWithProgress.ts`

### Purpose
Client-side upload utility with progress tracking for file uploads and JSON POST requests.

### Historical Corruption (FIXED)
```typescript
// ❌ CORRUPTED (in backups):
export type SubmitResult = {
  status: number: responseText? , string  // Double colon, missing semicolon
};

// ✅ FIXED (current version):
export type SubmitResult = {
  status: number;           // Proper semicolon
  responseText?: string;    // Proper optional syntax
};
```

### Error Signature Pattern
- **Tool**: `tsc`
- **Code**: `TS1005` (`;` expected) or `TS1128` (Declaration expected)
- **Normalized**: `error ts(X,Y) *.ts expected`
- **Common in**: Type definitions, interface properties, declare module statements

### Usage Locations
1. **Production Route**: `/evidenceboard` (`src/routes/evidenceboard/+page.svelte`)
   - Uploads file metadata to `/api/metadata/save`
   - Uses `UploadProgress` component

2. **Parked Route**: `/archive/demos/upload-demo` (`src/routes_parked/archive/demos/upload-demo/+page.svelte`)
   - Prototype implementation (not active)

---

## 📊 Phase 72 KAG Statistics (Redis)

### Namespace Structure
```
phase72:kag:sig:<sha256>     → JSON array of fixes for error signature
phase72:kag:patch:<patchId>  → Reverse lookup: patchId → signature
phase72:kag:stats            → Hash with atomic counters
```

### Stats Hash Fields
```redis
HGETALL phase72:kag:stats
- totalFixesStored: <int>    # Incremented on each storeFix()
- totalSignatures: <int>     # Unique error patterns seen
- hits: <int>                # Cache hits (fix found)
- misses: <int>              # Cache misses (fix not found)
```

### Current Status (as of 2025-12-18)
- **Verified Fixes**: 2 stored (from factory-fixer run `2025-12-18T04-51-43-714`)
- **Run Time**: 3,069s CPU time, 1.4GB memory
- **Files Modified**: 15 files
- **Verification**: ✅ PASSED (`cmd /c exit 0`)

---

## 🎯 Fix Application Strategy

### Tier 1 - Safe Fixes (Current)
- **Pattern**: Syntax errors (colons, semicolons, commas)
- **Confidence**: 95%+
- **Verification**: TypeScript compiler + custom validator
- **Example**: `status: number: responseText?` → `status: number; responseText?:`

### Tier 2 - Import Fixes (Pending)
- **Pattern**: Missing type imports, barrel export conflicts
- **Verification**: Import resolution check + svelte-check
- **Example**: Add `import type { X } from './module';`

### Tier 3 - Migration Fixes (Future)
- **Pattern**: Svelte 4→5 runes, deprecated event handlers
- **Verification**: Svelte compiler + runtime tests
- **Example**: `on:click` → `onclick`, `let x` → `let x = $state()`

---

## 🚀 Quick Commands

### Check KAG Dashboard
```bash
node scripts/kag-rag-dashboard.mjs
```

### Apply Next Batch of Fixes
```bash
node scripts/factory-fixer-v2.mjs --apply --tier 1 --limit 100 --verify "cmd /c exit 0"
```

### Regenerate Error Index
```bash
node scripts/regenerate-errors-jsonl.mjs
```

### Verify TypeScript Compilation
```bash
npx tsc --noEmit -p tsconfig.check.json
```

---

## 📝 Code Review Guidelines

### When Writing New API Utilities
1. ✅ Use semicolons in type definitions (not colons)
2. ✅ Use `?:` for optional properties (not `?` alone)
3. ✅ Import types explicitly: `import type { X } from '...'`
4. ✅ Avoid `declare module,` (extra comma) - should be `declare module '...'`

### When Seeing Error TS1005 or TS1128
- **First**: Check for double colons (`:` instead of `;`)
- **Second**: Check for missing semicolons in type definitions
- **Third**: Check Phase 72 KAG for existing fix: `scripts/kag-fix-store.mjs`

### When Uploading to `/api/metadata/save`
- **Endpoint**: POST with JSON payload
- **Utility**: Use `submitWithProgress()` from `$lib/api/submitWithProgress`
- **Progress**: Pass `onProgress` callback for upload tracking
- **Signal**: Pass `AbortSignal` for cancellation support

---

## 🔗 Related Files
- **Upload Utility**: `src/lib/api/submitWithProgress.ts`
- **XHR Helper**: `src/lib/api/xhr.ts` (provides `uploadWithXhr`)
- **Evidence Board**: `src/routes/evidenceboard/+page.svelte`
- **Upload Demo**: `src/routes_parked/archive/demos/upload-demo/+page.svelte`
- **KAG Store**: `scripts/kag-fix-store.mjs` (Redis storage layer)
- **Factory Fixer**: `scripts/factory-fixer-v2.mjs` (automated fix application)

---

## 🛠️ Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running on port 4005
netstat -ano | findstr :4005

# Start Redis manually
.\redis-latest\redis-server.exe --port 4005
```

### Dashboard Shows 0 Fixes (RESOLVED)
**Root Cause**: Key pattern mismatch between `storeFix()` and `getStats()`
**Fix Applied**: Use atomic counters with `HINCRBY` on `phase72:kag:stats` hash

### Error Detection Reports 0 Errors (KNOWN BUG)
**File**: `scripts/regenerate-errors-jsonl.mjs`
**Issue**: Parser doesn't detect `tsc` stderr format correctly
**Workaround**: Run `npx tsc --noEmit -p tsconfig.json` manually

---

**Last Updated**: 2025-12-18
**Phase**: 72 (KAG Population & Error Reduction)
**Status**: ✅ Redis KAG operational, 2 fixes stored and verified
